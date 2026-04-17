jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

import {
  buildLocalizedUrl,
  getCanonicalRedirectPath,
  getStaticLocalizedHreflangLinks,
} from './seo';

describe('seo helpers', () => {
  it('builds slashless canonical localized URLs', () => {
    expect(buildLocalizedUrl('pt-PT', '/pricing/')).toBe('https://mythoria.pt/pt-PT/pricing');
    expect(buildLocalizedUrl('en-US')).toBe('https://mythoria.pt/en-US');
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
  });
});
