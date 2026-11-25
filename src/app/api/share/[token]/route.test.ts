/** @jest-environment node */
const authMock = jest.fn();
const currentUserMock = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
  auth: () => authMock(),
  currentUser: () => currentUserMock(),
}));

const limitMock = jest.fn();
const whereMock = jest.fn(() => ({ limit: limitMock }));
const leftJoinMock: jest.Mock = jest.fn();
leftJoinMock.mockImplementation(() => ({ leftJoin: leftJoinMock, where: whereMock }));
const fromMock = jest.fn(() => ({ leftJoin: leftJoinMock, where: whereMock }));
const selectMock = jest.fn(() => ({ from: fromMock }));

jest.mock('@/db', () => ({
  db: {
    select: () => selectMock(),
    insert: jest.fn(() => ({ values: jest.fn() })),
  },
}));

jest.mock('@/db/schema', () => ({
  stories: {
    storyId: 'storyId',
    title: 'title',
    synopsis: 'synopsis',
    audiobookUri: 'audiobookUri',
    targetAudience: 'targetAudience',
    graphicalStyle: 'graphicalStyle',
    coverUri: 'coverUri',
    createdAt: 'createdAt',
    authorId: 'authorId',
  },
  shareLinks: {
    id: 'id',
    storyId: 'storyId',
    accessLevel: 'accessLevel',
    expiresAt: 'expiresAt',
    revoked: 'revoked',
  },
  storyCollaborators: { storyId: 'storyId', userId: 'userId' },
  authors: { authorId: 'authorId', displayName: 'displayName', clerkUserId: 'clerkUserId' },
}));

jest.mock('drizzle-orm', () => ({ eq: jest.fn(() => ({})), and: jest.fn(() => ({})) }));
jest.mock('@/db/services', () => ({ authorService: { syncUserOnSignIn: jest.fn() } }));

const loadPremiumMock = jest.fn();
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => loadPremiumMock(...args),
}));

import { GET } from './route';
import premiumBook from '@/lib/premium-children-book/worker-manifest.fixture.json';

const viewToken = '00000000-0000-4000-8000-000000000001';

function premiumShareRequest(consent: 'granted' | 'denied', revoked: boolean) {
  limitMock.mockResolvedValueOnce([
    {
      storyId: premiumBook.storyId,
      storyStatus: 'published',
      features: { premiumBook: {} },
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      revoked,
      story: { authorId: premiumBook.ownerId },
    },
  ]);
  const value = encodeURIComponent(JSON.stringify({ state: { analytics_storage: consent } }));
  return GET(
    new Request(`https://mythoria.pt/api/share/${viewToken}?utm_campaign=story_share`, {
      headers: { cookie: `mythoria_consent=${value}` },
    }),
    { params: Promise.resolve({ token: viewToken }) },
  );
}

describe('GET /api/share/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUserMock.mockResolvedValue(null);
    loadPremiumMock.mockResolvedValue(premiumBook);
  });

  it('returns auth-required payload for edit links when user is anonymous', async () => {
    authMock.mockResolvedValue({ userId: null });
    limitMock.mockResolvedValueOnce([
      {
        storyId: 'story-1',
        accessLevel: 'edit',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revoked: false,
        story: { title: 'The Quest', synopsis: 'A brave quest' },
        author: { displayName: 'Ada' },
      },
    ]);

    const response = (await GET({ headers: { get: () => null } } as unknown as Request, {
      params: Promise.resolve({ token: 'token-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    const payload = (await response.json()) as {
      success: boolean;
      requiresAuth: boolean;
      accessLevel: string;
      storyPreview: { title: string; authorName: string };
    };

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      requiresAuth: true,
      accessLevel: 'edit',
      storyPreview: { title: 'The Quest', authorName: 'Ada' },
    });
  });

  it('sets the existing short-lived measurement cookie after opening a premium view link', async () => {
    authMock.mockResolvedValue({ userId: 'reader' });
    const response = await premiumShareRequest('granted', false);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, storyId: premiumBook.storyId });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.cookies.get('mythoria_reader_link')).toMatchObject({
      value: viewToken,
      path: '/api/analytics/qualified-share',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 120,
    });
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['reader', 'denied', false, 200],
    [null, 'granted', false, 401],
    ['reader', 'granted', true, 410],
  ] as const)(
    'omits the premium cookie for user %s with %s consent and revoked=%s',
    async (userId, consent, revoked, status) => {
      authMock.mockResolvedValue({ userId });
      const response = await premiumShareRequest(consent, revoked);
      expect(response.status).toBe(status);
      expect(response.cookies.get('mythoria_reader_link')).toBeUndefined();
    },
  );
});
