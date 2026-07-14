const mockSignUpConversion = jest.fn();
const mockStoryConversion = jest.fn();
const mockPurchaseConversion = jest.fn();

jest.mock('./googleAdsConversions', () => ({
  trackMythoriaConversionsEnhanced: {
    signUp: mockSignUpConversion,
    storyCreated: mockStoryConversion,
    creditPurchase: mockPurchaseConversion,
  },
}));

import {
  trackAuth,
  trackCommerce,
  trackEvent,
  trackStoryCreation,
  getGoogleAnalyticsContext,
  type CheckoutEventParams,
  type CreditPurchaseEventParams,
} from './analytics';

const checkout: CheckoutEventParams = {
  currency: 'EUR',
  value: 38,
  gross_value: 38,
  credits_purchased: 400,
  items: [
    {
      item_id: 'credit_package_starter',
      item_name: '100 Mythoria Credits',
      item_brand: 'Mythoria',
      item_category: 'Credits',
      price: 10,
      gross_unit_price: 10,
      quantity: 2,
    },
  ],
};

const purchase: CreditPurchaseEventParams = {
  ...checkout,
  transaction_id: 'order-123',
  value: 35.85,
  gross_value: 38,
  tax: 2.15,
  payment_type: 'card',
};

describe('analytics event propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as Partial<Window>).gtag;
    window.dataLayer = [];
    document.cookie = 'mythoria_consent=; Max-Age=0; path=/';
  });

  it('queues an explicitly routed event while the external tag is loading', () => {
    trackEvent('pricing_viewed', { source: 'pricing' });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toEqual([
      'event',
      'pricing_viewed',
      expect.objectContaining({
        source: 'pricing',
        send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197',
      }),
    ]);
  });

  it('sets User-ID before signup, emits standard and legacy events, and omits event user_id', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    trackAuth.signUp({ user_id: 'user_clerk_1', method: 'google' });

    expect(gtag.mock.calls[0]).toEqual(['set', { user_id: 'user_clerk_1' }]);
    expect(gtag.mock.calls[1]).toEqual([
      'event',
      'sign_up',
      expect.objectContaining({ method: 'google' }),
    ]);
    expect(gtag.mock.calls[1][2]).not.toHaveProperty('user_id');
    expect(gtag.mock.calls[2]).toEqual([
      'event',
      'sign_up_completed',
      expect.objectContaining({ sign_up_method: 'google' }),
    ]);
    expect(mockSignUpConversion).toHaveBeenCalledWith('user_clerk_1');
  });

  it('clears User-ID after the logout event', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    trackAuth.logout();

    expect(gtag.mock.calls[0][1]).toBe('logout');
    expect(gtag.mock.calls[1]).toEqual(['set', { user_id: null }]);
  });

  it('emits begin_checkout alongside checkout_started with recommended parameters', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    trackCommerce.checkoutStarted({ ...checkout, payment_method: 'stripe' });

    expect(gtag).toHaveBeenNthCalledWith(
      1,
      'event',
      'begin_checkout',
      expect.objectContaining({ currency: 'EUR', value: 38, items: checkout.items }),
    );
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      'event',
      'checkout_started',
      expect.objectContaining({ payment_method: 'stripe' }),
    );
  });

  it('sends the same authoritative purchase to both GA events and gross value to Ads', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    trackCommerce.creditPurchase(purchase);

    expect(gtag).toHaveBeenNthCalledWith(
      1,
      'event',
      'credit_pack_purchased',
      expect.objectContaining(purchase),
    );
    expect(gtag).toHaveBeenNthCalledWith(2, 'event', 'purchase', expect.objectContaining(purchase));
    expect(mockPurchaseConversion).toHaveBeenCalledWith(38, 'EUR', 'order-123');
  });

  it('does not emit story_published when generation is only requested', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    trackStoryCreation.generationRequested({
      story_id: 'story-1',
      run_id: 'run-1',
      user_id: 'user-1',
    });

    const eventNames = gtag.mock.calls.map((call) => call[1]);
    expect(eventNames).toEqual(['story_generation_requested']);
    expect(gtag.mock.calls[0][2]).toEqual(expect.objectContaining({ run_id: 'run-1' }));
  });

  it('uses NEXT_PUBLIC_GA_DEBUG for queued event debug mode', async () => {
    const previousDebug = process.env.NEXT_PUBLIC_GA_DEBUG;
    process.env.NEXT_PUBLIC_GA_DEBUG = 'true';
    jest.resetModules();

    const isolatedAnalytics = await import('./analytics');
    const gtag = jest.fn();
    window.gtag = gtag;
    isolatedAnalytics.trackEvent('pricing_viewed');

    expect(gtag.mock.calls[0][2]).toEqual(expect.objectContaining({ debug_mode: true }));

    if (previousDebug === undefined) delete process.env.NEXT_PUBLIC_GA_DEBUG;
    else process.env.NEXT_PUBLIC_GA_DEBUG = previousDebug;
  });

  it('captures genuine GA client/session identifiers only with analytics consent', async () => {
    document.cookie = `mythoria_consent=${encodeURIComponent(
      JSON.stringify({
        state: {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
        timestamp: Date.now(),
      }),
    )}; path=/`;
    window.gtag = jest.fn((...args: unknown[]) => {
      if (args[0] !== 'get') return;
      const callback = args[3] as (value: unknown) => void;
      callback(args[2] === 'client_id' ? '123.456' : '1712345678');
    });

    await expect(getGoogleAnalyticsContext()).resolves.toEqual({
      clientId: '123.456',
      sessionId: 1712345678,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
    });
  });
});
