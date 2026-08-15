import {
  clearGoogleAnalyticsContextCache,
  clearUserAnalyticsContext,
  getGoogleAnalyticsContext,
  setUserId,
  setUserProperties,
  trackAuth,
  trackCommerce,
  trackEvent,
  trackStoryCreation,
} from './analytics';
import type { GA4CheckoutPayload } from './analytics/ecommerce';

const checkout: GA4CheckoutPayload = {
  currency: 'EUR',
  value: 38,
  credits_purchased: 400,
  items: [
    {
      item_id: 'credit_package_starter',
      item_name: '100 Mythoria Credits',
      item_brand: 'Mythoria',
      item_category: 'Credits',
      item_variant: 'starter',
      price: 10,
      quantity: 2,
    },
  ],
};

function grantAnalyticsConsent(): void {
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
}

describe('canonical analytics event propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as Partial<Window>).gtag;
    window.dataLayer = [];
    document.cookie = 'mythoria_consent=; Max-Age=0; path=/';
    document.cookie = 'mythoria_intent_context=; Max-Age=0; path=/';
    clearGoogleAnalyticsContextCache();
  });

  it('queues only the supplied canonical parameters', () => {
    trackEvent('landing_cta_click', { cta_placement: 'hero_primary' });
    expect(window.dataLayer[0]).toEqual([
      'event',
      'landing_cta_click',
      expect.objectContaining({
        cta_placement: 'hero_primary',
        send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197',
      }),
    ]);
    const queued = window.dataLayer[0] as unknown[];
    expect(queued[2]).not.toHaveProperty('timestamp');
    expect(queued[2]).not.toHaveProperty('page_location');
    expect(queued[2]).not.toHaveProperty('page_title');
  });

  it('adds only a validated low-cardinality intent to browser events', () => {
    document.cookie = `mythoria_intent_context=${encodeURIComponent(
      JSON.stringify({ intent: 'romance' }),
    )}; path=/`;
    trackEvent('page_view', { page_type: 'homepage' });
    expect(window.dataLayer[0]).toEqual([
      'event',
      'page_view',
      expect.objectContaining({
        page_type: 'homepage',
        primary_intent: 'romance',
      }),
    ]);

    window.dataLayer = [];
    document.cookie = `mythoria_intent_context=${encodeURIComponent(
      JSON.stringify({ intent: 'not-real' }),
    )}; path=/`;
    trackEvent('story_creation_started', {});
    expect((window.dataLayer[0] as unknown[])[2]).not.toHaveProperty('primary_intent');
  });

  it('sets User-ID before emitting login', () => {
    const gtag = jest.fn();
    grantAnalyticsConsent();
    window.gtag = gtag;
    trackAuth.login({ user_id: 'user_clerk_1', method: 'google' });
    expect(gtag).toHaveBeenNthCalledWith(1, 'set', { user_id: 'user_clerk_1' });
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      'event',
      'login',
      expect.objectContaining({ method: 'google' }),
    );
  });

  it('gates User-ID and user properties until analytics consent is granted', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    setUserId('user_clerk_1');
    setUserProperties({ profile_complete: true });
    expect(gtag).not.toHaveBeenCalled();

    grantAnalyticsConsent();
    setUserId('user_clerk_1');
    setUserProperties({ profile_complete: true });
    expect(gtag).toHaveBeenNthCalledWith(1, 'set', { user_id: 'user_clerk_1' });
    expect(gtag).toHaveBeenNthCalledWith(2, 'set', 'user_properties', {
      profile_complete: true,
    });

    clearUserAnalyticsContext();
    expect(gtag).toHaveBeenNthCalledWith(3, 'set', { user_id: null });
    expect(gtag).toHaveBeenNthCalledWith(
      4,
      'set',
      'user_properties',
      expect.objectContaining({ profile_complete: null }),
    );
  });

  it('emits one standard begin_checkout event', () => {
    const gtag = jest.fn();
    window.gtag = gtag;
    trackCommerce.checkoutStarted(checkout);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'begin_checkout',
      expect.objectContaining({ currency: 'EUR', value: 38, items: checkout.items }),
    );
  });

  it('uses unified story step events with step_number', () => {
    const gtag = jest.fn();
    window.gtag = gtag;
    trackStoryCreation.stepCompleted({ step: 3, story_id: 'story-1' });
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'story_step_completed',
      expect.objectContaining({ step_number: 3 }),
    );
    expect(gtag.mock.calls[0][2]).not.toHaveProperty('step');
    expect(gtag.mock.calls[0][2]).not.toHaveProperty('story_id');
  });

  it('captures genuine GA identifiers only with analytics consent', async () => {
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
    document.cookie = `mythoria_intent_context=${encodeURIComponent(
      JSON.stringify({ intent: 'grandparents' }),
    )}; path=/`;
    window.gtag = jest.fn((...args: unknown[]) => {
      if (args[0] !== 'get') return;
      const callback = args[3] as (value: unknown) => void;
      callback(args[2] === 'client_id' ? '123.456' : '1712345678');
    });

    await expect(getGoogleAnalyticsContext()).resolves.toEqual({
      clientId: '123.456',
      sessionId: 1712345678,
      primaryIntent: 'grandparents',
      pageLocation: 'http://localhost/',
      engagementTimeMsec: 100,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
    });
  });

  it('retries for more than one second while Google Tag initializes', async () => {
    jest.useFakeTimers();
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
    let clientAttempts = 0;
    window.gtag = jest.fn((...args: unknown[]) => {
      if (args[0] !== 'get') return;
      const field = args[2];
      const callback = args[3] as (value: unknown) => void;
      if (field === 'client_id') clientAttempts += 1;
      callback(clientAttempts >= 5 ? (field === 'client_id' ? '987.654' : 1712345000) : undefined);
    });

    const context = getGoogleAnalyticsContext({ timeoutMs: 5_000 });
    await jest.advanceTimersByTimeAsync(3_000);
    await expect(context).resolves.toMatchObject({ clientId: '987.654' });
    expect(clientAttempts).toBeGreaterThanOrEqual(5);
    jest.useRealTimers();
  });

  it('shares one context resolution between concurrent callers', async () => {
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
      callback(args[2] === 'client_id' ? '123.456' : 1712345678);
    });

    const [left, right] = await Promise.all([
      getGoogleAnalyticsContext(),
      getGoogleAnalyticsContext(),
    ]);
    expect(left).toEqual(right);
    expect(window.gtag).toHaveBeenCalledTimes(2);
  });
});
