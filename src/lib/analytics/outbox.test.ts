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

function mockPendingRows(rows: unknown[]) {
  selectMock.mockReturnValue({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({ limit: jest.fn().mockResolvedValue(rows) })),
      })),
    })),
  });
}

function mockUpdate() {
  const set = jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) }));
  updateMock.mockReturnValue({ set });
  return set;
}

describe('durable outbox drains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates analytics before delivery and retries a rejected payload', async () => {
    mockPendingRows([
      {
        outboxId: 'outbox-1',
        eventName: 'purchase',
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
      },
    ]);
    const set = mockUpdate();
    validateEventMock.mockResolvedValue({ ok: false, errors: ['invalid value'] });

    await expect(deliverAnalytics()).resolves.toEqual({ delivered: 0, failed: 1, skipped: 0 });
    expect(validateEventMock).toHaveBeenCalledTimes(1);
    expect(sendEventMock).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 1, lastError: 'invalid value' }),
    );
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
    mockUpdate();
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
    mockUpdate();
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
});
