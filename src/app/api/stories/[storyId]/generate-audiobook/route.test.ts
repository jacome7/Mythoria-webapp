jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const getStoryByIdMock = jest.fn();
const getPricingByServiceCodeMock = jest.fn();
const getAuthorCreditBalanceMock = jest.fn();
const updateStoryMock = jest.fn();
const publishAudiobookRequestMock = jest.fn();
const startProductGenerationMock = jest.fn();
const markProductGenerationQueuedMock = jest.fn();
const compensateProductGenerationMock = jest.fn();
const resolveServerAnalyticsContextMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: (...args: unknown[]) => getStoryByIdMock(...args),
    updateStory: (...args: unknown[]) => updateStoryMock(...args),
  },
  pricingService: {
    getPricingByServiceCode: (...args: unknown[]) => getPricingByServiceCodeMock(...args),
  },
  creditService: {
    getAuthorCreditBalance: (...args: unknown[]) => getAuthorCreditBalanceMock(...args),
  },
}));

jest.mock('@/lib/pubsub', () => ({
  publishAudiobookRequest: (...args: unknown[]) => publishAudiobookRequestMock(...args),
}));

jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: (...args: unknown[]) => resolveServerAnalyticsContextMock(...args),
}));

jest.mock('@/lib/product-generation', () => ({
  InsufficientProductCreditsError: class InsufficientProductCreditsError extends Error {},
  startProductGeneration: (...args: unknown[]) => startProductGenerationMock(...args),
  markProductGenerationQueued: (...args: unknown[]) => markProductGenerationQueuedMock(...args),
  compensateProductGeneration: (...args: unknown[]) => compensateProductGenerationMock(...args),
}));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/stories/[storyId]/generate-audiobook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1', clerkUserId: 'clerk-1' });
    resolveServerAnalyticsContextMock.mockResolvedValue({});
  });

  const request = (body: Record<string, unknown> = {}) =>
    ({
      json: async () => body,
      headers: { get: () => 'request-1' },
      cookies: { get: () => undefined },
    }) as unknown as NextRequest;

  it('enforces ownership and published-state checks before charging credits', async () => {
    getStoryByIdMock.mockResolvedValueOnce({
      storyId: 'story-1',
      authorId: 'other-author',
      status: 'published',
    });

    const unauthorizedStoryResponse = (await POST(request(), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(unauthorizedStoryResponse.status).toBe(404);
    await expect(unauthorizedStoryResponse.json()).resolves.toEqual({
      error: 'Story not found or access denied',
    });

    getStoryByIdMock.mockResolvedValueOnce({
      storyId: 'story-2',
      authorId: 'author-1',
      status: 'draft',
    });

    const unpublishedResponse = (await POST(request(), {
      params: Promise.resolve({ storyId: 'story-2' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(unpublishedResponse.status).toBe(400);
    await expect(unpublishedResponse.json()).resolves.toEqual({
      error: 'Story must be completed to generate audiobook',
    });
    expect(startProductGenerationMock).not.toHaveBeenCalled();
  });

  it('creates one durable request before publishing and records the queued event', async () => {
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      authorId: 'author-1',
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValue(15);
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-fixed-123', status: 'pending' },
      remainingCredits: 10,
      duplicate: false,
    });
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockResolvedValue('message-1');

    const response = (await POST(request({ voice: 'coral', includeBackgroundMusic: true }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(202);
    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'audiobook_generation',
        authorId: 'author-1',
        storyId: 'story-1',
        idempotencyKey: 'request-1',
        creditsSpent: 5,
      }),
    );
    expect(publishAudiobookRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: 'story-1', runId: 'run-fixed-123' }),
    );
    expect(startProductGenerationMock.mock.invocationCallOrder[0]).toBeLessThan(
      publishAudiobookRequestMock.mock.invocationCallOrder[0],
    );
    expect(markProductGenerationQueuedMock).toHaveBeenCalledWith('run-fixed-123', 'message-1');
  });

  it('compensates credits idempotently and reverts status when publish fails', async () => {
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      authorId: 'author-1',
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValue(20);
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-fixed-123', status: 'pending' },
      remainingCredits: 15,
      duplicate: false,
    });
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockRejectedValue(new Error('pubsub down'));

    const response = (await POST(request({ voice: 'coral', includeBackgroundMusic: true }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to start audiobook generation workflow',
    });

    expect(updateStoryMock).toHaveBeenNthCalledWith(1, 'story-1', {
      audiobookStatus: 'generating',
    });
    expect(updateStoryMock).toHaveBeenNthCalledWith(2, 'story-1', { audiobookStatus: null });
    expect(compensateProductGenerationMock).toHaveBeenCalledWith(
      'run-fixed-123',
      'queue',
      'pubsub_publish_failed',
    );
  });

  it('does not compensate when Pub/Sub accepted the run but outbox persistence must be retried', async () => {
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      authorId: 'author-1',
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValue(20);
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-fixed-123', status: 'pending' },
      remainingCredits: 15,
      duplicate: false,
    });
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockResolvedValue('message-1');
    markProductGenerationQueuedMock.mockRejectedValue(new Error('database unavailable'));

    const response = (await POST(request(), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number };

    expect(response.status).toBe(500);
    expect(compensateProductGenerationMock).not.toHaveBeenCalled();
    expect(updateStoryMock).not.toHaveBeenCalledWith('story-1', { audiobookStatus: null });
  });
});
