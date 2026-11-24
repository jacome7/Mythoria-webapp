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
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: () => mockFetch() }));
const id = '32c3cb83-00c2-4933-972b-916ec8065f18';
const edit = {
  expectedRevision: '22c3cb83-00c2-4933-972b-916ec8065f18',
  correctionId: '12c3cb83-00c2-4933-972b-916ec8065f18',
  spreadId: 'spread-2',
  artworkInstructions: 'Paint a yellow hat',
  maximumCredits: 1,
};
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

it('publishes and charges a prepared edit once and replays a lost response', async () => {
  const ref = (revision: string) => ({
    key: `${id}/premium/revisions/${revision}/manifest.json`,
    sha256: 'a'.repeat(64),
    bytes: 100,
    generation: '12',
  });
  let features = {
    premiumBook: {
      version: 1,
      type: 'premium_children',
      state: 'published',
      revision: edit.expectedRevision,
      manifest: ref(edit.expectedRevision),
    },
  };
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
  expect((await post(edit)).status).toBe(200);
  expect((await post(edit)).status).toBe(200);
  expect(modified).toHaveBeenCalledTimes(1);
  expect(inserted).toHaveBeenCalledTimes(2);
  expect(inserted).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: -1,
      idempotencyKey: expect.stringContaining(edit.correctionId),
    }),
  );
});
