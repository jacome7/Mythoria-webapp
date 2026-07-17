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
        <LandingAnalytics landingSlug="kids-fantasy" primaryIntent="create_story" />
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
        <LandingAnalytics landingSlug="kids-fantasy" primaryIntent="create_story" />
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
});
