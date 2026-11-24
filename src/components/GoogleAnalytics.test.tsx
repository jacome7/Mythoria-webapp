import { act, render } from '@testing-library/react';
import {
  clearConsent,
  consentStateFromPreferences,
  saveConsent,
  updateGoogleConsent,
} from '@/lib/consent';
import GoogleAnalytics from './GoogleAnalytics';

let mockPathname = '/en-US';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

function setConsent(analytics: boolean) {
  const preferences = { analytics, advertising: false };
  const state = consentStateFromPreferences(preferences);
  saveConsent(state, preferences);
  act(() => updateGoogleConsent(state));
}

describe('Google Analytics audit bootstrap', () => {
  const tag = () => document.getElementById('mythoria-audit-google-tag');
  beforeEach(() => {
    mockPathname = '/en-US';
    window.history.replaceState(null, '', mockPathname);
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN = window.location.origin;
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID = 'G-TEST123';
    window.gtag = jest.fn();
    clearConsent();
  });
  afterEach(() => {
    tag()?.remove();
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN;
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID;
    clearConsent();
  });

  it('leaves a private fragment available to the product and leaves the SDK off', () => {
    mockPathname = '/en-US/biographer/invite';
    window.history.replaceState(null, '', mockPathname + '#private-sentinel');
    setConsent(true);
    render(<GoogleAnalytics />);
    expect(window.location.hash).toBe('#private-sentinel');
    expect(tag()).toBeNull();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('loads only the isolated audit stream on an eligible route after consent', () => {
    render(<GoogleAnalytics />);
    expect(tag()).toBeNull();
    setConsent(true);
    expect(tag()).toHaveAttribute('src', expect.stringContaining('gtag/js?id=G-TEST123'));
    expect(tag()).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(window.gtag).toHaveBeenCalledWith(
      'config',
      'G-TEST123',
      expect.objectContaining({
        send_page_view: false,
        page_title: 'Mythoria',
        page_referrer: '',
        allow_google_signals: false,
      }),
    );
    expect(window.gtag).toHaveBeenCalledWith('set', 'url_passthrough', false);
  });

  it('sets the SDK opt-out before further measurements on a sensitive SPA route', () => {
    setConsent(true);
    const { rerender } = render(<GoogleAnalytics />);
    const flags = window as unknown as Record<string, unknown>;
    expect(flags['ga-disable-G-TEST123']).toBe(false);

    mockPathname = '/en-US/sign-in';
    window.history.pushState(null, '', mockPathname + '?return=%2Fen-US%2Fs%2Fprivate-sentinel');
    rerender(<GoogleAnalytics />);
    expect(flags['ga-disable-G-TEST123']).toBe(true);
    expect(JSON.stringify(jest.mocked(window.gtag).mock.calls)).not.toContain('private-sentinel');
  });

  it('never connects an audit browser to the production stream', () => {
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID = 'G-86D0QFW197';
    setConsent(true);
    render(<GoogleAnalytics />);
    expect(tag()).toBeNull();
  });
});
