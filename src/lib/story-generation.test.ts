/** @jest-environment node */

const transactionMock = jest.fn();
const calculateCreditsMock = jest.fn();
const enqueueAdConversionMock = jest.fn();

jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => enqueueAdConversionMock(...args),
}));

jest.mock('@/db', () => ({
  db: { transaction: (...args: unknown[]) => transactionMock(...args) },
}));

jest.mock('@/db/services/pricing', () => ({
  pricingService: {
    getStoryProductProfile: jest.fn().mockResolvedValue('standard'),
    calculateCreditsForFeatures: (...args: unknown[]) => calculateCreditsMock(...args),
  },
}));

import { startStoryGeneration } from './story-generation';
import { draftPremiumBookMarker } from './premium-children-book/contract';

function createTransaction(selectResults: unknown[][]) {
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const updateSet = jest.fn(() => ({ where: updateWhere }));
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => {
      const result = selectResults.shift() ?? [];
      const query = {
        where: jest.fn(() =>
          Object.assign(Promise.resolve(result), {
            for: jest.fn().mockResolvedValue(result),
          }),
        ),
      };
      return { from: jest.fn(() => ({ ...query, innerJoin: jest.fn(() => query) })) };
    }),
    insert: jest.fn(() => ({ values: insertValues })),
    update: jest.fn(() => ({
      set: updateSet,
    })),
  };
  transactionMock.mockImplementation(async (callback) => callback(tx));
  return { tx, insertValues, updateWhere, updateSet };
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
    expect(calculateCreditsMock).not.toHaveBeenCalled();
  });

  it('rejects insufficient balance before any debit or enqueue', async () => {
    const { tx } = createTransaction([[], [], [{ storyId: 'story-1' }], [{ totalCredits: 2 }]]);

    await expect(startStoryGeneration(input)).rejects.toThrow('Insufficient credits');
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  describe('premium eligibility and transactional selection', () => {
    const saved = {
      storyId: input.storyId,
      status: 'draft',
      targetAudience: 'children_3-6',
      features: { premiumBook: draftPremiumBookMarker, futureFeature: { keep: true } },
    };

    beforeEach(() => {
      process.env.PREMIUM_BOOK_GENERATION_ENABLED = 'true';
      process.env.PREMIUM_BOOK_BUCKET = 'private-premium-test';
    });
    afterEach(() => {
      delete process.env.PREMIUM_BOOK_GENERATION_ENABLED;
      delete process.env.PREMIUM_BOOK_BUCKET;
    });

    it.each(['children_0-2', 'children_3-6'])(
      'freezes %s in the same request as the debit',
      async (audience) => {
        const { updateSet, insertValues } = createTransaction([
          [],
          [],
          [{ ...saved, targetAudience: audience }],
          [{ experimental: true }],
          [],
          [{ totalCredits: 10 }],
        ]);
        const result = await startStoryGeneration(input);
        expect(calculateCreditsMock).toHaveBeenCalledWith(input.features, 'standard');
        expect(updateSet).toHaveBeenCalledWith(
          expect.objectContaining({
            features: {
              ...input.features,
              futureFeature: { keep: true },
              premiumBook: {
                ...draftPremiumBookMarker,
                state: 'queued',
                revision: result.runId,
                ownerId: input.authorId,
                audience,
              },
            },
          }),
        );
        expect(insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ runId: result.runId, creditsSpent: 3 }),
        );
      },
    );

    it.each([
      [{ ...saved, targetAudience: 'children_7-10' }, true],
      [saved, false],
    ])(
      'rejects incompatible audience or opted-out author before debiting',
      async (story, experimental) => {
        const { tx } = createTransaction([[], [], [story], [{ experimental }]]);
        await expect(startStoryGeneration(input)).rejects.toThrow('book_type_not_available');
        expect(tx.insert).not.toHaveBeenCalled();
        expect(calculateCreditsMock).not.toHaveBeenCalled();
      },
    );

    it('rejects stale type and unrecognized saved metadata before debiting', async () => {
      const stale = createTransaction([[], [], [saved]]);
      await expect(
        startStoryGeneration({ ...input, expectedBookType: 'standard' }),
      ).rejects.toThrow('book_type_changed');
      expect(stale.tx.insert).not.toHaveBeenCalled();
      const invalid = createTransaction([
        [],
        [],
        [{ ...saved, features: { premiumBook: { version: 2 } } }],
      ]);
      await expect(startStoryGeneration(input)).rejects.toThrow('Invalid premium book marker');
      expect(invalid.tx.insert).not.toHaveBeenCalled();
    });
  });

  it('adds the validated campaign intent to the authoritative generation event', async () => {
    const { insertValues } = createTransaction([
      [],
      [],
      [{ storyId: 'story-1' }],
      [{ totalCredits: 10 }],
    ]);

    await startStoryGeneration({ ...input, primaryIntent: 'romance' });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'story_generation_requested',
        params: expect.objectContaining({ primary_intent: 'romance' }),
      }),
    );
  });

  it('creates a recoverable event when consent exists before the GA client id is available', async () => {
    const { insertValues } = createTransaction([
      [],
      [],
      [{ storyId: 'story-1' }],
      [{ totalCredits: 10 }],
    ]);

    await startStoryGeneration({
      ...input,
      analyticsContext: undefined,
      analyticsConsent: input.analyticsContext.consent,
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'story_generation_requested',
        authorId: 'author-1',
        clientId: undefined,
        consent: input.analyticsContext.consent,
      }),
    );
  });

  it('enqueues the lead_created conversion in the same transaction when an ad context is given', async () => {
    const { tx } = createTransaction([[], [], [{ storyId: 'story-1' }], [{ totalCredits: 10 }]]);
    const adContext = {
      adConsent: 'granted' as const,
      oppref: 'opp-1',
      sourceUrl: 'https://mythoria.pt/en-US/tell-your-story/step-5',
      capturedAt: '2026-11-16T10:00:00.000Z',
    };

    const result = await startStoryGeneration({ ...input, adContext });

    expect(enqueueAdConversionMock).toHaveBeenCalledWith(tx, {
      conversion: expect.objectContaining({
        eventType: 'lead_created',
        eventId: `story_${result.runId}`,
      }),
      authorId: 'author-1',
      adContext,
    });
  });

  it('does not enqueue a conversion without an ad context (MCP) or for a duplicate run', async () => {
    createTransaction([[], [], [{ storyId: 'story-1' }], [{ totalCredits: 10 }]]);
    await startStoryGeneration(input);
    createTransaction([
      [{ authorId: 'author-1', storyId: 'story-1', runId: 'run-existing', status: 'published' }],
      [{ totalCredits: 7 }],
    ]);
    await startStoryGeneration({ ...input, adContext: null });
    expect(enqueueAdConversionMock).not.toHaveBeenCalled();
  });
});
