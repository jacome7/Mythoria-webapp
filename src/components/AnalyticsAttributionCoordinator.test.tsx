import { act, render, waitFor } from '@testing-library/react';
import {
  clearConsent,
  consentStateFromPreferences,
  saveConsent,
  updateGoogleConsent,
} from '@/lib/consent';

const mockCapture = jest.fn().mockResolvedValue(true);
const mockReceiptClear = jest.fn();
const mockGetContext = jest.fn().mockResolvedValue(undefined);
const mockClearContext = jest.fn();
let mockPathname = '/en-US';
let mockUser: { id: string } | null = null;

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: Boolean(mockUser), user: mockUser }),
}));
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/lib/analytics/receipt-client', () => ({
  captureAnalyticsAttribution: (...params: unknown[]) => mockCapture(...params),
  clearAnalyticsAttributionReceipt: () => mockReceiptClear(),
}));
jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: (...params: unknown[]) => mockGetContext(...params),
  clearGoogleAnalyticsContextCache: () => mockClearContext(),
}));

import AnalyticsAttributionCoordinator from './AnalyticsAttributionCoordinator';

function setConsent(analytics: boolean) {
  const preferences = { analytics, advertising: false };
  const state = consentStateFromPreferences(preferences);
  saveConsent(state, preferences);
  act(() => updateGoogleConsent(state));
}

describe('AnalyticsAttributionCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockPathname = '/en-US';
    window.history.replaceState(null, '', mockPathname);
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ linked: true }),
    }));
    clearConsent();
  });

  afterEach(() => clearConsent());

  it('uses a first-party receipt even when GA context is unavailable', async () => {
    setConsent(true);
    render(<AnalyticsAttributionCoordinator />);
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith({
        analyticsContext: undefined,
        landingPath: '/en-US',
        campaign: {},
      }),
    );
  });

  it('does not observe or replay prior campaign clicks or navigation on a late grant', async () => {
    window.history.replaceState(null, '', '/en-US?utm_source=google&gclid=private-sentinel');
    render(<AnalyticsAttributionCoordinator />);
    expect(mockCapture).not.toHaveBeenCalled();
    setConsent(true);
    await waitFor(() => expect(mockCapture).toHaveBeenCalledTimes(1));
    const [payload] = mockCapture.mock.calls[0];
    expect(payload.campaign).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('private-sentinel');
  });

  it('clears cached identity and optional receipt state on revocation', async () => {
    setConsent(true);
    render(<AnalyticsAttributionCoordinator />);
    await waitFor(() => expect(mockCapture).toHaveBeenCalledTimes(1));
    setConsent(false);
    expect(mockReceiptClear).toHaveBeenCalledTimes(1);
    expect(mockClearContext).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/attribution/revoke',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('links the first-party receipt to the signed-in author once', async () => {
    mockUser = { id: 'synthetic-clerk-identity' };
    setConsent(true);
    const { rerender } = render(<AnalyticsAttributionCoordinator />);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/analytics/attribution/link', {
        method: 'POST',
        keepalive: true,
      }),
    );
    rerender(<AnalyticsAttributionCoordinator />);
    const links = jest
      .mocked(fetch)
      .mock.calls.filter(([url]) => url === '/api/analytics/attribution/link');
    expect(links).toHaveLength(1);
    expect(JSON.stringify(links)).not.toContain('synthetic-clerk-identity');
  });
});
