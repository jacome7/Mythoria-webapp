/** @jest-environment node */
const transactionMock = jest.fn();
const conflictMock = jest.fn();
const activeReferralMock = jest.fn();
const characterReturningMock = jest.fn();
const characterSelectMock = jest.fn();
const characterConflictMock = jest.fn();
jest.mock('./index', () => ({
  db: {
    transaction: (...args: unknown[]) => transactionMock(...args),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: (options: unknown) => {
          characterConflictMock(options);
          return { returning: characterReturningMock };
        },
      }),
    }),
    select: () => ({ from: () => ({ where: characterSelectMock }) }),
  },
}));
jest.mock('./services/pricing', () => ({ pricingService: {} }));
jest.mock('./services/payment', () => ({ paymentService: {} }));
jest.mock('./services/fiscal-documents', () => ({ fiscalDocumentService: {} }));
jest.mock('./services/credit-packages', () => ({ creditPackagesService: {} }));
jest.mock('./services/blog', () => ({ blogService: {} }));
jest.mock('./services/faq', () => ({ faqService: {} }));
jest.mock('@/lib/referrals/policy', () => ({ referralFlags: () => ({ program: true }) }));
jest.mock('./services/referrals', () => ({
  referralLock: jest.fn(),
  getActiveReferral: (...args: unknown[]) => activeReferralMock(...args),
}));

import { storyService, storyCharacterService, StoryDraftOwnershipError } from './services';
import { stories, storyCharacters } from './schema';

describe('idempotent story draft creation', () => {
  let stored: Record<string, unknown> | undefined;
  const selectMock = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    stored = undefined;
    activeReferralMock.mockResolvedValue({
      owner: { status: 'active', referralOwnerId: 'owner-1' },
      assignment: { assignmentId: 'assignment-1' },
      code: { code: 'ORIGINAL' },
    });
    selectMock.mockImplementation(async () => (stored ? [stored] : []));
    transactionMock.mockImplementation(async (callback) =>
      callback({
        insert: () => ({
          values: (value: Record<string, unknown>) => {
            const returning = async () => {
              if (stored) return [];
              stored = value;
              return [stored];
            };
            return {
              returning,
              onConflictDoNothing: (options: unknown) => {
                conflictMock(options);
                return { returning };
              },
            };
          },
        }),
        select: () => ({ from: () => ({ where: selectMock }) }),
      }),
    );
  });

  it('reuses the same row and preserves its first referral snapshot and content', async () => {
    const input = {
      storyId: 'draft-1',
      authorId: 'author-1',
      title: 'Original',
      status: 'temporary' as const,
    };
    const first = await storyService.createStory(input);
    activeReferralMock.mockResolvedValue({
      owner: { status: 'active', referralOwnerId: 'owner-2' },
      assignment: { assignmentId: 'assignment-2' },
      code: { code: 'CHANGED' },
    });
    const retry = await storyService.createStory({ ...input, title: 'Do not overwrite' });
    expect(retry).toEqual(first);
    expect(retry).toMatchObject({
      title: 'Original',
      referralOwnerId: 'owner-1',
      referralCodeSnapshot: 'ORIGINAL',
    });
    expect(conflictMock).toHaveBeenCalledWith({ target: stories.storyId });
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('does not return a conflicting row not selected for this owner', async () => {
    stored = { storyId: 'draft-1', authorId: 'other' };
    selectMock.mockResolvedValue([]);
    await expect(
      storyService.createStory({ storyId: 'draft-1', authorId: 'author-1', title: 'New' }),
    ).rejects.toBeInstanceOf(StoryDraftOwnershipError);
  });

  it('keeps ordinary creation inserts unchanged when no draft identity is supplied', async () => {
    await storyService.createStory({ authorId: 'author-1', title: 'Normal' });
    expect(conflictMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
  });
});

describe('retrying a character association', () => {
  beforeEach(() => jest.clearAllMocks());
  it('returns the original relation on retry without replacing an edited role', async () => {
    const relation = { storyId: 'story-1', characterId: 'character-1', role: 'mentor' };
    characterReturningMock.mockResolvedValueOnce([relation]).mockResolvedValueOnce([]);
    characterSelectMock.mockResolvedValue([relation]);
    expect(
      await storyCharacterService.addCharacterToStory('story-1', 'character-1', 'mentor'),
    ).toEqual(relation);
    expect(
      await storyCharacterService.addCharacterToStory('story-1', 'character-1', 'protagonist'),
    ).toEqual(relation);
    expect(characterConflictMock).toHaveBeenCalledWith({
      target: [storyCharacters.storyId, storyCharacters.characterId],
    });
    expect(characterSelectMock).toHaveBeenCalledTimes(1);
  });
});
