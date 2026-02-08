jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const ensureStoryIdAccessMock = jest.fn();

class MockAccessDeniedError extends Error {}

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/lib/authorization', () => ({
  ensureStoryIdAccess: (...args: unknown[]) => ensureStoryIdAccessMock(...args),
  AccessDeniedError: MockAccessDeniedError,
}));

import type { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/stories/[storyId]/audio/[chapterIndex]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces authentication and owner access controls', async () => {
    getCurrentAuthorMock.mockResolvedValue(null);

    const authResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ storyId: 'story-1', chapterIndex: '0' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(authResponse.status).toBe(401);

    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    ensureStoryIdAccessMock.mockRejectedValue(new MockAccessDeniedError('denied'));

    const deniedResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ storyId: 'story-1', chapterIndex: '0' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(deniedResponse.status).toBe(404);
    await expect(deniedResponse.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('validates chapter bounds and falls back when chapter audio is missing', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });

    const invalidChapterResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ storyId: 'story-1', chapterIndex: '-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(invalidChapterResponse.status).toBe(400);
    await expect(invalidChapterResponse.json()).resolves.toEqual({
      error: 'Invalid chapter index',
    });

    ensureStoryIdAccessMock.mockResolvedValue({
      storyId: 'story-1',
      audiobookUri: { chapter_1: 'https://cdn.example.com/chapter-1.mp3' },
    });

    const missingChapterResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ storyId: 'story-1', chapterIndex: '4' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(missingChapterResponse.status).toBe(404);
    await expect(missingChapterResponse.json()).resolves.toEqual({
      error: 'Chapter audio not found',
    });
  });
});
