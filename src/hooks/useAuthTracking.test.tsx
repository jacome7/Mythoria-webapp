import { render } from '@testing-library/react';

const mockLogin = jest.fn();
const signedInUser = {
  id: 'synthetic-clerk-account',
  externalAccounts: [{ provider: 'oauth_google' }],
};
let mockUseUserValue: { isLoaded: boolean; isSignedIn: boolean; user: typeof signedInUser | null };

jest.mock('@clerk/nextjs', () => ({ useUser: () => mockUseUserValue }));
jest.mock('../lib/analytics', () => ({ trackAuth: { login: mockLogin } }));

import { normalizeAuthMethod, useAuthTracking } from './useAuthTracking';

function AuthHarness() {
  useAuthTracking();
  return null;
}

describe('authentication analytics helpers', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null };
  });

  it.each([
    ['oauth_google', 'google'],
    ['oauth_facebook', 'facebook'],
    ['saml_okta', 'social'],
    [undefined, 'email'],
  ])('normalizes provider %s to a bounded method %s', (provider, expected) => {
    expect(normalizeAuthMethod(provider)).toBe(expected);
  });

  it('establishes a signed-in hydration baseline without emitting a login', () => {
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: signedInUser };
    render(<AuthHarness />);
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('emits only the method once when a user signs in', () => {
    const { rerender } = render(<AuthHarness />);
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: signedInUser };
    rerender(<AuthHarness />);
    rerender(<AuthHarness />);
    expect(mockLogin.mock.calls).toEqual([[{ method: 'google' }]]);
  });
});
