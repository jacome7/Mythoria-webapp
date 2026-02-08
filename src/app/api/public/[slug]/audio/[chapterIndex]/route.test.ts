jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const limitMock = jest.fn();
const whereMock = jest.fn(() => ({ limit: limitMock }));
const fromMock = jest.fn(() => ({ where: whereMock }));
const selectMock = jest.fn(() => ({ from: fromMock }));

jest.mock('@/db', () => ({
  db: {
    select: () => selectMock(),
  },
}));

jest.mock('@/db/schema', () => ({
  stories: {
    storyId: 'storyId',
    audiobookUri: 'audiobookUri',
    isPublic: 'isPublic',
    status: 'status',
    slug: 'slug',
  },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn(() => ({})),
  eq: jest.fn(() => ({})),
}));

import type { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/public/[slug]/audio/[chapterIndex]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 for missing stories and 403 for non-public/non-published stories', async () => {
    limitMock.mockResolvedValueOnce([]);

    const notFoundResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ slug: 'quest', chapterIndex: '0' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(notFoundResponse.status).toBe(404);

    limitMock.mockResolvedValueOnce([
      { storyId: 'story-1', audiobookUri: {}, isPublic: false, status: 'draft' },
    ]);

    const forbiddenResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ slug: 'quest', chapterIndex: '0' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(forbiddenResponse.status).toBe(403);
    await expect(forbiddenResponse.json()).resolves.toEqual({
      error: 'Story is not publicly available',
    });
  });

  it('validates chapter index and returns fallback error for missing chapter audio', async () => {
    const invalidChapterResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ slug: 'quest', chapterIndex: '-4' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(invalidChapterResponse.status).toBe(400);
    await expect(invalidChapterResponse.json()).resolves.toEqual({ error: 'Invalid chapter index' });

    limitMock.mockResolvedValueOnce([
      {
        storyId: 'story-1',
        isPublic: true,
        status: 'published',
        audiobookUri: { chapter_1: 'https://cdn.example.com/chapter-1.mp3' },
      },
    ]);

    const missingAudioResponse = (await GET({} as NextRequest, {
      params: Promise.resolve({ slug: 'quest', chapterIndex: '8' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(missingAudioResponse.status).toBe(404);
    await expect(missingAudioResponse.json()).resolves.toEqual({ error: 'Chapter audio not found' });
  });
});
