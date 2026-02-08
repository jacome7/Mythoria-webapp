jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('crypto', () => ({ randomUUID: () => 'run-uuid-1' }));

const getCurrentAuthorMock = jest.fn();
const getStoryByIdMock = jest.fn();
const updateStoryMock = jest.fn();
const publishStoryRequestMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: (...args: unknown[]) => getStoryByIdMock(...args),
    updateStory: (...args: unknown[]) => updateStoryMock(...args),
  },
}));

jest.mock('@/lib/pubsub', () => ({
  publishStoryRequest: (...args: unknown[]) => publishStoryRequestMock(...args),
}));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/stories/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });

  it('validates request schema with zod and returns 400 for bad payload', async () => {
    const response = (await POST({
      json: async () => ({ storyId: 'story-1', features: { ebook: true } }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string; details: unknown[] };
    expect(payload.error).toBe('Invalid request data');
    expect(payload.details.length).toBeGreaterThan(0);
    expect(getStoryByIdMock).not.toHaveBeenCalled();
  });

  it('validates ownership before starting workflow', async () => {
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'other-author' });

    const response = (await POST({
      json: async () => ({
        storyId: 'story-1',
        features: { ebook: true, printed: false, audiobook: false },
      }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Story not found' });
    expect(updateStoryMock).not.toHaveBeenCalled();
  });

  it('returns 500 when workflow publish fails after status update', async () => {
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'author-1' });
    updateStoryMock.mockResolvedValue({});
    publishStoryRequestMock.mockRejectedValue(new Error('pubsub down'));

    const response = (await POST({
      json: async () => ({
        storyId: 'story-1',
        features: { ebook: true, printed: true, audiobook: true },
      }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to start story generation workflow',
    });
    expect(updateStoryMock).toHaveBeenCalledWith(
      'story-1',
      expect.objectContaining({ status: 'writing' }),
    );
    expect(publishStoryRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: 'story-1', runId: 'run-uuid-1' }),
    );
  });
});
