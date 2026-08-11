/** @jest-environment node */

const transactionMock = jest.fn();

jest.mock('@/db', () => ({
  db: { transaction: (...args: unknown[]) => transactionMock(...args) },
}));

import {
  compensateProductGeneration,
  markProductGenerationQueued,
  printOrderRequestedOutboxEntry,
  startProductGeneration,
} from './product-generation';

const consent = {
  analyticsStorage: 'granted' as const,
  adUserData: 'denied' as const,
  adPersonalization: 'denied' as const,
};

const input = {
  actionType: 'audiobook_generation' as const,
  authorId: 'author-1',
  userId: 'clerk-1',
  storyId: 'story-1',
  idempotencyKey: 'request-1',
  creditsSpent: 5,
  creditEventType: 'audioBookGeneration' as const,
  analyticsConsent: consent,
};

describe('product generation requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the credit debit and durable request in one locked transaction', async () => {
    const selectRows = [[], [], [{ totalCredits: 10 }]];
    const insertedRequest = {
      runId: 'run-1',
      status: 'pending',
      ...input,
      consent,
      clientId: null,
      sessionId: null,
      attributionId: null,
      primaryIntent: null,
      landingSlug: null,
      pageLocation: null,
      pageReferrer: null,
      engagementTimeMsec: null,
    };
    const insertValues = jest.fn((values: Record<string, unknown>) => ({
      returning: jest.fn().mockResolvedValue('actionType' in values ? [insertedRequest] : []),
    }));
    const tx = {
      execute: jest.fn().mockResolvedValue(undefined),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(selectRows.shift() || []),
        })),
      })),
      insert: jest.fn(() => ({ values: insertValues })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
      })),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(startProductGeneration(input)).resolves.toMatchObject({
      request: { runId: 'run-1' },
      remainingCredits: 5,
      duplicate: false,
    });
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -5,
        creditEventType: 'audioBookGeneration',
        idempotencyKey: expect.stringMatching(/^product_generation:/),
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'audiobook_generation',
        idempotencyKey: 'request-1',
        creditsSpent: 5,
      }),
    );
  });

  it('returns an existing request without a second debit', async () => {
    const existing = {
      runId: 'run-existing',
      status: 'queued',
      authorId: 'author-1',
      storyId: 'story-1',
      actionType: 'audiobook_generation',
    };
    const selectRows = [[existing], [{ totalCredits: 5 }]];
    const tx = {
      execute: jest.fn().mockResolvedValue(undefined),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(selectRows.shift() || []),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(startProductGeneration(input)).resolves.toMatchObject({
      request: { runId: 'run-existing' },
      remainingCredits: 5,
      duplicate: true,
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('writes the requested outbox event only after the request becomes queued', async () => {
    const pending = {
      runId: 'run-1',
      actionType: 'audiobook_generation' as const,
      storyId: 'story-1',
      authorId: 'author-1',
      userId: 'clerk-1',
      creditsSpent: 5,
      consent,
      attributionId: null,
      clientId: '123.456',
      sessionId: 123,
      primaryIntent: 'romance',
      landingSlug: '/pt-PT/lp/romance',
      pageLocation: 'https://mythoria.pt/pt-PT/lp/romance',
      pageReferrer: null,
      engagementTimeMsec: 100,
      status: 'pending' as const,
    };
    const queued = { ...pending, status: 'queued' as const };
    const insertValues = jest.fn(() => ({
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    }));
    const tx = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({ where: jest.fn().mockResolvedValue([pending]) })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({ returning: jest.fn().mockResolvedValue([queued]) })),
        })),
      })),
      insert: jest.fn(() => ({ values: insertValues })),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(markProductGenerationQueued('run-1', 'message-1')).resolves.toMatchObject({
      status: 'queued',
    });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'audiobook_generation_requested:run-1',
        eventName: 'audiobook_generation_requested',
        params: expect.objectContaining({
          story_id: 'story-1',
          action_type: 'audiobook_generation',
          run_ref: expect.stringMatching(/^[a-f0-9]{12}$/),
        }),
      }),
    );
    expect(JSON.stringify(insertValues.mock.calls)).not.toContain('run_id');
  });

  it('does not refund an already compensated request twice', async () => {
    const tx = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest
            .fn()
            .mockResolvedValue([{ runId: 'run-1', status: 'failed', compensatedAt: new Date() }]),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await compensateProductGeneration('run-1', 'queue', 'pubsub_publish_failed');
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('builds one consented, PII-free print order requested event', () => {
    const entry = printOrderRequestedOutboxEntry({
      printRequestId: 'print-1',
      storyId: 'story-1',
      authorId: 'author-1',
      userId: 'clerk-1',
      creditsSpent: 12,
      numberOfCopies: 2,
      occurredAt: new Date('2026-08-11T10:00:00Z'),
      analyticsContext: {
        clientId: '123.456',
        sessionId: 123,
        consent,
      },
      primaryIntent: 'romance',
    });

    expect(entry).toMatchObject({
      dedupeKey: 'print_order_requested:print-1',
      eventName: 'print_order_requested',
      params: {
        story_id: 'story-1',
        action_type: 'print_order',
        print_request_ref: expect.stringMatching(/^[a-f0-9]{12}$/),
        credits_spent: 12,
        number_of_copies: 2,
        primary_intent: 'romance',
      },
    });
    expect(JSON.stringify(entry)).not.toContain('@');
  });
});
