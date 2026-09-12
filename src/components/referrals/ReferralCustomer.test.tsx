import { act, cleanup, render, waitFor } from '@testing-library/react';
import ReferralCustomer from './ReferralCustomer';

let mockConsented = false;
jest.mock('@clerk/nextjs', () => ({ useUser: () => ({ isSignedIn: false }) }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('@/lib/consent', () => ({
  CONSENT_UPDATED_EVENT: 'test-consent-updated',
  getStoredConsent: () => ({ preferences: { referrals: mockConsented } }),
  saveConsent: jest.fn(),
  updateGoogleConsent: jest.fn(),
  consentStateFromPreferences: jest.fn(),
}));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  mockConsented = false;
  mockFetch.mockReset().mockResolvedValue({ ok: true });
  global.fetch = mockFetch;
  window.history.replaceState({}, '', '/en-US?referral=RODRI');
});
afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

it('shows no panel and performs no capture before consent', () => {
  const { container } = render(<ReferralCustomer captureOnly />);
  expect(container).toBeEmptyDOMElement();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(window.location.search).toBe('');
});

it('captures quietly when referral consent is granted later', async () => {
  const { container } = render(<ReferralCustomer captureOnly />);
  act(() => {
    mockConsented = true;
    window.dispatchEvent(new Event('test-consent-updated'));
  });
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/referrals/capture',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('RODRI') }),
    ),
  );
  expect(container).toBeEmptyDOMElement();
});

it('captures quietly when consent already exists', async () => {
  mockConsented = true;
  const { container } = render(<ReferralCustomer captureOnly />);
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
