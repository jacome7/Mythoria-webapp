import { getPortugueseBlogGuideLinks } from './blog-guide-links';

describe('Portuguese blog guide links', () => {
  it('matches relevant family and relationship guides without keyword-only fallback links', () => {
    const links = getPortugueseBlogGuideLinks(
      'Uma história sobre o amor de um casal e as memórias dos avós com os netos.',
    );

    expect(links.map((link) => link.href)).toEqual([
      '/pt-PT/lp/livro-personalizado-avos-netos',
      '/pt-PT/lp/livro-personalizado-para-casais',
    ]);
    expect(getPortugueseBlogGuideLinks('Uma notícia sem tema relacionado.')).toEqual([]);
  });

  it('handles Portuguese diacritics and limits the number of links', () => {
    const links = getPortugueseBlogGuideLinks(
      'Educação e emoções numa mudança de escola para crianças.',
      1,
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('/pt-PT/lp/historias-de-apoio');
  });

  it('links travel content to the holidays landing page', () => {
    const links = getPortugueseBlogGuideLinks(
      'Fotografias de uma viagem em família, com praia, museu e férias de verão.',
    );

    expect(links).toContainEqual(
      expect.objectContaining({
        href: '/pt-PT/lp/livro-personalizado-ferias',
      }),
    );
  });
});
