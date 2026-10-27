import {
  buildLandingCreationReturnPath,
  buildAuthEntryPath,
  buildAuthReturnPath,
  sanitizeInternalReturnPath,
} from './auth-return';

describe('auth return paths', () => {
  it.each(['https://evil.example', '//evil.example/path', '/\\evil.example', 'javascript:x'])(
    'rejects unsafe return target %s',
    (candidate) => {
      expect(sanitizeInternalReturnPath(candidate, '/pt-PT/my-stories')).toBe('/pt-PT/my-stories');
    },
  );

  it('accepts redirectUrl temporarily but emits a canonical same-origin return context', () => {
    const search = new URLSearchParams({
      redirectUrl: '/pt-PT/tell-your-story/step-1',
      landing_path: '/pt-PT/lp/livro-personalizado-para-casais',
      landing_slug: 'livro-personalizado-para-casais',
      primary_intent: 'romance',
      utm_source: 'google',
      gclid: 'click-1',
    });
    const result = new URL(
      buildAuthReturnPath(search, '/pt-PT/profile/onboarding'),
      'https://mythoria.pt',
    );
    expect(result.pathname).toBe('/pt-PT/tell-your-story/step-1');
    expect(result.searchParams.get('landing_path')).toBe(
      '/pt-PT/lp/livro-personalizado-para-casais',
    );
    expect(result.searchParams.get('landing_slug')).toBe('livro-personalizado-para-casais');
    expect(result.searchParams.get('primary_intent')).toBe('romance');
    expect(result.searchParams.get('utm_source')).toBe('google');
    expect(result.searchParams.get('gclid')).toBe('click-1');
  });

  it('builds auth entry URLs with only the canonical redirect parameter', () => {
    expect(buildAuthEntryPath('en-US', 'sign-in', '/en-US/p/moon')).toBe(
      '/en-US/sign-in?redirect=%2Fen-US%2Fp%2Fmoon',
    );
  });
});

describe('landing creation returns', () => {
  it('keeps an editorial template through a campaign link and authentication round trip', () => {
    const path = buildLandingCreationReturnPath(
      '/en-US/tell-your-story/step-1?templateId=pet-mission',
      '/en-US',
      new URLSearchParams({ utm_source: 'newsletter', ref: 'partner', prompt: 'private' }),
    );
    const auth = new URL(buildAuthEntryPath('en-US', 'sign-up', path), 'https://mythoria.pt');
    const returned = new URL(
      buildAuthReturnPath(auth.searchParams, '/en-US'),
      'https://mythoria.pt',
    );
    expect(returned.pathname).toBe('/en-US/tell-your-story/step-1');
    expect(returned.searchParams.get('templateId')).toBe('pet-mission');
    expect(returned.searchParams.get('ref')).toBe('partner');
    expect(returned.searchParams.get('utm_source')).toBe('newsletter');
    expect(returned.searchParams.has('prompt')).toBe(false);
  });
  it('carries campaign and referral fields but drops free text and invalid intent', () => {
    const result = new URL(
      buildLandingCreationReturnPath(
        '/pt-PT/tell-your-story/step-1?primaryIntent=not-valid&prompt=private',
        '/pt-PT/lp/casais',
        new URLSearchParams(
          'utm_source=google&gclid=click&ref=partner&prompt=secret&redirect=https://evil.example',
        ),
        'romance',
      ),
      'https://mythoria.pt',
    );
    expect(result.pathname).toBe('/pt-PT/tell-your-story/step-1');
    expect(Object.fromEntries(result.searchParams)).toEqual({
      landingSlug: 'casais',
      ref: 'partner',
      utm_source: 'google',
      gclid: 'click',
      landing_path: '/pt-PT/lp/casais',
    });
  });
  it('keeps package and referral when switching auth entry points', () => {
    const entry = new URL(
      buildAuthEntryPath('pt-PT', 'sign-up', '/pt-PT/buy-credits?package=2&ref=partner'),
      'https://mythoria.pt',
    );
    const returned = buildAuthReturnPath(entry.searchParams, '/pt-PT/my-stories');
    const signIn = new URL(buildAuthEntryPath('pt-PT', 'sign-in', returned), 'https://mythoria.pt');
    const target = new URL(
      buildAuthReturnPath(signIn.searchParams, '/pt-PT/my-stories'),
      'https://mythoria.pt',
    );
    expect(target.pathname).toBe('/pt-PT/buy-credits');
    expect(target.searchParams.get('package')).toBe('2');
    expect(target.searchParams.get('ref')).toBe('partner');
  });
});
