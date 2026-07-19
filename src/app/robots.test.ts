jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import robots from './robots';

describe('robots metadata', () => {
  it('allows search crawlers while keeping training crawlers out of private flows', () => {
    const metadata = robots();
    const rules = Array.isArray(metadata.rules) ? metadata.rules : [metadata.rules];
    const wildcard = rules.find((rule) => rule.userAgent === '*');
    const gptBot = rules.find((rule) => rule.userAgent === 'GPTBot');

    expect(metadata.sitemap).toBe('https://mythoria.pt/sitemap.xml');
    expect(wildcard?.allow).toBe('/');
    expect(wildcard?.disallow).toEqual(
      expect.arrayContaining(['/api/', '/portaldegestao/', '/.well-known/']),
    );
    expect(gptBot?.allow).toEqual(expect.arrayContaining(['/pt-PT/lp/', '/pt-PT/blog/']));
    expect(gptBot?.disallow).toEqual(
      expect.arrayContaining(['/pt-PT/my-stories', '/pt-PT/tell-your-story/step-']),
    );
  });
});
