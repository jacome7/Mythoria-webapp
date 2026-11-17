/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockDb = { marker: 'db' };
const mockGetCurrentAuthor = jest.fn();
const mockGetCreditPackage = jest.fn();
const mockCreateCheckout = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockResolveAdContext = jest.fn();
const mockBuildInput = jest.fn();

jest.mock('@/db', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/db/services', () => ({
  paymentService: {
    getCreditPackage: (...args: unknown[]) => mockGetCreditPackage(...args),
    createStripeCheckoutSession: (...args: unknown[]) => mockCreateCheckout(...args),
  },
}));
jest.mock('@/db/services/payment', () => ({
  buildCreditOrderConversionInput: (...args: unknown[]) => mockBuildInput(...args),
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/referrals/http', () => ({
  linkReferralFromRequest: jest.fn(),
  referralHttpError: jest.fn(),
}));
jest.mock('@/lib/referrals/policy', () => ({ ReferralError: class extends Error {} }));
jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: jest.fn(async () => ({})),
}));
jest.mock('@/lib/email-campaign-attribution', () => ({
  readEmailCampaignAttribution: () => undefined,
}));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: (...args: unknown[]) => mockResolveAdContext(...args),
}));

import { POST } from './route';

const adContext = {
  adConsent: 'granted',
  oppref: 'opp-1',
  sourceUrl: 'https://mythoria.pt/en-US/buy-credits',
  capturedAt: '2026-11-16T00:00:00.000Z',
};
const request = () =>
  new NextRequest('https://mythoria.pt/api/payments/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({
      checkoutAttemptId: '33333333-3333-4333-8333-333333333333',
      creditPackages: [{ packageId: 1, quantity: 1 }],
      locale: 'en-US',
    }),
  });

describe('POST /api/payments/stripe/checkout (OpenAI Ads)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAuthor.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
      email: 'a@example.com',
      displayName: 'A',
    });
    mockGetCreditPackage.mockResolvedValue({ id: 1, credits: 100, price: 9.99 });
    mockResolveAdContext.mockResolvedValue(adContext);
    mockBuildInput.mockImplementation((order: { orderId: string; amount: number }) => ({
      orderId: order.orderId,
      amountCents: order.amount,
      currency: 'EUR',
      packageKey: 'credit_package_starter',
      packageName: '100 Mythoria Credits',
      credits: 100,
    }));
  });

  it('stores the ad context on the order, enqueues checkout_started and returns its id', async () => {
    mockCreateCheckout.mockResolvedValue({
      order: { orderId: 'order-1', amount: 999, currency: 'EUR', creditBundle: { credits: 100 } },
      checkoutSession: { id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' },
      ecommerce: { currency: 'EUR', value: 9.99, items: [] },
    });

    const response = await POST(request());
    const json = await response.json();

    expect(json).toMatchObject({
      success: true,
      orderId: 'order-1',
      adEventId: 'checkout_order-1',
    });
    expect(mockCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ adContext }));
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(mockDb, {
      conversion: expect.objectContaining({
        eventType: 'checkout_started',
        eventId: 'checkout_order-1',
        data: expect.objectContaining({ amount: 999, currency: 'EUR' }),
      }),
      authorId: 'author-1',
      adContext,
    });
  });

  it('still returns the checkout URL when the ad conversion cannot be built', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockBuildInput.mockImplementation(() => {
      throw new Error('bad credit bundle');
    });
    mockCreateCheckout.mockResolvedValue({
      order: { orderId: 'order-1', amount: 999, currency: 'EUR', creditBundle: {} },
      checkoutSession: { id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' },
      ecommerce: {},
    });

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      checkoutUrl: 'https://checkout.stripe.test/cs_1',
    });
    expect(json).not.toHaveProperty('adEventId');
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });

  it('does not enqueue when Stripe returned no checkout URL', async () => {
    mockCreateCheckout.mockResolvedValue({
      order: { orderId: 'order-1', amount: 999, currency: 'EUR', creditBundle: { credits: 100 } },
      checkoutSession: { id: 'cs_1', url: null },
      ecommerce: {},
    });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
