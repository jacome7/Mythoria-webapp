/** @jest-environment jsdom */

import { act, fireEvent, render } from '@testing-library/react';
import Link from 'next/link';
import LandingAnalytics from './LandingAnalytics';

const trackEventMock = jest.fn();

jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  getGoogleAnalyticsContext: jest.fn().mockResolvedValue(undefined),
}));

describe('LandingAnalytics', () => {
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    trackEventMock.mockClear();
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

  it('tracks the supportive page view and a safe challenge selection', () => {
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

    expect(trackEventMock).toHaveBeenCalledWith('supportive_story_page_view', {
      landing_slug: 'historias-de-apoio',
      locale: 'pt-PT',
      variant: 'hub-v1',
    });

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

  it('tracks the generic landing page view with low-cardinality romance context', () => {
    render(
      <LandingAnalytics
        landingSlug="livro-personalizado-para-casais"
        primaryIntent="romance"
        locale="pt-PT"
        analytics={{ pageViewEvent: 'landing_page_view', variant: 'romance-v1' }}
      />,
    );

    expect(trackEventMock).toHaveBeenCalledWith('landing_page_view', {
      landing_slug: 'livro-personalizado-para-casais',
      locale: 'pt-PT',
      primary_intent: 'romance',
      variant: 'romance-v1',
    });
  });
});
