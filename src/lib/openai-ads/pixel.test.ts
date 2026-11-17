/** @jest-environment jsdom */

import { clearConsent, consentStateFromPreferences, saveConsent } from '@/lib/consent';
import { conversions, type OpenAiConversion } from './events';
import {
  OAIQ_LOADED_EVENT,
  OAIQ_SCRIPT_SRC,
  __resetOpenAiPixelForTests,
  isCredentialPath,
  isOpenAiPixelEnabled,
  loadOpenAiPixel,
  openAiRouteTemplate,
  revokeOpenAiPixelConsent,
  trackOpenAiAdsEvent,
} from './pixel';

const PIXEL_ID = 'test-pixel-id';

function grantConsent(advertising: boolean) {
  const preferences = { analytics: true, advertising };
  saveConsent(consentStateFromPreferences(preferences), preferences);
}

function oaiqCalls(): unknown[][] {
  return (window.oaiq?.q ?? []) as unknown[][];
}

function measureCalls(): unknown[][] {
  return oaiqCalls().filter((call) => call[0] === 'measure');
}

describe('OpenAI Ads pixel helper', () => {
  const originalPixelId = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID;
  const originalDebug = process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID = PIXEL_ID;
    delete process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG;
    __resetOpenAiPixelForTests();
    clearConsent();
    delete window.oaiq;
    delete window.__mythoriaOaiqLoaded;
    document.querySelectorAll('script[src]').forEach((script) => script.remove());
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID = originalPixelId;
    process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG = originalDebug;
  });

  it('is disabled without a pixel id', () => {
    delete process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID;
    grantConsent(true);
    expect(isOpenAiPixelEnabled()).toBe(false);
    trackOpenAiAdsEvent(conversions.storyLead('run-1'));
    expect(window.oaiq).toBeUndefined();
    expect(document.querySelector(`script[src="${OAIQ_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('is disabled without advertising consent', () => {
    expect(isOpenAiPixelEnabled()).toBe(false);
    trackOpenAiAdsEvent(conversions.storyLead('run-1'));
    expect(window.oaiq).toBeUndefined();

    grantConsent(false);
    expect(isOpenAiPixelEnabled()).toBe(false);
    trackOpenAiAdsEvent(conversions.storyLead('run-1'));
    expect(window.oaiq).toBeUndefined();
    expect(document.querySelector(`script[src="${OAIQ_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('bootstraps consent, init and the SDK script before the first event', () => {
    process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG = 'true';
    grantConsent(true);
    expect(isOpenAiPixelEnabled()).toBe(true);

    trackOpenAiAdsEvent(conversions.storyLead('run-1'));

    expect(oaiqCalls()).toEqual([
      ['consent', true],
      ['init', { pixelId: PIXEL_ID, debug: true }],
      ['measure', 'lead_created', { type: 'customer_action' }, { event_id: 'story_run-1' }],
    ]);
    const script = document.querySelector<HTMLScriptElement>(`script[src="${OAIQ_SCRIPT_SRC}"]`);
    expect(script?.async).toBe(true);

    const loaded = jest.fn();
    window.addEventListener(OAIQ_LOADED_EVENT, loaded);
    script?.dispatchEvent(new Event('load'));
    window.removeEventListener(OAIQ_LOADED_EVENT, loaded);
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(window.__mythoriaOaiqLoaded).toBe(true);

    loadOpenAiPixel();
    expect(document.querySelectorAll(`script[src="${OAIQ_SCRIPT_SRC}"]`)).toHaveLength(1);
    expect(oaiqCalls().filter((call) => call[0] === 'init')).toHaveLength(1);
  });

  it('sends custom events with custom_event_name and passes event_id through', () => {
    grantConsent(true);
    trackOpenAiAdsEvent(conversions.audiobookRequested('run-9'));

    expect(measureCalls()).toEqual([
      [
        'measure',
        'custom',
        {
          type: 'custom',
          contents: [
            {
              id: 'audiobook_generation',
              name: 'Audiobook generation',
              content_type: 'service',
              quantity: 1,
            },
          ],
        },
        { event_id: 'audiobook_run-9', custom_event_name: 'audiobook_requested' },
      ],
    ]);
  });

  it('strips Conversions API-only content fields', () => {
    grantConsent(true);
    const conversion: OpenAiConversion = {
      eventType: 'order_created',
      eventId: 'order_o-1',
      data: {
        type: 'contents',
        amount: 499,
        currency: 'EUR',
        contents: [
          {
            id: 'pack-10',
            name: '10 credits',
            content_type: 'product',
            quantity: 1,
            amount: 499,
            currency: 'EUR',
            group_id: 'credits',
            variant_dict: { size: '10' },
          },
        ],
      },
    };
    trackOpenAiAdsEvent(conversion);

    const [, , data, options] = measureCalls()[0];
    expect(options).toEqual({ event_id: 'order_o-1' });
    expect(data).toEqual({
      type: 'contents',
      amount: 499,
      currency: 'EUR',
      contents: [
        {
          id: 'pack-10',
          name: '10 credits',
          content_type: 'product',
          quantity: 1,
          amount: 499,
          currency: 'EUR',
        },
      ],
    });
  });

  it('drops invalid conversions with a development warning', () => {
    grantConsent(true);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    trackOpenAiAdsEvent({
      eventType: 'order_created',
      eventId: 'order_o-2',
      data: { type: 'contents', amount: 4.99, currency: 'EUR' },
    });
    trackOpenAiAdsEvent({
      eventType: 'custom',
      eventId: 'x',
      data: { type: 'custom' },
    } as OpenAiConversion);

    expect(measureCalls()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('sends nothing from pages whose URL carries a share or survey token', () => {
    grantConsent(true);
    const original = window.location.pathname;
    try {
      window.history.replaceState(null, '', '/pt-PT/s/3f2a9c1e-private-token/edit');
      trackOpenAiAdsEvent(conversions.pageViewed('/s/:token'));
      window.history.replaceState(null, '', '/en-US/survey/invitation-token');
      trackOpenAiAdsEvent(conversions.pageViewed('/survey/:token'));
      expect(measureCalls()).toHaveLength(0);

      window.history.replaceState(null, '', '/en-US/my-stories');
      trackOpenAiAdsEvent(conversions.pageViewed('/my-stories'));
      expect(measureCalls()).toHaveLength(1);
    } finally {
      window.history.replaceState(null, '', original);
    }
  });

  it('recognises credential paths with or without a locale prefix', () => {
    expect(isCredentialPath('/s/token')).toBe(true);
    expect(isCredentialPath('/de-DE/s/token/edit')).toBe(true);
    expect(isCredentialPath('/fr-FR/survey/token')).toBe(true);
    expect(isCredentialPath('/survey/reward/entitlement-id')).toBe(false);
    expect(isCredentialPath('/en-US/p/a-public-story')).toBe(false);
    expect(isCredentialPath('/en-US/stories/read/abc')).toBe(false);
    expect(isCredentialPath('/s')).toBe(false);
  });

  it('never throws when the queue fails', () => {
    grantConsent(true);
    window.oaiq = Object.assign(
      () => {
        throw new Error('blocked');
      },
      { q: [] },
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => trackOpenAiAdsEvent(conversions.storyLead('run-1'))).not.toThrow();
    warn.mockRestore();
  });

  it('re-grants consent after a revocation without re-initialising', () => {
    grantConsent(true);
    loadOpenAiPixel();
    revokeOpenAiPixelConsent();
    loadOpenAiPixel();
    expect(oaiqCalls()).toEqual([
      ['consent', true],
      ['init', { pixelId: PIXEL_ID }],
      ['consent', false],
      ['consent', true],
    ]);
  });
});

describe('openAiRouteTemplate', () => {
  it.each([
    ['/', '/'],
    ['', '/'],
    ['/pt-PT', '/'],
    ['/en-US/', '/'],
    ['/en-US/buy-credits?session_id=cs_123#top', '/buy-credits'],
    ['/de-DE/stories/read/0b8c7e1e-1f2a-4c3d-9e8f-0a1b2c3d4e5f', '/stories/read/:id'],
    [
      '/fr-FR/stories/read/0b8c7e1e-1f2a-4c3d-9e8f-0a1b2c3d4e5f/chapter/3',
      '/stories/read/:id/chapter/3',
    ],
    ['/pt-PT/s/0b8c7e1e-1f2a-4c3d-9e8f-0a1b2c3d4e5f', '/s/:token'],
    ['/pt-PT/s/abc/edit', '/s/:token'],
    ['/en-US/p/the-dragon-of-maria-silva', '/p/:slug'],
    ['/en-US/p/the-dragon-of-maria-silva/chapter/2', '/p/:slug/chapter/2'],
    ['/en-US/survey/aB3dE5fG7hJ9kL1mN3pQ', '/survey/:token'],
    ['/en-US/survey/reward/0b8c7e1e-1f2a-4c3d-9e8f-0a1b2c3d4e5f', '/survey/reward/:id'],
    ['/en-US/blog/how-to-write-a-bedtime-story', '/blog/how-to-write-a-bedtime-story'],
    ['/en-US/orders/user_2abcDEF123ghiJKL456', '/orders/:token'],
    ['/en-US/x/0123456789abcdef0123', '/x/:token'],
    ['/en-US/x/12345678', '/x/:id'],
    ['/es-ES/tell-your-story/step-2', '/tell-your-story/step-2'],
  ])('%s -> %s', (pathname, expected) => {
    expect(openAiRouteTemplate(pathname)).toBe(expected);
  });
});
