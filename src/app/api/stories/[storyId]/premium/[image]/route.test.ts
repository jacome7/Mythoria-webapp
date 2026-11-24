/** @jest-environment node */

const mockAuth = jest.fn();
const mockStory = jest.fn();
const mockAuthor = jest.fn();
const mockAccess = jest.fn();
const mockShare = jest.fn();
const mockLoadBook = jest.fn();
const mockDownloadImage = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }));
jest.mock('@/db', () => ({ db: { select: () => ({ from: () => ({ where: mockShare }) }) } }));
jest.mock('@/db/services', () => ({
  storyService: { getStoryById: (...args: unknown[]) => mockStory(...args) },
  authorService: { getAuthorByClerkId: (...args: unknown[]) => mockAuthor(...args) },
}));
jest.mock('@/lib/authorization', () => ({
  AccessDeniedError: class extends Error {},
  ensureStoryIdAccess: (...args: unknown[]) => mockAccess(...args),
}));
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => mockLoadBook(...args),
  downloadPremiumReadingImage: (...args: unknown[]) => mockDownloadImage(...args),
}));

import { GET } from './route';
import fixture from '@/lib/premium-children-book/worker-manifest.fixture.json';

const share = 'b55837cb-9e12-4cd6-9e6a-9ffacd3e7314';
const story = {
  status: 'published',
  authorId: fixture.ownerId,
  isPublic: false,
  features: { premiumBook: { state: 'published' } },
};
const read = (image: string, search = '') =>
  GET(new Request(`https://mythoria.example/api/premium/${image}${search}`), {
    params: Promise.resolve({ storyId: fixture.storyId, image }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: null });
  mockStory.mockResolvedValue(story);
  mockAuthor.mockResolvedValue(null);
  mockShare.mockResolvedValue([]);
  mockLoadBook.mockResolvedValue(fixture);
  mockDownloadImage.mockResolvedValue({ bytes: Buffer.from('fixture'), contentType: 'image/png' });
});

it('does not read private assets for anonymous or unrelated sessions', async () => {
  const anonymous = await read('5');
  expect(anonymous.status).toBe(404);
  mockAuth.mockResolvedValue({ userId: 'unrelated-user' });
  mockAuthor.mockResolvedValue(null);
  expect((await read('5')).status).toBe(404);
  expect(mockLoadBook).not.toHaveBeenCalled();
});

it('authorizes each generation-pinned owner or public read', async () => {
  mockAuth.mockResolvedValue({ userId: 'owner-user' });
  mockAuthor.mockResolvedValue({ authorId: fixture.ownerId });
  mockAccess.mockResolvedValue(story);
  expect((await read('5', `?revision=${fixture.revision}`)).status).toBe(200);
  expect(mockAccess).toHaveBeenCalledWith(fixture.storyId, fixture.ownerId);
  expect(mockDownloadImage).toHaveBeenCalledWith(fixture.storyId, fixture.pages[4].reading);

  mockAuth.mockResolvedValue({ userId: null });
  mockStory.mockResolvedValue({ ...story, isPublic: true });
  const published = await read('front');
  expect(published.status).toBe(200);
  expect(published.headers.get('Cache-Control')).toBe('private, no-store');
  expect((await read('front', '?revision=obsolete')).status).toBe(404);
  mockStory.mockResolvedValue(story);
  expect((await read('front')).status).toBe(404);
});

it('requires signed-in viewers and refuses the same image once the share expires or is revoked', async () => {
  const query = `?share=${share}&revision=${fixture.revision}`;
  mockShare.mockResolvedValue([{ accessLevel: 'view' }]);
  expect((await read('5', query)).status).toBe(404);
  mockAuth.mockResolvedValue({ userId: 'invited-user' });
  expect((await read('5', query)).status).toBe(200);
  expect((await read('motif', query)).status).toBe(404);
  mockLoadBook.mockResolvedValue({ ...fixture, motifArtwork: fixture.pages[4].reading });
  expect((await read('motif', query)).status).toBe(200);
  mockShare.mockResolvedValue([]);
  expect((await read('5', query)).status).toBe(404);
  expect((await read('motif', query)).status).toBe(404);
  expect(mockDownloadImage).toHaveBeenCalledTimes(2);
});
