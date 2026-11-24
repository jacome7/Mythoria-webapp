import {
  clearGoogleAnalyticsContextCache,
  getGoogleAnalyticsContext,
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
    window.history.replaceState(null, '', '/en-US');
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN = window.location.origin;
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID = 'G-TEST123';
    const tag = document.createElement('script');
    tag.id = 'mythoria-audit-google-tag';
    document.head.append(tag);
    grantAnalyticsConsent();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN;
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID;
    document.getElementById('mythoria-audit-google-tag')?.remove();
  });

  it('does not queue diagnostic events before consent or on private navigation', () => {
    window.gtag = jest.fn();
    document.cookie = 'mythoria_consent=; Max-Age=0; path=/';
    expect(trackEvent('landing_cta_click', { cta_placement: 'hero' })).toBe(false);
    grantAnalyticsConsent();
    window.history.replaceState(null, '', '/en-US/s/private-sentinel/edit');
    expect(trackEvent('landing_cta_click')).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('uses only a fixed page envelope and bounded parameters in the isolated stream', () => {
    window.gtag = jest.fn();
    document.title = 'private-title-sentinel';
    trackEvent('landing_cta_click', {
      cta_placement: 'hero',
      cta_destination: '/en-US/s/private-sentinel',
      page_title: 'private-title-sentinel',
      page_referrer: 'private-referrer-sentinel',
      gclid: 'private-click-sentinel',
    });
    expect(window.gtag).toHaveBeenCalledWith('event', 'landing_cta_click', {
      cta_placement: 'hero',
      page_title: 'Mythoria',
      page_location: window.location.origin + '/en-US',
      page_referrer: '',
      send_to: 'G-TEST123',
    });
  });

  it('emits a login without setting or attaching a Clerk ID', () => {
    window.gtag = jest.fn();
    trackAuth.login({ user_id: 'clerk-synthetic-sentinel', method: 'google' });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'login',
      expect.objectContaining({ method: 'google' }),
    );
    expect(JSON.stringify(jest.mocked(window.gtag).mock.calls)).not.toContain(
      'clerk-synthetic-sentinel',
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
      expect.objectContaining({
        currency: 'EUR',
        value: 38,
        items: [
          expect.objectContaining({
            item_id: 'credit_package_starter',
            item_name: 'Credits package',
          }),
        ],
      }),
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
      pageLocation: window.location.origin + '/en-US',
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
