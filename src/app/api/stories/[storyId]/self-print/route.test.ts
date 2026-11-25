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
const loadPublishedPremiumBookMock = jest.fn();

jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => loadPublishedPremiumBookMock(...args),
}));

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: (...args: unknown[]) => getStoryByIdMock(...args),
  },
  pricingService: {
    getStoryProductProfile: jest.fn().mockResolvedValue('standard'),
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

const mockAdContext = {
  adConsent: 'denied',
  sourceUrl: 'https://mythoria.pt',
  capturedAt: '2026-11-16T00:00:00.000Z',
};
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: jest.fn(async () => mockAdContext),
}));

import type { NextRequest } from 'next/server';
import { InsufficientProductCreditsError } from '@/lib/product-generation';
import { encodePremiumSelfPrintPin } from '@/lib/premium-children-book/self-print';
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

  const premiumBook = {
    version: 1,
    type: 'premium_children',
    state: 'published',
    revision: '00000000-0000-4000-8000-000000000100',
    manifest: {
      key: 'story-1/premium/revisions/00000000-0000-4000-8000-000000000100/manifest.json',
      generation: '123',
      sha256: 'a'.repeat(64),
      bytes: 1024,
    },
  } as const;
  const pinnedRequest = {
    runId: 'workflow-id-fixed',
    status: 'pending',
    storyId: 'story-1',
    authorId: 'author-1',
    queueReference: encodePremiumSelfPrintPin('story-1', { premiumBook, generateCMYK: true }),
  };

  it('allows the owner to use standard self-print pricing and passes the verified premium pin', async () => {
    getStoryByIdMock.mockResolvedValue({
      authorId: 'author-1',
      status: 'published',
      features: { premiumBook },
    });
    loadPublishedPremiumBookMock.mockResolvedValue({});
    getAuthorCreditBalanceMock.mockResolvedValue(10);
    startProductGenerationMock.mockResolvedValue({
      request: pinnedRequest,
      remainingCredits: 6,
    });
    sgwFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, executionId: 'execution-1', recipients: [] }),
    });

    const response = await POST(request(), { params: Promise.resolve({ storyId: 'story-1' }) });
    expect(response.status).toBe(200);
    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'self_print', creditsSpent: 4 }),
    );
    const [path, init] = sgwFetchMock.mock.calls[0];
    expect(path).toBe('/print/self-service');
    expect(JSON.parse(init.body)).toMatchObject({ premiumBook });
  });

  it('reuses the debited pin after a correction and keeps the same request retryable on ambiguous enqueue', async () => {
    const revision = '00000000-0000-4000-8000-000000000101';
    const currentPin = { ...premiumBook, revision, manifest: { ...premiumBook.manifest, key: `story-1/premium/revisions/${revision}/manifest.json` } };
    getStoryByIdMock.mockResolvedValue({ authorId: 'author-1', status: 'published', features: { premiumBook: currentPin } });
    loadPublishedPremiumBookMock.mockResolvedValue({});
    getAuthorCreditBalanceMock.mockResolvedValue(6);
    startProductGenerationMock.mockResolvedValue({ request: pinnedRequest, duplicate: true, remainingCredits: 6 });
    sgwFetchMock.mockRejectedValueOnce(new Error('Unknown execution outcome'));
    sgwFetchMock.mockResolvedValueOnce({ ok: true, status: 202, json: async () => ({ success: true, executionId: 'execution-1', recipients: [] }) });
    const context = { params: Promise.resolve({ storyId: 'story-1' }) };
    const pending = await POST(request({ generateCMYK: false }), context);
    expect(pending.status).toBe(503);
    await expect(pending.json()).resolves.toMatchObject({ retryable: true });
    expect(compensateProductGenerationMock).not.toHaveBeenCalled();
    expect((await POST(request({ generateCMYK: false }), context)).status).toBe(200);
    expect(sgwFetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      expect.objectContaining({ premiumBook: expect.objectContaining(premiumBook), workflowId: pinnedRequest.runId, generateCMYK: true }),
      expect.objectContaining({ premiumBook: expect.objectContaining(premiumBook), workflowId: pinnedRequest.runId, generateCMYK: true }),
    ]);
    expect(markProductGenerationQueuedMock).toHaveBeenCalledTimes(1);
  });

  it('never sends new recipients to a survey-funded request from the paid route', async () => {
    startProductGenerationMock.mockResolvedValue({ request: { ...pinnedRequest, fundingSource: 'survey_reward' }, duplicate: true });
    const response = await POST(request({ email: 'recipient@example.com' }), { params: Promise.resolve({ storyId: 'story-1' }) });
    expect(response.status).toBe(409);
    expect(sgwFetchMock).not.toHaveBeenCalled();
    expect(compensateProductGenerationMock).not.toHaveBeenCalled();
  });

  it('keeps shared premium stories read-only and rejects an unavailable owner edition before charging', async () => {
    const story = { status: 'published', features: { premiumBook }, isPublic: true };
    getStoryByIdMock.mockResolvedValueOnce({ ...story, authorId: 'other-author' });
    const context = { params: Promise.resolve({ storyId: 'story-1' }) };
    expect((await POST(request(), context)).status).toBe(403);
    expect(loadPublishedPremiumBookMock).not.toHaveBeenCalled();

    getStoryByIdMock.mockResolvedValueOnce({ ...story, authorId: 'author-1' });
    loadPublishedPremiumBookMock.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(409);
    expect(startProductGenerationMock).not.toHaveBeenCalled();
    expect(sgwFetchMock).not.toHaveBeenCalled();
  });

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

  it('passes the ad context to the durable request and returns the self-print event id', async () => {
    getAuthorCreditBalanceMock.mockResolvedValue(10);
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'workflow-id-fixed', status: 'pending' },
      remainingCredits: 6,
      duplicate: false,
    });
    sgwFetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        workflowId: 'workflow-id-fixed',
        executionId: 'execution-1',
        recipients: [{ email: 'reader@example.com' }],
      }),
    });

    const response = (await POST(request({ emails: ['reader@example.com'] }), {
      params: Promise.resolve({ storyId: 'story-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'self_print', adContext: mockAdContext }),
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      adEventId: 'self_print_workflow-id-fixed',
    });
  });
});
