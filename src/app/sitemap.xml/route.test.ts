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
    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais</loc>',
    );
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/lp/historias-de-apoio</loc>');
    expect(xml).toContain('<loc>https://mythoria.pt/pt-PT/lp/livro-personalizado-ferias</loc>');
    for (const url of [
      'https://mythoria.pt/en-US/lp/personalized-vacation-book',
      'https://mythoria.pt/es-ES/lp/libro-personalizado-vacaciones',
      'https://mythoria.pt/fr-FR/lp/livre-personnalise-vacances',
      'https://mythoria.pt/en-US/lp/personalized-book-for-couples',
      'https://mythoria.pt/es-ES/lp/libro-personalizado-para-parejas',
      'https://mythoria.pt/fr-FR/lp/livre-personnalise-pour-couples',
      'https://mythoria.pt/en-US/lp/personalized-book-for-grandparents-and-grandchildren',
      'https://mythoria.pt/es-ES/lp/libro-personalizado-para-abuelos-y-nietos',
      'https://mythoria.pt/fr-FR/lp/livre-personnalise-pour-grands-parents-et-petits-enfants',
    ]) {
      expect(xml).toContain(`<loc>${url}</loc>`);
    }
    const localizedLandingEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/en-US\/lp\/personalized-vacation-book<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(localizedLandingEntry).toContain('hreflang="pt-pt"');
    expect(localizedLandingEntry).toContain('hreflang="es-es"');
    expect(localizedLandingEntry).toContain('hreflang="fr-fr"');
    expect(localizedLandingEntry).not.toContain('hreflang="de-de"');
    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/guias/como-transformar-memorias-num-livro-personalizado-para-casal</loc>',
    );
    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/guias/como-criar-uma-historia-de-apoio-para-uma-mudanca</loc>',
    );
    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/sample-books/duas-chavenas-uma-vida</loc>',
    );
    expect(xml).toContain(
      '<loc>https://mythoria.pt/pt-PT/sample-books/a-primeira-manha-corajosa-da-sofia</loc>',
    );
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

    const hubEntry = xml.match(
      /<url>\s*<loc>https:\/\/mythoria\.pt\/pt-PT\/lp<\/loc>[\s\S]*?<\/url>/,
    )?.[0];
    expect(hubEntry).toContain('<lastmod>2026-08-04T00:00:00.000Z</lastmod>');

    const approvedSampleMatches = xml.match(
      /<loc>https:\/\/mythoria\.pt\/pt-PT\/sample-books\/duas-chavenas-uma-vida<\/loc>/g,
    );
    expect(approvedSampleMatches).toHaveLength(1);
    expect(
      xml.match(/<loc>https:\/\/mythoria\.pt\/pt-PT\/lp\/livro-personalizado-ferias<\/loc>/g),
    ).toHaveLength(1);
    for (const slug of [
      'a-leonor-e-o-segredo-do-oceanario',
      'o-verao-em-que-o-tomas-encontrou-uma-ilha',
      'o-mapa-dos-dias-que-eram-so-nossos',
      'a-road-trip-dos-planos-impossiveis',
      'o-quadro-que-piscou-o-olho',
      'o-dia-em-que-a-quinta-falou',
      'a-viagem-que-os-avos-tambem-viveram',
      'antes-que-a-estrada-acabe',
    ]) {
      expect(xml).not.toContain(`<loc>https://mythoria.pt/pt-PT/sample-books/${slug}</loc>`);
    }
    expect(xml).not.toContain(
      '<loc>https://mythoria.pt/pt-PT/sample-books/ines-e-diogo-um-amor-inesperado</loc>',
    );
    expect(xml).not.toContain(
      '<loc>https://mythoria.pt/pt-PT/lp/livro-personalizado-crianca</loc>',
    );
    for (const slug of [
      'mia-e-a-pastelaria-da-lua',
      'tomas-e-o-mapa-das-portas-escondidas',
      'lia-e-o-jardim-das-palavras-perdidas',
      'a-equipa-que-marcou-um-golo-nas-estrelas',
      'ines-e-o-robo-feito-de-desenhos',
    ]) {
      expect(xml).not.toContain(`<loc>https://mythoria.pt/pt-PT/sample-books/${slug}</loc>`);
    }
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
