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

  it('sends one manual page_view for initial render and one per SPA URL change', () => {
    const { rerender } = render(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({ page_path: '/en-US' }),
    );

    mockPathname = '/en-US/pricing';
    mockSearchParams = new URLSearchParams('package=starter');
    rerender(<AnalyticsHarness />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({ page_path: '/en-US/pricing?package=starter' }),
    );
  });
});
