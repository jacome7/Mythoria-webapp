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
  });

  it('blocks deduction with 402 when available credits are below required total', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
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

    const payload = (await response.json()) as {
      error: string;
      required: number;
      available: number;
      shortfall: number;
    };

    expect(response.status).toBe(402);
    expect(payload).toEqual({
      error: 'Insufficient credits',
      required: 7,
      available: 4,
      shortfall: 3,
    });
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });
});
