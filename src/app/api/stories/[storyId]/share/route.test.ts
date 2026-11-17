/** @jest-environment node */
const mockAuth = jest.fn();
const mockGetAuthorByClerkId = jest.fn();
const mockSetPublicVisibility = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockResults: unknown[] = [];
const mockAdContext = {
  adConsent: 'denied',
  sourceUrl: 'https://mythoria.pt',
  capturedAt: '2026-11-16T00:00:00.000Z',
};

/** Chainable Drizzle stand-in: every builder call returns itself; awaiting yields the next result. */
function mockChain(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const result = mockResults.shift();
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

const mockDb = { select: () => mockChain(), insert: () => mockChain(), update: () => mockChain() };

jest.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }));
jest.mock('@/i18n/routing', () => ({
  routing: { defaultLocale: 'en-US' },
  isValidLocale: (locale: string) => locale === 'en-US',
}));
jest.mock('@/db', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/db/services', () => ({
  authorService: { getAuthorByClerkId: (...args: unknown[]) => mockGetAuthorByClerkId(...args) },
  storyService: { setPublicVisibility: (...args: unknown[]) => mockSetPublicVisibility(...args) },
  PublicStoryValidationError: class extends Error {},
}));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  cookiesFromHeaders: () => ({ get: () => undefined }),
  resolveAdContextSafely: jest.fn(async () => mockAdContext),
}));

import { analyticsReference } from '@/lib/analytics/reference';
import { POST } from './route';

const storyId = '11111111-1111-4111-8111-111111111111';
const shareLinkId = '22222222-2222-4222-8222-222222222222';
const request = (body: Record<string, unknown>) =>
  new Request(`https://mythoria.pt/api/stories/${storyId}/share`, {
    method: 'POST',
    headers: { 'x-locale': 'en-US' },
    body: JSON.stringify(body),
  });
const params = { params: Promise.resolve({ storyId }) };

describe('POST /api/stories/[storyId]/share (OpenAI Ads)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResults.length = 0;
    mockAuth.mockResolvedValue({ userId: 'clerk-1' });
    mockGetAuthorByClerkId.mockResolvedValue({ authorId: 'author-1' });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses one stable public id so repeated public toggles deduplicate', async () => {
    mockResults.push([{ storyId, authorId: 'author-1', isPublic: false }]);
    mockSetPublicVisibility.mockResolvedValue({ slug: 'my-story' });

    const response = await POST(request({ makePublic: true }), params);

    expect(await response.json()).toMatchObject({
      linkType: 'public',
      adEventId: `share_${storyId}_public`,
    });
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(mockDb, {
      conversion: expect.objectContaining({
        customEventName: 'story_shared',
        eventId: `share_${storyId}_public`,
        data: expect.objectContaining({
          contents: [expect.objectContaining({ id: 'story_share_public' })],
        }),
      }),
      authorId: 'author-1',
      adContext: mockAdContext,
    });
  });

  it('never sends the private share token, only its opaque reference', async () => {
    mockResults.push([{ storyId, authorId: 'author-1', isPublic: false }], [{ id: shareLinkId }]);

    const response = await POST(request({ allowEdit: true }), params);
    const json = await response.json();

    const expectedId = `share_${analyticsReference(shareLinkId)}`;
    expect(json).toMatchObject({ token: shareLinkId, adEventId: expectedId });
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        conversion: expect.objectContaining({ eventId: expectedId }),
      }),
    );
    expect(JSON.stringify(mockEnqueueAdConversion.mock.calls)).not.toContain(shareLinkId);
  });

  it('does not enqueue when a story is made private', async () => {
    mockResults.push([{ storyId, authorId: 'author-1', isPublic: true }], undefined);

    const response = await POST(request({ makePublic: false }), params);

    expect(await response.json()).toMatchObject({ linkType: 'private', url: '' });
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
