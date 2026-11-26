/** @jest-environment node */
import { POST } from './route';
const mockGet = jest.fn(),
  mockFetch = jest.fn(),
  mockAuthor = jest.fn(),
  mockPermission = jest.fn();
const mockTx = jest.fn();
const mockCost = jest.fn();
jest.mock('@/db', () => ({ db: { transaction: (callback: unknown) => mockTx(callback) } }));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockAuthor() }));
jest.mock('@/db/services', () => ({
  storyService: { getStoryById: () => mockGet() },
  aiEditService: {
    checkEditPermission: () => mockPermission(),
    calculateRequiredCredits: () => mockCost(),
  },
}));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: (...args: unknown[]) => mockFetch(...args) }));
const id = '32c3cb83-00c2-4933-972b-916ec8065f18';
const edit = {
  expectedRevision: '22c3cb83-00c2-4933-972b-916ec8065f18',
  correctionId: '12c3cb83-00c2-4933-972b-916ec8065f18',
  spreadId: 'spread-2',
  artworkInstructions: 'Paint a yellow hat',
  maximumCredits: 1,
};
const ref = (revision: string) => ({
  key: `${id}/premium/revisions/${revision}/manifest.json`,
  sha256: 'a'.repeat(64),
  bytes: 100,
  generation: '12',
});
const publishedFeatures = () => ({
  premiumBook: {
    version: 1,
    type: 'premium_children',
    state: 'published',
    revision: edit.expectedRevision,
    manifest: ref(edit.expectedRevision),
  },
});
const post = (input: unknown) =>
  POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(input) }), {
    params: Promise.resolve({ storyId: id }),
  });
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthor.mockResolvedValue({ authorId: 'owner' });
});
it('rejects external artwork even for a signed-in user', async () => {
  expect((await post({ ...edit, imageUrl: 'https://example.org/art.png' })).status).toBe(400);
  expect(mockFetch).not.toHaveBeenCalled();
});
it('rejects edits to someone else’s story before image generation', async () => {
  mockGet.mockResolvedValue({ authorId: 'different', status: 'published' });
  expect((await post(edit)).status).toBe(404);
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([
  { code: 'edit_unavailable', reply: () => Promise.reject(new TypeError('fetch failed')) },
  {
    code: 'premium_stage_busy',
    reply: () =>
      Promise.resolve(
        Response.json({ code: 'premium_stage_busy', error: 'Internal detail' }, { status: 503 }),
      ),
  },
])('returns $code without charging or publishing', async ({ code, reply }) => {
  mockGet.mockResolvedValue({
    authorId: 'owner',
    status: 'published',
    features: publishedFeatures(),
  });
  mockPermission.mockResolvedValue({ canEdit: true, requiredCredits: 1 });
  mockFetch.mockImplementation(reply);

  const result = await post(edit);

  expect(result.status).toBe(503);
  await expect(result.json()).resolves.toEqual({ error: code });
  expect(mockTx).not.toHaveBeenCalled();
});

it('publishes and charges a prepared edit once and replays a lost response', async () => {
  let features = publishedFeatures();
  const modified = jest.fn();
  const inserted = jest.fn();
  const update = jest
    .fn()
    .mockImplementationOnce(() => ({
      set: () => ({ where: () => ({ returning: async () => [{ id: 'owner' }] }) }),
    }))
    .mockImplementation(() => ({
      set: (record: { features: typeof features }) => ({
        where: async () => {
          features = record.features;
          modified();
        },
      }),
    }));
  const tx = {
    execute: jest.fn(),
    select: () => ({ from: () => ({ where: () => ({ for: async () => [{ features }] }) }) }),
    update,
    insert: () => ({ values: inserted }),
  };
  mockTx.mockImplementation((fn) => fn(tx));
  mockGet.mockImplementation(async () => ({ authorId: 'owner', status: 'published', features }));
  mockPermission.mockResolvedValue({ canEdit: true, requiredCredits: 1 });
  mockFetch.mockImplementation(async () =>
    Response.json({ revision: edit.correctionId, manifest: ref(edit.correctionId) }),
  );
  mockCost.mockResolvedValue(1);
  const sideEdit = { ...edit, targetSide: 'right' };
  expect((await post(sideEdit)).status).toBe(200);
  expect((await post(sideEdit)).status).toBe(200);
  expect(mockFetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ body: expect.stringContaining('\"targetSide\":\"right\"') }),
  );
  expect(inserted).toHaveBeenCalledWith(
    expect.objectContaining({ metadata: expect.objectContaining({ targetSide: 'right' }) }),
  );
  expect(modified).toHaveBeenCalledTimes(1);
  expect(inserted).toHaveBeenCalledTimes(2);
  expect(inserted).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: -1,
      idempotencyKey: expect.stringContaining(edit.correctionId),
    }),
  );
});
