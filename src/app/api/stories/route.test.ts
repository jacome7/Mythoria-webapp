jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const createStoryMock = jest.fn();
const getCurrentAuthorMock = jest.fn().mockResolvedValue({ authorId: 'author-1' });
jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: (...args: unknown[]) => getCurrentAuthorMock(...args),
}));
jest.mock('@/lib/referrals/http', () => ({
  linkReferralFromRequest: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/db/services', () => ({
  storyService: {
    createStory: (...args: unknown[]) => createStoryMock(...args),
  },
}));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/stories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates required fields', async () => {
    const response = (await POST({
      json: async () => ({ title: '', authorId: '' }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Title is required' });
    expect(createStoryMock).not.toHaveBeenCalled();
  });

  it('defaults status to temporary unless explicitly allowed', async () => {
    createStoryMock.mockResolvedValue({ storyId: 'story-1', status: 'temporary' });

    const response = (await POST({
      json: async () => ({ title: 'Quest', authorId: 'forged-author', status: 'something-else' }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(201);
    expect(createStoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Quest', authorId: 'author-1', status: 'temporary' }),
    );

    createStoryMock.mockResolvedValue({ storyId: 'story-2', status: 'draft' });
    await POST({
      json: async () => ({ title: 'Quest 2', authorId: 'author-1', status: 'draft' }),
    } as unknown as NextRequest);

    expect(createStoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Quest 2', authorId: 'author-1', status: 'draft' }),
    );
  });
});
