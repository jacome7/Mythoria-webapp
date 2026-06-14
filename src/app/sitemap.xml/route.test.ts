jest.mock('next/server', () => ({
  NextResponse: class NextResponse {
    body: unknown;
    init: unknown;

    constructor(body: unknown, init?: unknown) {
      this.body = body;
      this.init = init;
    }
  },
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

const getFeaturedPublicStoriesMock = jest.fn();
const getPublishedListMock = jest.fn();
const getPublishedTranslationsBySlugBaseMock = jest.fn();

jest.mock('@/db/services', () => ({
  storyService: {
    getFeaturedPublicStories: (...args: unknown[]) => getFeaturedPublicStoriesMock(...args),
  },
  blogService: {
    getPublishedList: (...args: unknown[]) => getPublishedListMock(...args),
    getPublishedTranslationsBySlugBase: (...args: unknown[]) =>
      getPublishedTranslationsBySlugBaseMock(...args),
  },
}));

import { generateSitemap } from './route';

describe('sitemap.xml route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFeaturedPublicStoriesMock.mockResolvedValue([]);
    getPublishedListMock.mockResolvedValue([]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([]);
  });

  it('emits canonical URLs only and retires the stories index', async () => {
    getFeaturedPublicStoriesMock.mockResolvedValue([
      {
        slug: 'native-story',
        storyLanguage: 'pt-PT',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    getPublishedListMock.mockResolvedValue([{ slugBase: 'fathers-day-2026' }]);
    getPublishedTranslationsBySlugBaseMock.mockResolvedValue([
      {
        locale: 'de-DE',
        slug: 'vatertag-2026',
        publishedAt: new Date('2026-03-15T00:25:00.000Z'),
      },
      {
        locale: 'en-US',
        slug: 'fathers-day-2026',
        publishedAt: new Date('2026-03-14T23:00:00.000Z'),
      },
      {
        locale: 'es-ES',
        slug: 'dia-del-padre-2026',
        publishedAt: new Date('2026-03-14T23:00:00.000Z'),
      },
      {
        locale: 'fr-FR',
        slug: 'fete-des-peres-2026',
        publishedAt: new Date('2026-03-14T23:00:00.000Z'),
      },
      {
        locale: 'pt-PT',
        slug: 'dia-do-pai-2026',
        publishedAt: new Date('2026-03-14T23:00:00.000Z'),
      },
    ]);

    const xml = await generateSitemap();

    expect(xml).not.toContain('/stories');
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/p/native-story</loc>');
    expect(xml).not.toContain('https://mythoria.pt/en-US/p/native-story');
    expect(xml).not.toMatch(/<loc>https:\/\/mythoria\.pt\/[^<]+\/<\/loc>/);

    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/lp/livro-personalizado-criancas-autistas</loc>',
    );
    expect(xml).not.toContain('https://mythoria.pt/en-US/lp/livro-personalizado-criancas-autistas');
    expect(xml).not.toContain('https://mythoria.pt/es-ES/lp/livro-personalizado-criancas-autistas');

    const pricingEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/en-US\/pricing<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(pricingEntry).toBeDefined();
    expect(pricingEntry).not.toContain('hreflang="x-default"');

    const homeEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/en-US<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(homeEntry).toContain('hreflang="x-default"');

    expect(xml).toContain('<loc>https://mythoria.pt/de-DE/blog/vatertag-2026</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/en-US/blog/fathers-day-2026</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/es-ES/blog/dia-del-padre-2026</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/fr-FR/blog/fete-des-peres-2026</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/blog/dia-do-pai-2026</loc>');
  });
});
