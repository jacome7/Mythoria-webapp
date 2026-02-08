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
const deductCreditsMock = jest.fn();
const addCreditsMock = jest.fn();
const updateStoryMock = jest.fn();
const publishAudiobookRequestMock = jest.fn();

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
    deductCredits: (...args: unknown[]) => deductCreditsMock(...args),
    addCredits: (...args: unknown[]) => addCreditsMock(...args),
  },
}));

jest.mock('@/lib/pubsub', () => ({
  publishAudiobookRequest: (...args: unknown[]) => publishAudiobookRequestMock(...args),
}));

jest.mock('uuid', () => ({ v4: () => 'run-fixed-123' }));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/stories/[storyId]/generate-audiobook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });

  it('enforces ownership and published-state checks before charging credits', async () => {
    getStoryByIdMock.mockResolvedValueOnce({
      storyId: 'story-1',
      authorId: 'other-author',
      status: 'published',
    });

    const unauthorizedStoryResponse = (await POST(
      { json: async () => ({}) } as unknown as NextRequest,
      { params: Promise.resolve({ storyId: 'story-1' }) },
    )) as { status: number; json: () => Promise<unknown> };

    expect(unauthorizedStoryResponse.status).toBe(404);
    await expect(unauthorizedStoryResponse.json()).resolves.toEqual({
      error: 'Story not found or access denied',
    });

    getStoryByIdMock.mockResolvedValueOnce({
      storyId: 'story-2',
      authorId: 'author-1',
      status: 'draft',
    });

    const unpublishedResponse = (await POST({ json: async () => ({}) } as unknown as NextRequest, {
      params: Promise.resolve({ storyId: 'story-2' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(unpublishedResponse.status).toBe(400);
    await expect(unpublishedResponse.json()).resolves.toEqual({
      error: 'Story must be completed to generate audiobook',
    });
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it('deducts credits before publishing audiobook workflow request', async () => {
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      authorId: 'author-1',
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValueOnce(15).mockResolvedValueOnce(10);
    deductCreditsMock.mockResolvedValue({});
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockResolvedValue({});

    const response = (await POST(
      {
        json: async () => ({ voice: 'coral', includeBackgroundMusic: true }),
      } as unknown as NextRequest,
      { params: Promise.resolve({ storyId: 'story-1' }) },
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(202);
    expect(deductCreditsMock).toHaveBeenCalledWith('author-1', 5, 'audioBookGeneration', 'story-1');
    expect(publishAudiobookRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: 'story-1', runId: 'run-fixed-123' }),
    );
    expect(deductCreditsMock.mock.invocationCallOrder[0]).toBeLessThan(
      publishAudiobookRequestMock.mock.invocationCallOrder[0],
    );
  });

  it('refunds credits and reverts status when publish fails', async () => {
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      authorId: 'author-1',
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValue(20);
    deductCreditsMock.mockResolvedValue({});
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockRejectedValue(new Error('pubsub down'));

    const response = (await POST(
      {
        json: async () => ({ voice: 'coral', includeBackgroundMusic: true }),
      } as unknown as NextRequest,
      { params: Promise.resolve({ storyId: 'story-1' }) },
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to start audiobook generation workflow',
    });

    expect(updateStoryMock).toHaveBeenNthCalledWith(1, 'story-1', {
      audiobookStatus: 'generating',
    });
    expect(updateStoryMock).toHaveBeenNthCalledWith(2, 'story-1', { audiobookStatus: null });
    expect(addCreditsMock).toHaveBeenCalledWith('author-1', 5, 'refund');
  });
});
