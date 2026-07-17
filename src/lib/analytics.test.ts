import {
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

describe('canonical analytics event propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as Partial<Window>).gtag;
    window.dataLayer = [];
    document.cookie = 'mythoria_consent=; Max-Age=0; path=/';
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

  it('sets User-ID before emitting login', () => {
    const gtag = jest.fn();
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
      expect.objectContaining({ step_number: 3, story_id: 'story-1' }),
    );
    expect(gtag.mock.calls[0][2]).not.toHaveProperty('step');
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
