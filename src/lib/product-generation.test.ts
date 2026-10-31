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
  SurveyRewardFundingError,
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
          item_id: expect.stringMatching(/^[a-f0-9]{12}$/),
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
          where: jest.fn(() => ({
            for: () =>
              Promise.resolve([{ runId: 'run-1', status: 'failed', compensatedAt: new Date() }]),
          })),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(
      compensateProductGeneration('run-1', 'queue', 'pubsub_publish_failed'),
    ).resolves.toBe(false);
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('leaves a request that a concurrent launcher already queued untouched', async () => {
    const tx = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            for: () => Promise.resolve([{ runId: 'run-1', status: 'queued', compensatedAt: null }]),
          })),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(
      compensateProductGeneration('run-1', 'queue', 'pubsub_publish_failed'),
    ).resolves.toBe(false);
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
        item_id: expect.stringMatching(/^[a-f0-9]{12}$/),
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

describe('survey reward funded product generation', () => {
  beforeEach(() => jest.clearAllMocks());

  const rewardInput = {
    actionType: 'audiobook_generation' as const,
    authorId: 'author-1',
    userId: 'clerk-1',
    storyId: 'story-1',
    idempotencyKey: 'survey_reward:ent-1',
    creditsSpent: 0,
    creditEventType: 'audioBookGeneration' as const,
    funding: { type: 'survey_reward' as const, entitlementId: 'ent-1' },
  };

  const entitlement = (overrides: Record<string, unknown> = {}) => ({
    entitlementId: 'ent-1',
    authorId: 'author-1',
    rewardType: 'audiobook',
    storyId: 'story-1',
    status: 'selected',
    attempts: 0,
    productRunId: null,
    expiresAt: null,
    ...overrides,
  });

  /** Each `where()` resolves to the next queued row set; `.for('update')` resolves to the same. */
  function makeTx(selectRows: unknown[][]) {
    const insertValues = jest.fn((values: Record<string, unknown>) => ({
      returning: jest.fn().mockResolvedValue([{ runId: 'run-1', status: 'pending', ...values }]),
    }));
    const updateSet = jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) }));
    const tx = {
      execute: jest.fn().mockResolvedValue(undefined),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => {
            const rows = selectRows.shift() || [];
            return Object.assign(Promise.resolve(rows), { for: () => Promise.resolve(rows) });
          }),
        })),
      })),
      insert: jest.fn(() => ({ values: insertValues })),
      update: jest.fn(() => ({ set: updateSet })),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));
    return { tx, insertValues, updateSet };
  }

  it('creates a zero-credit request and marks the entitlement processing without ledger writes', async () => {
    const { tx, insertValues, updateSet } = makeTx([
      [entitlement()],
      [],
      [],
      [{ totalCredits: 3 }],
    ]);

    await expect(startProductGeneration(rewardInput)).resolves.toMatchObject({
      request: { runId: expect.any(String) },
      remainingCredits: 3,
      duplicate: false,
    });

    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        creditsSpent: 0,
        fundingSource: 'survey_reward',
        rewardEntitlementId: 'ent-1',
        idempotencyKey: 'survey_reward:ent-1:1',
      }),
    );
    expect(insertValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ amount: expect.anything() }),
    );
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        attempts: 1,
        productRunId: expect.any(String),
        redeemedAt: expect.any(Date),
      }),
    );
  });

  it('uses the next attempt number for the idempotency key on a retry after failure', async () => {
    const { insertValues } = makeTx([
      [entitlement({ status: 'failed', attempts: 1 })],
      [],
      [],
      [{ totalCredits: 0 }],
    ]);
    await startProductGeneration(rewardInput);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'survey_reward:ent-1:2' }),
    );
  });

  it('returns the existing active run for a retried request while processing', async () => {
    const linked = {
      runId: 'run-live',
      status: 'queued',
      authorId: 'author-1',
      storyId: 'story-1',
      actionType: 'audiobook_generation',
    };
    const { tx } = makeTx([
      [entitlement({ status: 'processing', attempts: 1, productRunId: 'run-live' })],
      [linked],
      [{ totalCredits: 0 }],
    ]);

    await expect(startProductGeneration(rewardInput)).resolves.toMatchObject({
      request: { runId: 'run-live' },
      duplicate: true,
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each([
    ['another author', { authorId: 'author-2' }, 'entitlement_forbidden'],
    ['a delivered gift', { status: 'delivered' }, 'entitlement_status'],
    ['an unselected gift', { status: 'eligible' }, 'entitlement_status'],
    ['an expired gift', { expiresAt: new Date(Date.now() - 1000) }, 'entitlement_expired'],
    ['another story', { storyId: 'story-2' }, 'entitlement_mismatch'],
    ['another reward type', { rewardType: 'pdf' }, 'entitlement_mismatch'],
  ])('rejects %s', async (_label, overrides, code) => {
    const { tx } = makeTx([[entitlement(overrides)]]);
    await expect(startProductGeneration(rewardInput)).rejects.toMatchObject({ code });
    await expect(startProductGeneration(rewardInput)).rejects.toBeInstanceOf(
      SurveyRewardFundingError,
    );
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('rejects a missing entitlement and refuses to start beside an active request', async () => {
    makeTx([[]]);
    await expect(startProductGeneration(rewardInput)).rejects.toMatchObject({
      code: 'entitlement_not_found',
    });

    const { tx } = makeTx([[entitlement()], [], [{ runId: 'run-paid', status: 'queued' }]]);
    await expect(startProductGeneration(rewardInput)).rejects.toMatchObject({
      code: 'product_in_progress',
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('refuses a reward start that tries to spend credits', async () => {
    await expect(startProductGeneration({ ...rewardInput, creditsSpent: 5 })).rejects.toThrow(
      'cannot spend credits',
    );
  });

  it('compensates a reward-funded request by failing the entitlement, not by refunding', async () => {
    const request = {
      runId: 'run-1',
      status: 'pending',
      compensatedAt: null,
      authorId: 'author-1',
      storyId: 'story-1',
      actionType: 'audiobook_generation',
      creditsSpent: 0,
      fundingSource: 'survey_reward',
      rewardEntitlementId: 'ent-1',
      consent: null,
    };
    const { tx, updateSet } = makeTx([[request]]);

    await compensateProductGeneration('run-1', 'queue', 'pubsub_publish_failed');

    expect(tx.insert).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failedAt: expect.any(Date),
        lastError: 'queue:pubsub_publish_failed',
      }),
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', compensatedAt: expect.any(Date) }),
    );
  });
});
