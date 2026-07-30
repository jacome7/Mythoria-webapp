import { getSeoSampleBook, getSeoSampleBooks } from './seo';

describe('sample-book SEO admission', () => {
  it('admits only the two reviewed PT-PT cluster samples', () => {
    expect(getSeoSampleBooks().map((book) => book.slug)).toEqual([
      'duas-chavenas-uma-vida',
      'a-primeira-manha-corajosa-da-sofia',
    ]);
    expect(getSeoSampleBooks().every((book) => book.locale === 'pt-PT')).toBe(true);
    expect(getSeoSampleBook('ines-e-diogo-um-amor-inesperado')).toBeUndefined();
  });

  it('requires reciprocal guide, landing and hub destinations', () => {
    for (const book of getSeoSampleBooks()) {
      expect(book.guideHref).toMatch(/^\/pt-PT\/guias\//);
      expect(book.landingHref).toMatch(/^\/pt-PT\/lp\//);
      expect(book.hubHref).toBe('/pt-PT/lp');
      expect(book.updatedAt).toBe('2026-07-27');
    }
  });

  it('keeps all eight travel samples noindex until separate editorial admission', () => {
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
      expect(getSeoSampleBook(slug)).toBeUndefined();
    }
  });
});
