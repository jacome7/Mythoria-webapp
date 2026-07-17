const getPublishedBySlugMock = jest.fn();
const getPublishedMatchesByAnySlugMock = jest.fn();
const getPublishedTranslationsBySlugBaseMock = jest.fn();

jest.mock('@/db/services/blog', () => ({
  blogService: {
    getPublishedBySlug: (...args: unknown[]) => getPublishedBySlugMock(...args),
    getPublishedMatchesByAnySlug: (...args: unknown[]) => getPublishedMatchesByAnySlugMock(...args),
    getPublishedTranslationsBySlugBase: (...args: unknown[]) =>
      getPublishedTranslationsBySlugBaseMock(...args),
  },
}));

import { resolveBlogPostRoute } from './blog-route';

describe('resolveBlogPostRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the direct locale slug when it exists', async () => {
    getPublishedBySlugMock.mockResolvedValue({ slugBase: 'book-production', slug: 'producao' });
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      { locale: 'pt-PT', slug: 'producao' },
      { locale: 'en-US', slug: 'book-production' },
    ]);

    await expect(resolveBlogPostRoute('pt-PT', 'producao')).resolves.toEqual({
      type: 'resolved',
      post: { slugBase: 'book-production', slug: 'producao' },
      translations: [
        { locale: 'pt-PT', slug: 'producao' },
        { locale: 'en-US', slug: 'book-production' },
      ],
    });
  });

  it('redirects to the translated slug in the requested locale when the slug belongs elsewhere', async () => {
    getPublishedBySlugMock.mockResolvedValue(null);
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      {
        slugBase: 'engine-room',
        slug: 'mythoria-ki-maschinenraum',
        locale: 'de-DE',
      },
    ]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      { locale: 'de-DE', slug: 'mythoria-ki-maschinenraum' },
      { locale: 'pt-PT', slug: 'mythoria-ia-sala-de-maquinas' },
    ]);

    await expect(resolveBlogPostRoute('pt-PT', 'mythoria-ki-maschinenraum')).resolves.toEqual({
      type: 'redirect',
      locale: 'pt-PT',
      slug: 'mythoria-ia-sala-de-maquinas',
    });
  });

  it('redirects to the canonical locale when no translation exists for the requested locale', async () => {
    getPublishedBySlugMock.mockResolvedValue(null);
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      {
        slugBase: 'book-production',
        slug: 'fabrication-dun-livre',
        locale: 'fr-FR',
      },
    ]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      { locale: 'fr-FR', slug: 'fabrication-dun-livre' },
    ]);

    await expect(resolveBlogPostRoute('pt-PT', 'fabrication-dun-livre')).resolves.toEqual({
      type: 'redirect',
      locale: 'fr-FR',
      slug: 'fabrication-dun-livre',
    });
  });

  it('returns notFound for unknown slugs', async () => {
    getPublishedBySlugMock.mockResolvedValue(null);
    getPublishedMatchesByAnySlugMock.mockResolvedValue([]);

    await expect(resolveBlogPostRoute('en-US', 'missing-post')).resolves.toEqual({
      type: 'notFound',
    });
  });

  it('returns notFound rather than guessing when a slug maps to multiple posts', async () => {
    getPublishedBySlugMock.mockResolvedValue(null);
    getPublishedMatchesByAnySlugMock.mockResolvedValue([
      { slugBase: 'post-one', slug: 'shared', locale: 'fr-FR' },
      { slugBase: 'post-two', slug: 'shared', locale: 'de-DE' },
    ]);

    await expect(resolveBlogPostRoute('en-US', 'shared')).resolves.toEqual({
      type: 'notFound',
    });
    expect(getPublishedTranslationsBySlugBaseMock).not.toHaveBeenCalled();
  });
});
