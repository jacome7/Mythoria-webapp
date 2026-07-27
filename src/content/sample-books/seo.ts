export interface SeoSampleBook {
  slug: string;
  locale: 'pt-PT';
  updatedAt: string;
  guideHref: string;
  guideLabel: string;
  landingHref: string;
  landingLabel: string;
  hubHref: string;
}

const seoSampleBooks = [
  {
    slug: 'duas-chavenas-uma-vida',
    locale: 'pt-PT',
    updatedAt: '2026-07-27',
    guideHref: '/pt-PT/guias/como-transformar-memorias-num-livro-personalizado-para-casal',
    guideLabel: 'Como transformar memórias num livro personalizado para um casal',
    landingHref: '/pt-PT/lp/livro-personalizado-para-casais',
    landingLabel: 'Livros personalizados para casais',
    hubHref: '/pt-PT/lp',
  },
  {
    slug: 'a-primeira-manha-corajosa-da-sofia',
    locale: 'pt-PT',
    updatedAt: '2026-07-27',
    guideHref: '/pt-PT/guias/como-criar-uma-historia-de-apoio-para-uma-mudanca',
    guideLabel: 'Como criar uma história de apoio para uma mudança',
    landingHref: '/pt-PT/lp/historias-de-apoio',
    landingLabel: 'Histórias de Apoio personalizadas',
    hubHref: '/pt-PT/lp',
  },
] satisfies SeoSampleBook[];

export function getSeoSampleBook(slug: string): SeoSampleBook | undefined {
  return seoSampleBooks.find((book) => book.slug === slug);
}

export function getSeoSampleBooks(): SeoSampleBook[] {
  return [...seoSampleBooks];
}
