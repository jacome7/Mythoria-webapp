jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES'],
    defaultLocale: 'en-US',
  },
}));

import { buildStaticPageMetadata } from './static-page-metadata';

describe('buildStaticPageMetadata', () => {
  it('creates canonical and hreflang links for a static localized page', () => {
    const metadata = buildStaticPageMetadata({
      locale: 'en-US',
      path: '/privacy-policy',
      title: 'Privacy Policy | Mythoria',
      description: 'Privacy details for Mythoria users.',
    });

    expect(metadata.alternates?.canonical).toBe('https://mythoria.pt/en-US/privacy-policy');
    expect(metadata.alternates?.languages).toEqual({
      'en-US': 'https://mythoria.pt/en-US/privacy-policy',
      'pt-PT': 'https://mythoria.pt/pt-PT/privacy-policy',
      'es-ES': 'https://mythoria.pt/es-ES/privacy-policy',
    });
    expect(metadata.openGraph?.url).toBe('https://mythoria.pt/en-US/privacy-policy');
    expect(metadata.robots).toBe('index,follow,max-snippet:-1,max-image-preview:large');
  });

  it('points homepage x-default directly at the final default locale URL', () => {
    const metadata = buildStaticPageMetadata({
      locale: 'pt-PT',
      path: '',
      title: 'Mythoria',
    });
    expect(metadata.alternates?.languages).toEqual(
      expect.objectContaining({ 'x-default': 'https://mythoria.pt/en-US' }),
    );
  });
});
