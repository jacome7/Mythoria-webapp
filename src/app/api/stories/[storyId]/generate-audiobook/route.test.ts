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

function buildRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/stories/[storyId]/generate-audiobook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 and does not deduct when story is not owned by the current author', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'author-2', status: 'published' });

    const response = (await POST(buildRequest({}), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    await expect(response.json()).resolves.toEqual({ error: 'Story not found or access denied' });
    expect(response.status).toBe(404);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(publishAudiobookRequestMock).not.toHaveBeenCalled();
  });

  it('returns 402 when balance is insufficient and does not queue workflow', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'author-1', status: 'published' });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 8 });
    getAuthorCreditBalanceMock.mockResolvedValue(3);

    const response = (await POST(buildRequest({ voice: 'coral' }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    await expect(response.json()).resolves.toEqual({
      error: 'Insufficient credits',
      required: 8,
      available: 3,
      shortfall: 5,
    });
    expect(response.status).toBe(402);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(updateStoryMock).not.toHaveBeenCalled();
    expect(publishAudiobookRequestMock).not.toHaveBeenCalled();
  });

  it('refunds credits and reverts story status when pubsub publish fails', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'author-1', status: 'published' });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 5 });
    getAuthorCreditBalanceMock.mockResolvedValue(20);
    deductCreditsMock.mockResolvedValue({});
    updateStoryMock.mockResolvedValue({});
    publishAudiobookRequestMock.mockRejectedValue(new Error('pubsub down'));

    const response = (await POST(buildRequest({ voice: 'coral', includeBackgroundMusic: true }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to start audiobook generation workflow',
    });

    expect(deductCreditsMock).toHaveBeenCalledWith(
      'author-1',
      5,
      'audioBookGeneration',
      'story-1',
    );
    expect(updateStoryMock).toHaveBeenNthCalledWith(1, 'story-1', { audiobookStatus: 'generating' });
    expect(updateStoryMock).toHaveBeenNthCalledWith(2, 'story-1', { audiobookStatus: null });
    expect(addCreditsMock).toHaveBeenCalledWith('author-1', 5, 'refund');
  });
});
