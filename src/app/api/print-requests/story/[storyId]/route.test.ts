/** @jest-environment node */
import { GET } from './route';
const mockAuthor = jest.fn(),
  mockStory = jest.fn(),
  mockEdition = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockAuthor() }));
jest.mock('@/db/services', () => ({ storyService: { getStoryById: () => mockStory() } }));
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: () => mockEdition(),
}));
const storyId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const get = () => GET(new Request('http://localhost'), { params: Promise.resolve({ storyId }) });
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthor.mockResolvedValue({ authorId: 'buyer' });
});
it('gives an eligible public buyer only checkout metadata with a revision-pinned square cover', async () => {
  mockStory.mockResolvedValue({
    storyId,
    authorId: 'owner',
    status: 'published',
    isPublic: true,
    features: { premiumBook: {} },
  });
  mockEdition.mockResolvedValue({
    revision: 'edition',
    opening: { title: 'Title', synopsis: 'Summary' },
  });
  const response = await get();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.story).toMatchObject({
    synopsis: 'Summary',
    chapterCount: 0,
    frontCoverImageUrl: expect.stringContaining('revision=edition'),
  });
  expect(body.story.features).toBeUndefined();
});
it('rejects a private book before loading artwork for someone else', async () => {
  mockStory.mockResolvedValue({
    storyId,
    authorId: 'owner',
    status: 'published',
    isPublic: false,
    features: { premiumBook: {} },
  });
  expect((await get()).status).toBe(404);
  expect(mockEdition).not.toHaveBeenCalled();
});
