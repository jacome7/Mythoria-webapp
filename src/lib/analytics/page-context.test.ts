import {
  redactedPageParams,
  sanitizeAnalyticsPageUrl,
  sanitizeAnalyticsPathname,
} from './page-context';

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

  it('redacts survey bearer tokens but keeps the reward route readable', () => {
    const token = 'AbCdEfGhIjKlMnOpQrStUv.0123456789abcdefghijkl';
    expect(sanitizeAnalyticsPathname(`/en-US/survey/${token}`)).toBe('/en-US/survey/:token');
    expect(sanitizeAnalyticsPathname(`/pt-PT/survey/${token}/`)).toBe('/pt-PT/survey/:token/');
    expect(
      sanitizeAnalyticsPathname('/en-US/survey/reward/00000000-0000-4000-8000-000000000001'),
    ).toBe('/en-US/survey/reward/:id');
    expect(sanitizeAnalyticsPathname('/en-US/survey/reward/not-a-uuid')).toBe(
      '/en-US/survey/reward/:id',
    );
    expect(sanitizeAnalyticsPageUrl(`https://mythoria.pt/fr-FR/survey/${token}?x=1`)).toBe(
      'https://mythoria.pt/fr-FR/survey/:token',
    );
    expect(sanitizeAnalyticsPathname('/en-US/surveys-info')).toBe('/en-US/surveys-info');
  });

  it('builds redacted page params for events fired on credential-bearing pages', () => {
    const params = redactedPageParams('/en-US/survey/:token');
    expect(params.page_path).toBe('/en-US/survey/:token');
    expect(params.page_location.endsWith('/en-US/survey/:token')).toBe(true);
  });
});
