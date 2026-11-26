/** @jest-environment node */
import { POST } from './route';

const mockAuthor = jest.fn();
const mockStory = jest.fn();
const mockFetch = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockAuthor() }));
jest.mock('@/db/services', () => ({ storyService: { getStoryById: () => mockStory() } }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: (...args: unknown[]) => mockFetch(...args) }));

const storyId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const ownerId = '72c3cb83-00c2-4933-972b-916ec8065f18';
const edit = {
  expectedRevision: '22c3cb83-00c2-4933-972b-916ec8065f18',
  correctionId: '12c3cb83-00c2-4933-972b-916ec8065f18',
  pageNumber: 3,
  text: 'For the little adventurers.',
};

function published(revision = edit.expectedRevision) {
  return {
    authorId: ownerId,
    status: 'published',
    features: {
      premiumBook: {
        version: 1,
        type: 'premium_children',
        state: 'published',
        revision,
        manifest: {
          key: `${storyId}/premium/revisions/${revision}/manifest.json`,
          sha256: 'a'.repeat(64),
          bytes: 100,
          generation: '12',
        },
      },
    },
  };
}

function post(input: unknown = edit) {
  return POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(input) }), {
    params: Promise.resolve({ storyId }),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockAuthor.mockResolvedValue({ authorId: ownerId });
  mockStory.mockResolvedValue(published());
});

it('rejects unauthenticated and non-owner saves even if the book is public', async () => {
  mockAuthor.mockResolvedValueOnce(null);
  expect((await post()).status).toBe(401);
  mockStory.mockResolvedValueOnce({ ...published(), isPublic: true, authorId: 'other' });
  expect((await post()).status).toBe(404);
  expect(mockFetch).not.toHaveBeenCalled();
});

it('rejects client ownership overrides and stale edition pointers before calling the worker', async () => {
  expect((await post({ ...edit, ownerId })).status).toBe(400);
  mockStory.mockResolvedValueOnce(published(storyId));
  const response = await post();
  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({ error: 'edition_changed' });
  expect(mockFetch).not.toHaveBeenCalled();
});

it('uses the verified owner and forwards original and replayed edition requests', async () => {
  const saved = { revision: edit.correctionId };
  mockFetch.mockImplementation(async () => Response.json(saved));
  const response = await post();
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  await expect(response.json()).resolves.toEqual(saved);
  expect(mockFetch).toHaveBeenCalledWith(
    `/internal/premium/stories/${storyId}/text-edits`,
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ ...edit, ownerId }) }),
  );
  mockStory.mockResolvedValueOnce(published(edit.correctionId));
  expect((await post()).status).toBe(200);
});

it.each([
  [422, 'text_not_editable', 'text_not_editable', 422],
  [422, 'text_does_not_fit', 'text_does_not_fit', 422],
  [409, 'premium_publish_conflict', 'edition_changed', 409],
  [409, 'premium_asset_integrity', 'edit_failed', 503],
])('returns %s worker failure %s as %s', async (status, code, error, expectedStatus) => {
  mockFetch.mockResolvedValueOnce(Response.json({ code, error: 'worker detail' }, { status }));
  const response = await post();
  expect(response.status).toBe(expectedStatus);
  await expect(response.json()).resolves.toEqual({ error });
});
