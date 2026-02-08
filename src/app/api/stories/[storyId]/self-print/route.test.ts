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
const sgwFetchMock = jest.fn();
const getTranslationsMock = jest.fn();

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
    deductCredits: (...args: unknown[]) => deductCreditsMock(...args),
    addCredits: (...args: unknown[]) => addCreditsMock(...args),
  },
}));

jest.mock('@/lib/sgw-client', () => ({
  sgwFetch: (...args: unknown[]) => sgwFetchMock(...args),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => getTranslationsMock(...args),
}));

jest.mock('uuid', () => ({ v4: () => 'workflow-id-fixed' }));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/stories/[storyId]/self-print', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
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
  });

  it('returns 402 with balance payload when credits are insufficient', async () => {
    getAuthorCreditBalanceMock.mockResolvedValue(1);

    const response = (await POST(
      { json: async () => ({ email: 'reader@example.com' }) } as unknown as NextRequest,
      { params: Promise.resolve({ storyId: 'story-1' }) },
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Insufficient credits',
      required: 4,
      available: 1,
      shortfall: 3,
    });
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it('deducts credits and refunds with localized error payload when enqueue fails', async () => {
    getAuthorCreditBalanceMock.mockResolvedValue(10);
    deductCreditsMock.mockResolvedValue({});
    sgwFetchMock.mockRejectedValue(new Error('queue down'));

    const response = (await POST(
      { json: async () => ({ emails: ['reader@example.com'] }) } as unknown as NextRequest,
      { params: Promise.resolve({ storyId: 'story-1' }) },
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Não foi possível iniciar a impressão.',
      creditsDeducted: 0,
    });

    expect(deductCreditsMock).toHaveBeenCalledWith('author-1', 4, 'selfPrinting', 'story-1');
    expect(addCreditsMock).toHaveBeenCalledWith('author-1', 4, 'refund');
  });
});
