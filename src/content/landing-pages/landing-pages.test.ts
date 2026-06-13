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
  });

  it('keeps each book cover alt text aligned with its title', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    page?.books.forEach((book) => {
      expect(book.imageAlt).toContain(book.title);
    });
  });
});
