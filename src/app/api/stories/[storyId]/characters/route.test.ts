/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService, storyCharacterService } from '@/db/services';

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/db/services', () => ({
  storyService: { getStoryById: jest.fn(), updateStory: jest.fn() },
  storyCharacterService: { addCharacterToStory: jest.fn() },
}));

describe('retry-safe character link response', () => {
  it('keeps the successful relation response on both first call and retry', async () => {
    jest
      .mocked(getCurrentAuthor)
      .mockResolvedValue({ authorId: 'author-1' } as NonNullable<
        Awaited<ReturnType<typeof getCurrentAuthor>>
      >);
    jest
      .mocked(storyService.getStoryById)
      .mockResolvedValue({ authorId: 'author-1', status: 'draft' } as NonNullable<
        Awaited<ReturnType<typeof storyService.getStoryById>>
      >);
    const relation = { storyId: 'story-1', characterId: 'character-1', role: 'mentor' as const };
    jest.mocked(storyCharacterService.addCharacterToStory).mockResolvedValue(relation);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await POST(
        new NextRequest('https://mythoria.pt/api/stories/story-1/characters', {
          method: 'POST',
          body: JSON.stringify({ characterId: 'character-1' }),
        }),
        { params: Promise.resolve({ storyId: 'story-1' }) },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, relation });
    }
  });
});
