import {
  getIndexableLandingPages,
  getLandingPageBySlug,
  getLandingPageStaticParams,
} from './index';

describe('landing page content registry', () => {
  it('registers the autism landing page as a pt-PT indexable page', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.books).toHaveLength(5);
  });

  it('exposes static params and sitemap candidates from the same registry', () => {
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'livro-personalizado-criancas-autistas',
    });
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain(
      'livro-personalizado-criancas-autistas',
    );
  });

  it('uses respectful PEA/PHDA terminology in the title and metadata', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page?.metaTitle).toContain('PEA');
    expect(page?.metaTitle).toContain('PHDA');
    expect(page?.title).toContain('PEA');
    expect(page?.title).toContain('PHDA');
    // "autismo" is kept as a keyword somewhere on the page (quick answer / FAQ).
    const haystack = `${page?.quickAnswer.body} ${page?.faq.map((f) => f.answer).join(' ')}`;
    expect(haystack.toLowerCase()).toContain('autismo');
  });

  it('provides the GEO-oriented optional sections', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page?.socialStoryExplainer?.body.length).toBeGreaterThan(0);
    expect(page?.useCases?.items.length).toBeGreaterThanOrEqual(6);
    expect(page?.glossary?.terms.length).toBeGreaterThanOrEqual(4);
    expect(page?.forProfessionals?.ctaLabel).toBeTruthy();
    expect(page?.faq.length).toBeGreaterThanOrEqual(8);
    expect(page?.ogImageSrc).toBeTruthy();
    expect(page?.breadcrumbLabel).toBeTruthy();
    expect(page?.updatedAt).toBe('2026-06-15');
  });

  it('uses the live PEA/PHDA sample books with audio samples', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page?.books.map((book) => book.title)).toEqual([
      'O Comboio que Sabia Esperar',
      'A Ilha dos Sons Suaves',
      'O Mapa do Primeiro Dia',
      'O Meu Irmão Tem um Ritmo de Estrela',
      'A Caixa das Coisas Queridas',
    ]);

    page?.books.forEach((book) => {
      expect(book.imageAlt).toContain(book.title);
      expect(book.imageSrc).toContain(
        '/landing-pages/livro-personalizado-criancas-autistas/assets/books/',
      );
      expect(book.audio?.src).toMatch(/^data:audio\/wav;base64,/);
      expect(book.sampleChapterHref).toContain('/pt-PT/p/');
    });
  });

  it('does not reference deprecated landing-page-assets paths or removed draft stories', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');
    const serialized = JSON.stringify(page);

    expect(serialized).not.toContain('/landing-page-assets/');
    expect(serialized).not.toContain('Mateus e o Leão');
    expect(serialized).not.toContain('O Castelo de Estrelas da Maria');
    expect(serialized).not.toContain('Turma 4.º A no Planetário do Porto');
    expect(serialized).not.toContain('A Nossa Horta de Descobertas');
    expect(serialized).not.toContain('Recordar o Avô Manuel');
  });
});
