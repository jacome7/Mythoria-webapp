jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import robots from './robots';

describe('robots metadata', () => {
  const crawlerUserAgents = [
    'Googlebot',
    'Bingbot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'Claude-SearchBot',
    'Claude-User',
    'ClaudeBot',
    'Google-Extended',
    'PerplexityBot',
    'Applebot',
    'Applebot-Extended',
  ];
  const locales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

  function matches(pathname: string, pattern: string): boolean {
    const anchored = pattern.endsWith('$');
    const body = anchored ? pattern.slice(0, -1) : pattern;
    return anchored ? pathname === body : pathname.startsWith(body);
  }

  it.each(crawlerUserAgents)('applies the shared public-content policy to %s', (_userAgent) => {
    const metadata = robots();
    const rules = Array.isArray(metadata.rules) ? metadata.rules : [metadata.rules];

    expect(rules).toHaveLength(1);
    expect(rules[0]?.userAgent).toBe('*');
    expect(rules[0]?.allow).toBe('/');
  });

  it('keeps every private route boundary blocked without blocking public prefixes', () => {
    const metadata = robots();
    const rules = Array.isArray(metadata.rules) ? metadata.rules : [metadata.rules];
    const wildcard = rules.find((rule) => rule.userAgent === '*');
    const disallows = Array.isArray(wildcard?.disallow)
      ? wildcard.disallow
      : wildcard?.disallow
        ? [wildcard.disallow]
        : [];

    expect(metadata.sitemap).toBe('https://mythoria.pt/sitemap.xml');
    expect(wildcard?.allow).toBe('/');
    expect(disallows).toEqual(
      expect.arrayContaining(['/api/', '/portaldegestao/', '/.well-known/']),
    );

    for (const locale of locales) {
      for (const privatePath of [
        `/${locale}/s`,
        `/${locale}/s/private-story-id`,
        `/${locale}/sign-in`,
        `/${locale}/sign-up`,
        `/${locale}/my-stories`,
        `/${locale}/profile`,
        `/${locale}/buy-credits`,
      ]) {
        expect(disallows.some((pattern) => matches(privatePath, pattern))).toBe(true);
      }
      for (const publicPath of [
        `/${locale}/sample-books/example-book`,
        `/${locale}/lp/example`,
        `/${locale}/blog/example`,
        `/${locale}/pricing`,
      ]) {
        expect(disallows.some((pattern) => matches(publicPath, pattern))).toBe(false);
      }
    }
  });
});
