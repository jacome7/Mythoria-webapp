import { ensureStoryIdAccess, AccessDeniedError } from './authorization';
import { storyService } from '@/db/services';

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: jest.fn(),
  },
}));

interface MockStory { storyId: string; authorId: string; title: string }

describe('ensureStoryIdAccess', () => {
  const mockStory: MockStory = { storyId: 's1', authorId: 'owner', title: 'Tale' };

  it('allows owner', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(mockStory);
    await expect(ensureStoryIdAccess('s1', 'owner')).resolves.toEqual(expect.objectContaining({ storyId: 's1' }));
  });

  it('denies non-owner', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(mockStory);
    await expect(ensureStoryIdAccess('s1', 'other')).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it('hides missing story as access denied', async () => {
    (storyService.getStoryById as jest.Mock).mockResolvedValue(undefined);
    await expect(ensureStoryIdAccess('missing', 'someone')).rejects.toBeInstanceOf(AccessDeniedError);
  });
});
