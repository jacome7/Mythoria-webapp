/** @jest-environment node */

const transactionMock = jest.fn();
const calculateCreditsMock = jest.fn();

jest.mock('@/db', () => ({
  db: { transaction: (...args: unknown[]) => transactionMock(...args) },
}));

jest.mock('@/db/services/pricing', () => ({
  pricingService: {
    calculateCreditsForFeatures: (...args: unknown[]) => calculateCreditsMock(...args),
  },
}));

import { startStoryGeneration } from './story-generation';

function createTransaction(selectResults: unknown[][]) {
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => {
      const result = selectResults.shift() ?? [];
      return {
        from: jest.fn(() => ({ where: jest.fn().mockResolvedValue(result) })),
      };
    }),
    insert: jest.fn(() => ({ values: insertValues })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({ where: updateWhere })),
    })),
  };
  transactionMock.mockImplementation(async (callback) => callback(tx));
  return { tx, insertValues, updateWhere };
}

const input = {
  authorId: 'author-1',
  clerkUserId: 'clerk-1',
  storyId: 'story-1',
  idempotencyKey: 'request-1',
  features: { ebook: true, printed: false, audiobook: false },
  analyticsContext: {
    clientId: '123.456',
    sessionId: 123,
    consent: {
      analyticsStorage: 'granted' as const,
      adUserData: 'denied' as const,
      adPersonalization: 'denied' as const,
    },
  },
};

describe('startStoryGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calculateCreditsMock.mockResolvedValue({
      total: 3,
      breakdown: [{ serviceCode: 'eBookGeneration', credits: 3 }],
    });
  });

  it('debits and enqueues in one locked transaction', async () => {
    const { tx, insertValues } = createTransaction([
      [],
      [],
      [{ storyId: 'story-1' }],
      [{ totalCredits: 10 }],
    ]);

    const result = await startStoryGeneration(input);

    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      storyId: 'story-1',
      status: 'queued',
      remainingCredits: 7,
      duplicate: false,
    });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -3,
        idempotencyKey: expect.stringContaining('story_generation:'),
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'request-1', creditsSpent: 3 }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'story_generation_requested' }),
    );
  });

  it('returns the stable run without another debit for a duplicate request', async () => {
    const { tx } = createTransaction([
      [{ authorId: 'author-1', storyId: 'story-1', runId: 'run-existing', status: 'published' }],
      [{ totalCredits: 7 }],
    ]);

    await expect(startStoryGeneration(input)).resolves.toMatchObject({
      runId: 'run-existing',
      remainingCredits: 7,
      duplicate: true,
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects insufficient balance before any debit or enqueue', async () => {
    const { tx } = createTransaction([[], [], [{ storyId: 'story-1' }], [{ totalCredits: 2 }]]);

    await expect(startStoryGeneration(input)).rejects.toThrow('Insufficient credits');
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });
});
