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

describe('POST /api/stories/[storyId]/deduct-credits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });

  it('returns 402 with shortfall payload and skips deductions when balance is insufficient', async () => {
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 7,
      breakdown: [{ serviceCode: 'eBookGeneration', credits: 7 }],
    });
    getAuthorCreditBalanceMock.mockResolvedValue(4);

    const response = (await POST({
      json: async () => ({
        storyId: 'story-99',
        selectedFeatures: { ebook: true, printed: false, audiobook: false },
      }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    await expect(response.json()).resolves.toEqual({
      error: 'Insufficient credits',
      required: 7,
      available: 4,
      shortfall: 3,
    });
    expect(response.status).toBe(402);
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it('returns 500 cleanly when one deduction fails in a multi-transaction sequence', async () => {
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 8,
      breakdown: [
        { serviceCode: 'eBookGeneration', credits: 3 },
        { serviceCode: 'printOrder', credits: 5 },
      ],
    });
    getAuthorCreditBalanceMock.mockResolvedValue(20);
    deductCreditsMock
      .mockResolvedValueOnce({ ledgerId: 'ledger-1' })
      .mockRejectedValueOnce(new Error('db fail'));

    const response = (await POST({
      json: async () => ({
        storyId: 'story-2',
        selectedFeatures: { ebook: true, printed: true, audiobook: false },
      }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to deduct credits for Printed Book Order',
    });
    expect(deductCreditsMock).toHaveBeenCalledTimes(2);
    expect(getAuthorCreditBalanceMock).toHaveBeenCalledTimes(1);
  });

  it('returns updated balance and ledger entries when all deductions succeed', async () => {
    calculateCreditsForFeaturesMock.mockResolvedValue({
      total: 12,
      breakdown: [
        { serviceCode: 'eBookGeneration', credits: 4 },
        { serviceCode: 'audioBookGeneration', credits: 8 },
      ],
    });
    getAuthorCreditBalanceMock.mockResolvedValueOnce(30).mockResolvedValueOnce(18);
    deductCreditsMock
      .mockResolvedValueOnce({ ledgerId: 'ledger-ebook', amount: 4 })
      .mockResolvedValueOnce({ ledgerId: 'ledger-audio', amount: 8 });

    const response = (await POST({
      json: async () => ({
        storyId: 'story-3',
        selectedFeatures: { ebook: true, printed: false, audiobook: true },
      }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      transactions: [
        { ledgerId: 'ledger-ebook', amount: 4, description: 'Digital Book Generation' },
        { ledgerId: 'ledger-audio', amount: 8, description: 'Audiobook Generation' },
      ],
      totalDeducted: 12,
      previousBalance: 30,
      newBalance: 18,
    });
  });
});
