jest.mock('next/server', () => ({
  NextResponse: class NextResponse {
    body: string;
    status: number;
    headers: Headers;

    constructor(body: string, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    async text() {
      return this.body;
    }
  },
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

const getFeaturedPublicStoriesMock = jest.fn();
const getPublishedSitemapTranslationsMock = jest.fn();

jest.mock('@/db/services', () => ({
  storyService: {
    getFeaturedPublicStories: (...args: unknown[]) => getFeaturedPublicStoriesMock(...args),
  },
  blogService: {
    getPublishedSitemapTranslations: (...args: unknown[]) =>
      getPublishedSitemapTranslationsMock(...args),
  },
}));

import { GET, generateSitemap } from './route';

const blogRows = [
  {
    slugBase: 'fathers-day-2026',
    locale: 'en-US',
    slug: 'fathers-day-2026',
    title: 'Fathers Day',
    summary: 'Summary',
    contentMdx: '# Fathers Day',
    publishedAt: new Date('2026-03-14T23:00:00.000Z'),
    postUpdatedAt: new Date('2026-03-16T00:00:00.000Z'),
    translationUpdatedAt: new Date('2026-03-15T00:00:00.000Z'),
  },
  {
    slugBase: 'fathers-day-2026',
    locale: 'pt-PT',
    slug: 'dia-do-pai-2026',
    title: 'Dia do Pai',
    summary: 'Resumo',
    contentMdx: '# Dia do Pai',
    publishedAt: new Date('2026-03-14T23:00:00.000Z'),
    postUpdatedAt: new Date('2026-03-16T00:00:00.000Z'),
    translationUpdatedAt: new Date('2026-03-17T00:00:00.000Z'),
  },
];

describe('sitemap.xml route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFeaturedPublicStoriesMock.mockResolvedValue([]);
    getPublishedSitemapTranslationsMock.mockResolvedValue([]);
  });

  it('emits unique canonical entries with meaningful alternates and timestamps', async () => {
    getFeaturedPublicStoriesMock.mockResolvedValue([
      {
        slug: 'native-story',
        storyLanguage: 'pt-PT',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    getPublishedSitemapTranslationsMock.mockResolvedValue(blogRows);

    const xml = await generateSitemap();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(new Set(locs).size).toBe(locs.length);
    expect(xml).not.toContain('<loc>https://mythoria.pt</loc>');
    expect(xml).not.toContain('<priority>');
    expect(xml).not.toContain('<changefreq>');
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/p/native-story</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/en-US/blog/fathers-day-2026</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/blog/dia-do-pai-2026</loc>');

    const homeEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/en-US<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(homeEntry).toContain('hreflang="x-default" href="https://mythoria.pt/en-US"');
    expect(homeEntry).not.toContain('<lastmod>');

    const ptBlogEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/pt-PT\/blog\/dia-do-pai-2026<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(ptBlogEntry).toContain('<lastmod>2026-03-17T00:00:00.000Z</lastmod>');
    expect(ptBlogEntry).toContain('href="https://mythoria.pt/en-US/blog/fathers-day-2026"');
  });

  it('rejects duplicate translation locales instead of silently serializing them', async () => {
    getPublishedSitemapTranslationsMock.mockResolvedValue([...blogRows, { ...blogRows[1] }]);
    await expect(generateSitemap()).rejects.toThrow('Duplicate blog translation locale');
  });

  it('returns 503 with retry guidance when any source fails', async () => {
    getFeaturedPublicStoriesMock.mockRejectedValue(new Error('database unavailable'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('300');
    await expect(response.text()).resolves.toBe('Sitemap temporarily unavailable');
  });
});
