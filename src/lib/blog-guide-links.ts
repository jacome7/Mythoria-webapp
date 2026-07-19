export interface BlogGuideLink {
  href: string;
  title: string;
  description: string;
}

const guideRules: Array<BlogGuideLink & { terms: string[] }> = [
  {
    href: '/pt-PT/lp/livro-personalizado-avos-netos',
    title: 'Livros personalizados para avós e netos',
    description: 'Ideias para transformar memórias e tradições de família numa história.',
    terms: ['avo', 'avos', 'neta', 'neto', 'netos', 'geracoes'],
  },
  {
    href: '/pt-PT/lp/livro-personalizado-para-casais',
    title: 'Livros personalizados para casais',
    description: 'Inspiração para celebrar uma relação com uma prenda verdadeiramente pessoal.',
    terms: ['amor', 'casal', 'casais', 'casamento', 'namorado', 'namorada', 'romance'],
  },
  {
    href: '/pt-PT/lp/livro-personalizado-criancas-autistas',
    title: 'Livros para crianças com PEA ou PHDA',
    description: 'Abordagens personalizadas e cuidadosas, sempre sob controlo do adulto.',
    terms: ['autismo', 'autista', 'pea', 'phda', 'neurodivergencia', 'neurodivergente'],
  },
  {
    href: '/pt-PT/lp/historias-de-apoio',
    title: 'Histórias de apoio para desafios da vida',
    description: 'Exemplos ficcionais para conversar sobre emoções e mudanças difíceis.',
    terms: ['emocao', 'emocoes', 'luto', 'mudanca', 'separacao', 'divorcio', 'ansiedade'],
  },
  {
    href: '/pt-PT/lp/workshops-criancas',
    title: 'Workshops criativos para crianças',
    description: 'Atividades para escolas, grupos e projetos de criação colaborativa.',
    terms: ['crianca', 'criancas', 'escola', 'professor', 'turma', 'workshop', 'educacao'],
  },
];

export function getPortugueseBlogGuideLinks(text: string, limit = 2): BlogGuideLink[] {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return guideRules
    .filter((guide) => guide.terms.some((term) => new RegExp(`\\b${term}\\b`).test(normalized)))
    .slice(0, limit)
    .map(({ href, title, description }) => ({ href, title, description }));
}
