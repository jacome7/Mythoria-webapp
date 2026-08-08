import { sanitizeAnalyticsPageUrl, sanitizeAnalyticsPathname } from './page-context';

describe('analytics page context privacy boundary', () => {
  it('removes query strings and redacts private path identifiers', () => {
    expect(
      sanitizeAnalyticsPageUrl(
        'https://mythoria.pt/en-US/stories/00000000-0000-4000-8000-000000000001?gclid=secret',
      ),
    ).toBe('https://mythoria.pt/en-US/stories/:id');
    expect(sanitizeAnalyticsPathname('/en-US/s/private-share-token')).toBe('/en-US/s/:token');
  });

  it('rejects cross-origin, malformed, and oversized page values', () => {
    expect(sanitizeAnalyticsPageUrl('https://external.example/private')).toBeUndefined();
    expect(sanitizeAnalyticsPageUrl('not-a-url')).toBeUndefined();
    expect(sanitizeAnalyticsPathname(`/${'x'.repeat(200)}`)).toBeUndefined();
  });
});
