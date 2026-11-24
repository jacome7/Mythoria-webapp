import { act, render } from '@testing-library/react';
import { CONSENT_UPDATED_EVENT, clearConsent, getGrantedConsent, saveConsent } from './consent';
import { ANALYTICS_TAG_READY_EVENT } from './analytics/destinations';

const mockTrackEvent = jest.fn().mockReturnValue(true);
let mockPathname = '/en-US';

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('./analytics', () => ({ trackEvent: mockTrackEvent }));

import { useGoogleAnalytics } from './useGoogleAnalytics';

function AnalyticsHarness() {
  useGoogleAnalytics();
  return null;
}

describe('useGoogleAnalytics', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockPathname = '/en-US';
    window.history.replaceState(null, '', mockPathname);
    clearConsent();
  });

  it('starts observations at grant time and emits each new visible page once', () => {
    const { rerender } = render(<AnalyticsHarness />);
    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent(getGrantedConsent());
      window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT));
    });
    expect(mockTrackEvent.mock.calls).toEqual([['page_view']]);
    rerender(<AnalyticsHarness />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockPathname = '/en-US/pricing';
    window.history.pushState(null, '', mockPathname);
    rerender(<AnalyticsHarness />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('omits manual page views on credential-bearing reader routes', () => {
    saveConsent(getGrantedConsent());
    mockPathname = '/en-US/s/private-token/edit';
    window.history.replaceState(null, '', mockPathname + '?token=private-query');
    render(<AnalyticsHarness />);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('retries a page view when consent preceded tag initialization', () => {
    saveConsent(getGrantedConsent());
    mockTrackEvent.mockReturnValueOnce(false);
    render(<AnalyticsHarness />);
    act(() => {
      window.dispatchEvent(new Event(ANALYTICS_TAG_READY_EVENT));
      window.dispatchEvent(new Event(ANALYTICS_TAG_READY_EVENT));
    });
    expect(mockTrackEvent.mock.calls).toEqual([['page_view'], ['page_view']]);
  });
});
