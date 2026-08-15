import { act, render } from '@testing-library/react';
import { CONSENT_UPDATED_EVENT, getGrantedConsent } from './consent';

const mockTrackEvent = jest.fn();
let mockPathname = '/en-US';
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

jest.mock('./analytics', () => ({
  trackEvent: mockTrackEvent,
}));

import { useGoogleAnalytics } from './useGoogleAnalytics';

function AnalyticsHarness() {
  useGoogleAnalytics();
  return null;
}

describe('useGoogleAnalytics', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockPathname = '/en-US';
    mockSearchParams = new URLSearchParams();
    document.cookie = 'mythoria_consent=; Max-Age=0; path=/';
  });

  it('waits for consent, then sends one page_view per canonical path and ignores query cleanup', () => {
    const { rerender } = render(<AnalyticsHarness />);

    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, {
          detail: {
            state: getGrantedConsent(),
            preferences: { analytics: true, advertising: true },
          },
        }),
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockSearchParams = new URLSearchParams('utm_source=google&gclid=click-1');
    rerender(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockPathname = '/en-US/pricing';
    mockSearchParams = new URLSearchParams(
      'package=starter&token=secret&utm_source=google&utm_campaign=summer',
    );
    rerender(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({
        page_path: '/en-US/pricing',
        page_location: 'http://localhost/en-US/pricing?utm_source=google&utm_campaign=summer',
      }),
    );
  });

  it('retries the current canonical page exactly once when analytics consent becomes granted', () => {
    const { rerender } = render(<AnalyticsHarness />);
    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, {
          detail: {
            state: getGrantedConsent(),
            preferences: { analytics: true, advertising: true },
          },
        }),
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    rerender(<AnalyticsHarness />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockPathname = '/en-US/pricing';
    rerender(<AnalyticsHarness />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('normalizes UUIDs and private share tokens before a manual page view reaches GA4', () => {
    const { rerender } = render(<AnalyticsHarness />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, {
          detail: {
            state: getGrantedConsent(),
            preferences: { analytics: true, advertising: true },
          },
        }),
      );
    });
    mockTrackEvent.mockClear();

    mockPathname = '/en-US/s/00000000-0000-4000-8000-000000000001/edit';
    mockSearchParams = new URLSearchParams('utm_source=copy_link&token=never-send');
    rerender(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({
        page_path: '/en-US/s/:token/edit',
        page_location: 'http://localhost/en-US/s/:token/edit?utm_source=copy_link',
      }),
    );
  });
});
