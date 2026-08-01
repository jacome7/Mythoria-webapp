/** @jest-environment node */

const selectMock = jest.fn();
const updateMock = jest.fn();
const transactionMock = jest.fn();
const publishStoryRequestMock = jest.fn();
const validateEventMock = jest.fn();
const sendEventMock = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

jest.mock('@/lib/pubsub', () => ({
  publishStoryRequest: (...args: unknown[]) => publishStoryRequestMock(...args),
}));

jest.mock('./ga4', () => ({
  ga4Service: {
    validateEvent: (...args: unknown[]) => validateEventMock(...args),
    sendEvent: (...args: unknown[]) => sendEventMock(...args),
  },
}));

import { deliverAnalytics, publishGenerations } from './outbox';

function selectionFor(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  return {
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit,
        orderBy: jest.fn(() => ({ limit })),
      })),
    })),
  };
}

function mockPendingRows(rows: unknown[]) {
  selectMock.mockReturnValue(selectionFor(rows));
}

function mockUpdate(claimRows: unknown[] = []) {
  const set = jest.fn(() => ({
    where: jest.fn(() => ({ returning: jest.fn().mockResolvedValue(claimRows) })),
  }));
  updateMock.mockReturnValue({ set });
  return set;
}

function mockUpdateSequence(returningRows: unknown[][]) {
  const returning = jest.fn();
  for (const rows of returningRows) returning.mockResolvedValueOnce(rows);
  const set = jest.fn(() => ({
    where: jest.fn(() => ({ returning })),
  }));
  updateMock.mockReturnValue({ set });
  return set;
}

describe('durable outbox drains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates analytics before delivery and retries a rejected payload', async () => {
    const entry = {
      outboxId: 'outbox-1',
      dedupeKey: 'purchase:order-1',
      eventName: 'purchase',
      authorId: 'author-1',
      clientId: '123.456',
      userId: null,
      sessionId: 123,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
      params: { transaction_id: 'order-1', value: 10, currency: 'EUR', items: [] },
      occurredAt: new Date('2026-07-17T00:00:00Z'),
      attempts: 0,
    };
    mockPendingRows([entry]);
    const set = mockUpdate([entry]);
    validateEventMock.mockResolvedValue({ ok: false, errors: ['invalid value'] });

    await expect(deliverAnalytics()).resolves.toEqual({
      delivered: 0,
      failed: 1,
      skipped: 0,
      deferred: 0,
    });
    expect(validateEventMock).toHaveBeenCalledTimes(1);
    expect(sendEventMock).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 1, lastError: 'invalid value' }),
    );
  });

  it('does not deliver analytics when another worker owns the atomic claim', async () => {
    mockPendingRows([
      {
        outboxId: 'outbox-1',
        dedupeKey: 'purchase:order-1',
        eventName: 'purchase',
        occurredAt: new Date('2026-07-17T00:00:00Z'),
        attempts: 0,
      },
    ]);
    mockUpdate([]);

    await expect(deliverAnalytics()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 0,
      deferred: 0,
    });
    expect(validateEventMock).not.toHaveBeenCalled();
    expect(sendEventMock).not.toHaveBeenCalled();
  });

  it('enriches a consented event from the linked author attribution before delivery', async () => {
    const pending = {
      outboxId: 'outbox-1',
      dedupeKey: 'purchase:order-1',
      eventName: 'purchase',
      authorId: 'author-1',
      clientId: null,
      userId: 'clerk-1',
      sessionId: null,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
      params: { transaction_id: 'order-1', value: 5, currency: 'EUR', items: [] },
      occurredAt: new Date(),
      attempts: 0,
    };
    const enriched = {
      ...pending,
      clientId: '123.456',
      sessionId: 1712345678,
      params: { ...pending.params, primary_intent: 'romance' },
    };
    selectMock.mockReturnValueOnce(selectionFor([pending])).mockReturnValueOnce(
      selectionFor([
        {
          clientId: '123.456',
          sessionId: 1712345678,
          primaryIntent: 'romance',
        },
      ]),
    );
    mockUpdateSequence([[pending], [enriched]]);
    validateEventMock.mockResolvedValue({ ok: true, errors: [] });
    sendEventMock.mockResolvedValue({ ok: true, errors: [] });

    await expect(deliverAnalytics()).resolves.toEqual({
      delivered: 1,
      failed: 0,
      skipped: 0,
      deferred: 0,
    });
    expect(sendEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: '123.456',
        sessionId: 1712345678,
        params: expect.objectContaining({ primary_intent: 'romance' }),
      }),
    );
  });

  it('defers a recent consented event without consuming a GA delivery attempt', async () => {
    const pending = {
      outboxId: 'outbox-1',
      dedupeKey: 'story_generation_completed:run-1',
      eventName: 'story_generation_completed',
      authorId: 'author-1',
      clientId: null,
      userId: 'clerk-1',
      sessionId: null,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
      params: { story_id: 'story-1' },
      occurredAt: new Date(),
      attempts: 0,
    };
    selectMock.mockReturnValueOnce(selectionFor([pending])).mockReturnValueOnce(selectionFor([]));
    const set = mockUpdateSequence([[pending]]);

    await expect(deliverAnalytics()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 0,
      deferred: 1,
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        claimToken: null,
        claimedAt: null,
        lastError: 'Awaiting consented analytics attribution',
      }),
    );
    expect(set).not.toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }));
    expect(validateEventMock).not.toHaveBeenCalled();
  });

  it('publishes only the stable story and run contract', async () => {
    mockPendingRows([
      {
        runId: 'run-1',
        storyId: 'story-1',
        publishAttempts: 0,
        createdAt: new Date('2026-07-17T00:00:00Z'),
      },
    ]);
    mockUpdate([
      {
        runId: 'run-1',
        storyId: 'story-1',
        publishAttempts: 0,
        createdAt: new Date('2026-07-17T00:00:00Z'),
      },
    ]);
    publishStoryRequestMock.mockResolvedValue('message-1');

    await expect(publishGenerations()).resolves.toEqual({ published: 1, failed: 0 });
    expect(publishStoryRequestMock).toHaveBeenCalledWith({ storyId: 'story-1', runId: 'run-1' });
  });

  it('issues one idempotent compensation after permanent delivery failure', async () => {
    mockPendingRows([
      {
        runId: 'run-1',
        storyId: 'story-1',
        publishAttempts: 7,
        createdAt: new Date('2026-07-17T00:00:00Z'),
      },
    ]);
    mockUpdate([
      {
        runId: 'run-1',
        storyId: 'story-1',
        publishAttempts: 7,
        createdAt: new Date('2026-07-17T00:00:00Z'),
      },
    ]);
    publishStoryRequestMock.mockRejectedValue(new Error('Pub/Sub unavailable'));
    const returning = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'refund-1' }])
      .mockResolvedValueOnce([]);
    const insertValues = jest.fn(() => ({
      onConflictDoNothing: jest.fn(() => ({
        returning,
      })),
    }));
    const tx = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([
            {
              runId: 'run-1',
              authorId: 'author-1',
              storyId: 'story-1',
              creditsSpent: 3,
              compensatedAt: null,
            },
          ]),
        })),
      })),
      insert: jest.fn(() => ({ values: insertValues })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
      })),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    await expect(publishGenerations()).resolves.toEqual({ published: 0, failed: 1 });
    await expect(publishGenerations()).resolves.toEqual({ published: 0, failed: 1 });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3,
        creditEventType: 'refund',
        idempotencyKey: 'story_generation_refund:run-1',
      }),
    );
    expect(insertValues).toHaveBeenCalledTimes(2);
    expect(tx.update).toHaveBeenCalledTimes(5);
  });

  it('does not publish when another drain already owns the atomic claim', async () => {
    mockPendingRows([{ runId: 'run-1', storyId: 'story-1', publishAttempts: 0 }]);
    mockUpdate([]);

    await expect(publishGenerations()).resolves.toEqual({ published: 0, failed: 0 });
    expect(publishStoryRequestMock).not.toHaveBeenCalled();
  });
});
