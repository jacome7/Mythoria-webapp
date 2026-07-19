jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import {
  buildAbsoluteUrl,
  buildLocalizedUrl,
  canonicalizePathname,
  getCanonicalRedirectPath,
  getSeoRoutePolicy,
  getStaticLocalizedHreflangLinks,
  getTrainingBotDisallowPaths,
} from './seo';

describe('seo helpers', () => {
  it('builds slashless canonical localized URLs', () => {
    expect(buildLocalizedUrl('pt-PT', '/pricing/')).toBe('https://mythoria.pt/pt-PT/pricing');
    expect(buildLocalizedUrl('en-US')).toBe('https://mythoria.pt/en-US');
  });

  it('keeps already absolute asset URLs unchanged', () => {
    expect(
      buildAbsoluteUrl(
        'https://storage.googleapis.com/mythoria-public/landing-page-assets/workshops-criancas/hero/og-cover.jpg',
      ),
    ).toBe(
      'https://storage.googleapis.com/mythoria-public/landing-page-assets/workshops-criancas/hero/og-cover.jpg',
    );
  });

  it('generates hreflang links only for supported static localized paths', () => {
    expect(getStaticLocalizedHreflangLinks('/pt-PT/pricing/')).toEqual(
      expect.objectContaining({
        'en-US': 'https://mythoria.pt/en-US/pricing',
        'pt-PT': 'https://mythoria.pt/pt-PT/pricing',
      }),
    );
    expect(getStaticLocalizedHreflangLinks('/pt-PT/blog/some-post')).toBeUndefined();
  });

  it('normalizes locale casing and trailing slashes into one canonical pathname', () => {
    expect(getCanonicalRedirectPath('/en-us/')).toBe('/en-US');
    expect(getCanonicalRedirectPath('/pt-PT/get-inspired/')).toBe('/pt-PT/get-inspired');
    expect(getCanonicalRedirectPath('/pt-PT/get-inspired')).toBeNull();
    expect(getCanonicalRedirectPath('/pt-PT/lp/')).toBe('/pt-PT/lp');
    expect(getCanonicalRedirectPath('/lp/livro-personalizado-para-casais')).toBe(
      '/pt-PT/lp/livro-personalizado-para-casais',
    );
    expect(getCanonicalRedirectPath('/lp/livro-personalizado-para-casais/')).toBe(
      '/pt-PT/lp/livro-personalizado-para-casais',
    );
    expect(getCanonicalRedirectPath('/')).toBe('/en-US');
    expect(getCanonicalRedirectPath('//en-us///blog/post//')).toBe('/en-US/blog/post');
  });

  it('builds bot-specific private route exclusions without blocking editorial pages', () => {
    const disallows = getTrainingBotDisallowPaths();

    expect(disallows).toContain('/pt-PT/my-stories');
    expect(disallows).toContain('/pt-PT/tell-your-story/step-');
    expect(disallows).toContain('/api/');
    expect(disallows).not.toContain('/pt-PT/lp/');
    expect(disallows).not.toContain('/pt-PT/blog/');
  });

  it('classifies public, entity-backed, and private routes', () => {
    expect(getSeoRoutePolicy('/en-US/pricing')).toMatchObject({
      kind: 'static-public',
      indexable: true,
      includeInSitemap: true,
    });
    expect(getSeoRoutePolicy('/pt-PT/blog/a-post')).toMatchObject({
      kind: 'blog-post',
      entityValidationRequired: true,
    });
    expect(getSeoRoutePolicy('/en-US/my-stories')).toMatchObject({
      kind: 'private',
      indexable: false,
      includeInSitemap: false,
    });
    expect(getSeoRoutePolicy('/en-US/partners')).toMatchObject({
      kind: 'public-low-value',
      follow: true,
      indexable: false,
    });
    expect(canonicalizePathname('https://mythoria.pt/en-US///pricing/')).toBe('/en-US/pricing');
  });
});
