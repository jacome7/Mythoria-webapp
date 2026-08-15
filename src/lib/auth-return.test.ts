import { buildAuthEntryPath, buildAuthReturnPath, sanitizeInternalReturnPath } from './auth-return';

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
