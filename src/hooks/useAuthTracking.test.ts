import { hasStoredSignupMarker, normalizeAuthMethod, storeSignupMarker } from './useAuthTracking';

describe('authentication analytics helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    ['oauth_google', 'google'],
    ['oauth_facebook', 'facebook'],
    ['saml_okta', 'okta'],
    [undefined, 'email'],
  ])('normalizes provider %s to stable method %s', (provider, expected) => {
    expect(normalizeAuthMethod(provider)).toBe(expected);
  });

  it('deduplicates signup emission per Clerk user in browser storage', () => {
    expect(hasStoredSignupMarker('user_1')).toBe(false);

    storeSignupMarker('user_1');

    expect(hasStoredSignupMarker('user_1')).toBe(true);
    expect(hasStoredSignupMarker('user_2')).toBe(false);
  });
});
