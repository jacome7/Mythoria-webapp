/** @jest-environment jsdom */

import { StrictMode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import Link from 'next/link';
import LandingAnalytics, { resetLandingAnalyticsDedupeForTests } from './LandingAnalytics';
import { CONSENT_UPDATED_EVENT } from '@/lib/consent';

const trackEventMock = jest.fn();
const getGoogleAnalyticsContextMock = jest.fn();
let consentStatus: 'granted' | 'denied' | null;

jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  getGoogleAnalyticsContext: (...args: unknown[]) => getGoogleAnalyticsContextMock(...args),
}));

jest.mock('@/lib/consent', () => ({
  CONSENT_UPDATED_EVENT: 'mythoria:consent-updated',
  getStoredConsent: () =>
    consentStatus
      ? {
          state: {
            analytics_storage: consentStatus,
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          },
        }
      : null,
}));

describe('LandingAnalytics', () => {
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    trackEventMock.mockClear();
    getGoogleAnalyticsContextMock.mockReset().mockResolvedValue({ sessionId: 1001 });
    consentStatus = 'granted';
    resetLandingAnalyticsDedupeForTests();
    window.history.replaceState({}, '', '/en-US/lp/kids-fantasy');
    global.IntersectionObserver = jest.fn((callback: IntersectionObserverCallback) => {
      intersectionCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        root: null,
        rootMargin: '',
        thresholds: [0.5],
        takeRecords: jest.fn().mockReturnValue([]),
      };
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('tracks a section once after 50% visibility for one second', () => {
    const { getByTestId } = render(
      <>
        <section data-testid="section" data-analytics-section="hero" data-section-position="1" />
        <LandingAnalytics landingSlug="kids-fantasy" primaryIntent="create_story" locale="en-US" />
      </>,
    );
    const section = getByTestId('section');
    const entry = {
      target: section,
      isIntersecting: true,
      intersectionRatio: 0.5,
    } as unknown as IntersectionObserverEntry;

    act(() => intersectionCallback([entry], {} as IntersectionObserver));
    act(() => jest.advanceTimersByTime(999));
    expect(trackEventMock).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(trackEventMock).toHaveBeenCalledWith('landing_section_view', {
      landing_slug: 'kids-fantasy',
      primary_intent: 'create_story',
      section_id: 'hero',
      section_position: 1,
    });

    act(() => intersectionCallback([entry], {} as IntersectionObserver));
    act(() => jest.advanceTimersByTime(1000));
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it('tracks canonical CTA placement without its query string', () => {
    const { getByRole } = render(
      <>
        <Link href="/en-US/sign-up?token=secret" data-cta-placement="hero_primary">
          Start
        </Link>
        <LandingAnalytics landingSlug="kids-fantasy" primaryIntent="create_story" locale="en-US" />
      </>,
    );

    fireEvent.click(getByRole('link', { name: 'Start' }));
    expect(trackEventMock).toHaveBeenCalledWith('landing_cta_click', {
      landing_slug: 'kids-fantasy',
      primary_intent: 'create_story',
      cta_placement: 'hero_primary',
      cta_destination: '/en-US/sign-up',
    });
  });

  it('tracks the supportive page view and a safe challenge selection', async () => {
    const { getByRole } = render(
      <>
        <Link
          href="/pt-PT/tell-your-story/step-1?landingSlug=historias-de-apoio&primaryIntent=remembrance"
          data-cta-placement="challenge_card"
          data-challenge-id="remember-pet"
          data-route-tone="remember-and-say-goodbye"
          data-primary-intent="remembrance"
        >
          Recordar um animal
        </Link>
        <LandingAnalytics
          landingSlug="historias-de-apoio"
          primaryIntent="kids_transitions"
          locale="pt-PT"
          analytics={{ pageViewEvent: 'supportive_story_page_view', variant: 'hub-v1' }}
        />
      </>,
    );

    await waitFor(() =>
      expect(trackEventMock).toHaveBeenCalledWith('supportive_story_page_view', {
        landing_slug: 'historias-de-apoio',
        locale: 'pt-PT',
        variant: 'hub-v1',
      }),
    );

    fireEvent.click(getByRole('link', { name: 'Recordar um animal' }));

    expect(trackEventMock).toHaveBeenCalledWith('challenge_selected', {
      landing_slug: 'historias-de-apoio',
      challenge_id: 'remember-pet',
      route_tone: 'remember-and-say-goodbye',
      locale: 'pt-PT',
      variant: 'hub-v1',
    });
    expect(trackEventMock).toHaveBeenCalledWith('landing_cta_click', {
      landing_slug: 'historias-de-apoio',
      primary_intent: 'remembrance',
      cta_placement: 'challenge_card',
      cta_destination: '/pt-PT/tell-your-story/step-1',
    });
  });

  it('tracks the generic landing page view immediately when consent is granted', async () => {
    render(
      <LandingAnalytics
        landingSlug="livro-personalizado-para-casais"
        primaryIntent="romance"
        locale="pt-PT"
        analytics={{ pageViewEvent: 'landing_page_view', variant: 'romance-v1' }}
      />,
    );

    await waitFor(() =>
      expect(trackEventMock).toHaveBeenCalledWith('landing_page_view', {
        landing_slug: 'livro-personalizado-para-casais',
        locale: 'pt-PT',
        primary_intent: 'romance',
        variant: 'romance-v1',
      }),
    );
  });

  it.each([null, 'denied'] as const)(
    'replays once when %s consent is later granted',
    async (initialConsent) => {
      consentStatus = initialConsent;
      render(
        <LandingAnalytics
          landingSlug="grandparents"
          primaryIntent="grandparents"
          locale="en-US"
          analytics={{ pageViewEvent: 'landing_page_view', variant: 'grandparents-v1' }}
        />,
      );
      expect(trackEventMock).not.toHaveBeenCalledWith('landing_page_view', expect.anything());

      consentStatus = 'granted';
      act(() => {
        window.dispatchEvent(
          new CustomEvent(CONSENT_UPDATED_EVENT, {
            detail: {
              state: { analytics_storage: 'granted' },
              preferences: { analytics: true, advertising: false },
            },
          }),
        );
      });

      await waitFor(() =>
        expect(trackEventMock).toHaveBeenCalledWith(
          'landing_page_view',
          expect.objectContaining({ landing_slug: 'grandparents' }),
        ),
      );
      expect(
        trackEventMock.mock.calls.filter(([eventName]) => eventName === 'landing_page_view'),
      ).toHaveLength(1);
    },
  );

  it('suppresses Strict Mode, rerender, and same-session duplicates', async () => {
    const view = (
      <StrictMode>
        <LandingAnalytics
          landingSlug="kids-fantasy"
          primaryIntent="kids_adventures"
          locale="en-US"
          analytics={{ pageViewEvent: 'landing_page_view', variant: 'v1' }}
        />
      </StrictMode>
    );
    const { rerender } = render(view);
    await waitFor(() => expect(trackEventMock).toHaveBeenCalled());
    rerender(view);
    await act(async () => Promise.resolve());
    expect(
      trackEventMock.mock.calls.filter(([eventName]) => eventName === 'landing_page_view'),
    ).toHaveLength(1);
  });

  it('permits SPA navigation and a genuinely new GA4 session', async () => {
    const props = {
      landingSlug: 'kids-fantasy',
      primaryIntent: 'kids_adventures',
      locale: 'en-US',
      analytics: { pageViewEvent: 'landing_page_view' as const, variant: 'v1' },
    };
    const { rerender } = render(<LandingAnalytics {...props} />);
    await waitFor(() => expect(trackEventMock).toHaveBeenCalled());

    window.history.pushState({}, '', '/en-US/lp/another-landing');
    rerender(<LandingAnalytics {...props} landingSlug="another-landing" />);
    await waitFor(() =>
      expect(
        trackEventMock.mock.calls.filter(([eventName]) => eventName === 'landing_page_view'),
      ).toHaveLength(2),
    );

    getGoogleAnalyticsContextMock.mockResolvedValue({ sessionId: 2002 });
    act(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, {
          detail: { state: { analytics_storage: 'granted' } },
        }),
      );
    });
    await waitFor(() =>
      expect(
        trackEventMock.mock.calls.filter(([eventName]) => eventName === 'landing_page_view'),
      ).toHaveLength(3),
    );
  });
});
