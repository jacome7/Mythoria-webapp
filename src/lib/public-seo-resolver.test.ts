const getPublishedMatchesByAnySlugMock = jest.fn();
const getPublishedTranslationsBySlugBaseMock = jest.fn();
const getPublicStorySeoDataMock = jest.fn();

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

jest.mock('@/db/services', () => ({
  blogService: {
    getPublishedMatchesByAnySlug: (...args: unknown[]) => getPublishedMatchesByAnySlugMock(...args),
    getPublishedTranslationsBySlugBase: (...args: unknown[]) =>
      getPublishedTranslationsBySlugBaseMock(...args),
  },
  storyService: {
    getPublicStorySeoData: (...args: unknown[]) => getPublicStorySeoDataMock(...args),
  },
}));

import { resolveDynamicPublicSeoPath } from './public-seo-resolver';

describe('dynamic public SEO resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPublishedMatchesByAnySlugMock.mockResolvedValue([]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([]);
    getPublicStorySeoDataMock.mockResolvedValue(null);
  });

  it('resolves a non-locale blog slug directly to its published translation', async () => {
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      { slugBase: 'book-production', slug: 'producao', locale: 'pt-PT' },
    ]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      { slug: 'book-production', locale: 'en-US' },
      { slug: 'producao', locale: 'pt-PT' },
    ]);

    await expect(resolveDynamicPublicSeoPath('/blog/producao')).resolves.toEqual({
      type: 'redirect',
      pathname: '/pt-PT/blog/producao',
    });
  });

  it('corrects a translated blog slug and locale in the same redirect', async () => {
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      { slugBase: 'book-production', slug: 'producao', locale: 'pt-PT' },
    ]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      { slug: 'book-production', locale: 'en-US' },
      { slug: 'producao', locale: 'pt-PT' },
    ]);

    await expect(resolveDynamicPublicSeoPath('/en-US/blog/producao/')).resolves.toEqual({
      type: 'redirect',
      pathname: '/en-US/blog/book-production',
    });
  });

  it.each(['lerne-das-mythoria-ki-team-kennen', 'rencontrez-l-equipe-ia-de-mythoria'])(
    'redirects retired blog slug %s to the current translation cluster',
    async (legacySlug) => {
      getPublishedMatchesByAnySlugMock.mockResolvedValue([
        { slugBase: 'meet-mythoria-ai-team', slug: 'meet-mythoria-ai-team', locale: 'en-US' },
      ]);
      getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
        { slug: 'meet-mythoria-ai-team', locale: 'en-US' },
        { slug: 'conhece-a-equipa-de-ia-da-mythoria', locale: 'pt-PT' },
      ]);

      await expect(resolveDynamicPublicSeoPath(`/pt-PT/blog/${legacySlug}`)).resolves.toEqual({
        type: 'redirect',
        pathname: '/pt-PT/blog/conhece-a-equipa-de-ia-da-mythoria',
      });
      expect(getPublishedMatchesByAnySlugMock).toHaveBeenCalledWith('meet-mythoria-ai-team');
    },
  );

  it('does not guess when a blog slug is missing or ambiguous', async () => {
    await expect(resolveDynamicPublicSeoPath('/blog/missing')).resolves.toEqual({
      type: 'notFound',
    });
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      { slugBase: 'one', slug: 'shared', locale: 'en-US' },
      { slugBase: 'two', slug: 'shared', locale: 'pt-PT' },
    ]);
    await expect(resolveDynamicPublicSeoPath('/blog/shared')).resolves.toEqual({
      type: 'notFound',
    });
  });

  it('uses the normalized public story language as its canonical locale', async () => {
    getPublicStorySeoDataMock.mockResolvedValue({
      slug: 'a-public-story',
      storyLanguage: 'pt',
    });
    await expect(resolveDynamicPublicSeoPath('/p/a-public-story')).resolves.toEqual({
      type: 'redirect',
      pathname: '/pt-PT/p/a-public-story',
    });
    await expect(resolveDynamicPublicSeoPath('/pt-PT/p/a-public-story')).resolves.toEqual({
      type: 'canonical',
      pathname: '/pt-PT/p/a-public-story',
    });
  });
});
