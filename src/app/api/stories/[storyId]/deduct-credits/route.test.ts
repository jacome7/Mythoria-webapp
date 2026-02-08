jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const calculateCreditsForFeaturesMock = jest.fn();
const getAuthorCreditBalanceMock = jest.fn();
const deductCreditsMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  pricingService: {
    calculateCreditsForFeatures: (...args: unknown[]) => calculateCreditsForFeaturesMock(...args),
  },
  creditService: {
    getAuthorCreditBalance: (...args: unknown[]) => getAuthorCreditBalanceMock(...args),
    deductCredits: (...args: unknown[]) => deductCreditsMock(...args),
  },
}));

import type { NextRequest } from 'next/server';
import { POST } from './route';

function buildRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/stories/[storyId]/deduct-credits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 402 and does not deduct when credits are insufficient', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 7,
      breakdown: [{ serviceCode: 'eBookGeneration', credits: 7 }],
    });
    getAuthorCreditBalanceMock.mockResolvedValue(4);

    const response = (await POST(
      buildRequest({
        storyId: 'story-99',
        selectedFeatures: { ebook: true, printed: false, audiobook: false },
      }),
    )) as { status: number; json: () => Promise<unknown> };

    await expect(response.json()).resolves.toEqual({
      error: 'Insufficient credits',
      required: 7,
      available: 4,
      shortfall: 3,
    });
    expect(response.status).toBe(402);
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it('deducts each selected service and returns updated balance', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 10,
      breakdown: [
        { serviceCode: 'eBookGeneration', credits: 6 },
        { serviceCode: 'audioBookGeneration', credits: 4 },
      ],
    });
    getAuthorCreditBalanceMock
      .mockResolvedValueOnce(30) // previous balance
      .mockResolvedValueOnce(20); // updated balance

    deductCreditsMock
      .mockResolvedValueOnce({ creditId: 'tx-1' })
      .mockResolvedValueOnce({ creditId: 'tx-2' });

    const response = (await POST(
      buildRequest({
        storyId: 'story-99',
        selectedFeatures: { ebook: true, printed: false, audiobook: true },
      }),
    )) as { status: number; json: () => Promise<unknown> };

    const payload = (await response.json()) as {
      success: boolean;
      totalDeducted: number;
      previousBalance: number;
      newBalance: number;
      transactions: Array<{ creditId: string; description: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.totalDeducted).toBe(10);
    expect(payload.previousBalance).toBe(30);
    expect(payload.newBalance).toBe(20);
    expect(payload.transactions).toEqual([
      { creditId: 'tx-1', description: 'Digital Book Generation' },
      { creditId: 'tx-2', description: 'Audiobook Generation' },
    ]);

    expect(deductCreditsMock).toHaveBeenNthCalledWith(
      1,
      'author-1',
      6,
      'eBookGeneration',
      'story-99',
    );
    expect(deductCreditsMock).toHaveBeenNthCalledWith(
      2,
      'author-1',
      4,
      'audioBookGeneration',
      'story-99',
    );
  });

  it('returns 500 when one deduction fails', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 12,
      breakdown: [
        { serviceCode: 'eBookGeneration', credits: 5 },
        { serviceCode: 'printOrder', credits: 7 },
      ],
    });
    getAuthorCreditBalanceMock.mockResolvedValue(100);
    deductCreditsMock
      .mockResolvedValueOnce({ creditId: 'tx-1' })
      .mockRejectedValueOnce(new Error('db-write-failed'));

    const response = (await POST(
      buildRequest({
        storyId: 'story-99',
        selectedFeatures: { ebook: true, printed: true, audiobook: false },
      }),
    )) as { status: number; json: () => Promise<unknown> };

    await expect(response.json()).resolves.toEqual({
      error: 'Failed to deduct credits for Printed Book Order',
    });
    expect(response.status).toBe(500);
    expect(deductCreditsMock).toHaveBeenCalledTimes(2);
  });
});
