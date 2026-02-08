jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

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

import { GET } from './route';

describe('GET /api/share/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUserMock.mockResolvedValue(null);
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
});
