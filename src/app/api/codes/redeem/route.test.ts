/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockDb = { marker: 'db' };
const mockRedeem = jest.fn();
const mockGetCurrentAuthor = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockAdContext = {
  adConsent: 'denied',
  sourceUrl: 'https://mythoria.pt',
  capturedAt: '2026-11-16T00:00:00.000Z',
};

jest.mock('@/db', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/db/services', () => ({
  promotionCodeService: { redeem: (...args: unknown[]) => mockRedeem(...args) },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: jest.fn(async () => mockAdContext),
}));

import { POST } from './route';

const request = () =>
  new NextRequest('https://mythoria.pt/api/codes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code: 'promo10' }),
  });

describe('POST /api/codes/redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1' });
  });

  it('enqueues promo_code_redeemed with the redemption id and returns it', async () => {
    mockRedeem.mockResolvedValue({
      ok: true,
      code: 'PROMO10',
      creditsGranted: 10,
      balance: 20,
      redemptionId: 'redemption-1',
    });

    const response = await POST(request());

    expect(await response.json()).toEqual({
      code: 'PROMO10',
      creditsGranted: 10,
      newBalance: 20,
      adEventId: 'promo_redemption-1',
    });
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(mockDb, {
      conversion: expect.objectContaining({
        customEventName: 'promo_code_redeemed',
        eventId: 'promo_redemption-1',
      }),
      authorId: 'author-1',
      adContext: mockAdContext,
    });
  });

  it('enqueues nothing for an invalid code', async () => {
    mockRedeem.mockResolvedValue({ ok: false, error: 'invalid_code' });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
