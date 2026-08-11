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
const sgwFetchMock = jest.fn();
const getTranslationsMock = jest.fn();
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
  },
  pricingService: {
    getPricingByServiceCode: (...args: unknown[]) => getPricingByServiceCodeMock(...args),
  },
  creditService: {
    getAuthorCreditBalance: (...args: unknown[]) => getAuthorCreditBalanceMock(...args),
  },
}));

jest.mock('@/lib/sgw-client', () => ({
  sgwFetch: (...args: unknown[]) => sgwFetchMock(...args),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => getTranslationsMock(...args),
}));

jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: (...args: unknown[]) => resolveServerAnalyticsContextMock(...args),
}));

jest.mock('@/lib/product-generation', () => ({
  InsufficientProductCreditsError: class InsufficientProductCreditsError extends Error {
    constructor(readonly available: number) {
      super('Insufficient credits');
    }
  },
  startProductGeneration: (...args: unknown[]) => startProductGenerationMock(...args),
  markProductGenerationQueued: (...args: unknown[]) => markProductGenerationQueuedMock(...args),
  compensateProductGeneration: (...args: unknown[]) => compensateProductGenerationMock(...args),
}));

import type { NextRequest } from 'next/server';
import { InsufficientProductCreditsError } from '@/lib/product-generation';
import { POST } from './route';

describe('POST /api/stories/[storyId]/self-print', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
      email: 'author@example.com',
      preferredLocale: 'pt-PT',
    });
    getStoryByIdMock.mockResolvedValue({
      storyId: 'story-1',
      title: 'My Story',
      storyLanguage: 'en-US',
      authorId: 'author-1',
      isPublic: false,
      status: 'published',
    });
    getPricingByServiceCodeMock.mockResolvedValue({ credits: 4 });
    getTranslationsMock.mockResolvedValue((key: string) =>
      key === 'errors.workflowQueueFailed' ? 'Não foi possível iniciar a impressão.' : key,
    );
    resolveServerAnalyticsContextMock.mockResolvedValue({});
  });

  const request = (body: Record<string, unknown> = {}) =>
    ({
      json: async () => body,
      headers: { get: () => 'request-1' },
      cookies: { get: () => undefined },
    }) as unknown as NextRequest;

  it('returns 402 with balance payload when credits are insufficient', async () => {
    getAuthorCreditBalanceMock.mockResolvedValue(1);
    startProductGenerationMock.mockRejectedValue(new InsufficientProductCreditsError(1));

    const response = (await POST(request({ email: 'reader@example.com' }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Insufficient credits',
      required: 4,
      available: 1,
      shortfall: 3,
    });
    expect(sgwFetchMock).not.toHaveBeenCalled();
  });

  it('compensates the durable request with a localized error when enqueue fails', async () => {
    getAuthorCreditBalanceMock.mockResolvedValue(10);
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'workflow-id-fixed', status: 'pending' },
      remainingCredits: 6,
      duplicate: false,
    });
    sgwFetchMock.mockRejectedValue(new Error('queue down'));

    const response = (await POST(request({ emails: ['reader@example.com'] }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Não foi possível iniciar a impressão.',
      creditsDeducted: 0,
    });

    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'self_print',
        idempotencyKey: 'request-1',
        creditsSpent: 4,
      }),
    );
    expect(compensateProductGenerationMock).toHaveBeenCalledWith(
      'workflow-id-fixed',
      'queue',
      'workflow_enqueue_failed',
    );
  });
});
