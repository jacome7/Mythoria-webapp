import { act, render } from '@testing-library/react';

const mockLogin = jest.fn();
const mockSetUserId = jest.fn();
const mockSetUserProperties = jest.fn();
const mockClearUserAnalyticsContext = jest.fn();

interface MockClerkUser {
  id: string;
  externalAccounts: Array<{ provider: string }>;
  primaryEmailAddress: { verification: { status: string } };
  firstName: string | null;
  lastName: string | null;
}

let mockUseUserValue: {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: MockClerkUser | null;
};

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUserValue,
}));

jest.mock('../lib/analytics', () => ({
  trackAuth: { login: (...args: unknown[]) => mockLogin(...args) },
  setUserId: (...args: unknown[]) => mockSetUserId(...args),
  setUserProperties: (...args: unknown[]) => mockSetUserProperties(...args),
  clearUserAnalyticsContext: (...args: unknown[]) => mockClearUserAnalyticsContext(...args),
}));

import { CONSENT_UPDATED_EVENT, getGrantedConsent } from '../lib/consent';
import { normalizeAuthMethod, useAuthTracking } from './useAuthTracking';

const signedInUser: MockClerkUser = {
  id: 'user-1',
  externalAccounts: [{ provider: 'oauth_google' }],
  primaryEmailAddress: { verification: { status: 'verified' } },
  firstName: 'Ana',
  lastName: 'Silva',
};

function AuthHarness() {
  useAuthTracking();
  return null;
}

describe('authentication analytics helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null };
  });

  it.each([
    ['oauth_google', 'google'],
    ['oauth_facebook', 'facebook'],
    ['saml_okta', 'okta'],
    [undefined, 'email'],
  ])('normalizes provider %s to stable method %s', (provider, expected) => {
    expect(normalizeAuthMethod(provider)).toBe(expected);
  });

  it('treats an initially signed-in Clerk state as hydration, not a fresh login', () => {
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: signedInUser };
    render(<AuthHarness />);

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockSetUserId).toHaveBeenCalledWith('user-1');
    expect(mockSetUserProperties).toHaveBeenCalledWith({
      email_verified: true,
      profile_complete: true,
    });
    expect(mockSetUserProperties.mock.calls[0][0]).not.toHaveProperty('signup_date');
  });

  it('emits login exactly once for a real signed-out to signed-in transition', () => {
    const { rerender } = render(<AuthHarness />);
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: signedInUser };
    rerender(<AuthHarness />);
    rerender(<AuthHarness />);

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith({ user_id: 'user-1', method: 'google' });
  });

  it('clears identity on consent withdrawal and restores it after analytics grant', () => {
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: signedInUser };
    render(<AuthHarness />);
    jest.clearAllMocks();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_UPDATED_EVENT, {
          detail: {
            state: {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            },
            preferences: { analytics: false, advertising: false },
          },
        }),
      );
    });
    expect(mockClearUserAnalyticsContext).toHaveBeenCalledTimes(1);

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
    expect(mockSetUserId).toHaveBeenCalledWith('user-1');
  });
});
