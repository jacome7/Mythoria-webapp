import { normalizeAuthMethod } from './useAuthTracking';

describe('authentication analytics helpers', () => {
  it.each([
    ['oauth_google', 'google'],
    ['oauth_facebook', 'facebook'],
    ['saml_okta', 'okta'],
    [undefined, 'email'],
  ])('normalizes provider %s to stable method %s', (provider, expected) => {
    expect(normalizeAuthMethod(provider)).toBe(expected);
  });
});
