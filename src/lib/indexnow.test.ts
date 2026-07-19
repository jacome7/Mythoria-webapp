jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import { buildIndexNowPayload, INDEXNOW_KEY } from './indexnow';

describe('IndexNow payload', () => {
  it('deduplicates canonical Mythoria URLs and publishes the public key location', () => {
    const url = 'https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais';
    const payload = buildIndexNowPayload([url, url]);

    expect(payload).toEqual({
      host: 'mythoria.pt',
      key: INDEXNOW_KEY,
      keyLocation: `https://mythoria.pt/${INDEXNOW_KEY}.txt`,
      urlList: [url],
    });
  });

  it.each([
    'http://mythoria.pt/pt-PT/lp/historias-de-apoio',
    'https://www.mythoria.pt/pt-PT/lp/historias-de-apoio',
    'https://mythoria.pt/pt-PT/lp/historias-de-apoio/',
    'https://mythoria.pt/pt-PT/lp/historias-de-apoio?utm_source=test',
  ])('rejects a noncanonical URL: %s', (url) => {
    expect(() => buildIndexNowPayload([url])).toThrow(/canonical/i);
  });
});
