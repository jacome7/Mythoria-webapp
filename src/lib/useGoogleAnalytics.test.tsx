import { render } from '@testing-library/react';

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
  });

  it('sends one page_view per canonical path and ignores query-only cleanup', () => {
    const { rerender } = render(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({ page_path: '/en-US' }),
    );

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
});
