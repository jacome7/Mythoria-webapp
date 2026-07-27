/** @jest-environment jsdom */

import { act, render } from '@testing-library/react';
import HomepageCampaignAttribution from './HomepageCampaignAttribution';
import { CONSENT_UPDATED_EVENT } from '@/lib/consent';

const getGoogleAnalyticsContextMock = jest.fn();

jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: (...args: unknown[]) => getGoogleAnalyticsContextMock(...args),
}));

describe('HomepageCampaignAttribution', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      '',
      '/pt-PT?intent=romance&utm_source=google&utm_campaign=casais&gclid=click-1&email=private%40example.com',
    );
    getGoogleAnalyticsContextMock.mockResolvedValue({
      clientId: '123.456',
      sessionId: 1712345678,
      primaryIntent: 'romance',
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'granted',
        adPersonalization: 'granted',
      },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ captured: true }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({ linked: true }) });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('captures homepage intent and campaign data once, then links an authenticated visitor', async () => {
    render(<HomepageCampaignAttribution primaryIntent="romance" />);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/analytics/attribution',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          analyticsContext: {
            clientId: '123.456',
            sessionId: 1712345678,
            primaryIntent: 'romance',
            consent: {
              analyticsStorage: 'granted',
              adUserData: 'granted',
              adPersonalization: 'granted',
            },
          },
          landingSlug: 'homepage',
          primaryIntent: 'romance',
          campaign: {
            utm_source: 'google',
            utm_campaign: 'casais',
            gclid: 'click-1',
          },
        }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/analytics/attribution/link',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on same-page consent acceptance without duplicating a successful signature', async () => {
    getGoogleAnalyticsContextMock.mockResolvedValueOnce(undefined).mockResolvedValue({
      clientId: '123.456',
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'denied',
      },
    });
    render(<HomepageCampaignAttribution primaryIntent="romance" />);

    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
      window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
