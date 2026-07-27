import { getGuideBySlug, getGuides } from '.';

function editorialWordCount(guide: ReturnType<typeof getGuides>[number]): number {
  return [
    ...guide.intro,
    ...guide.sections.flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])]),
  ]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

describe('PT-PT guide registry', () => {
  it('contains the two distinct, canonical content clusters', () => {
    const guides = getGuides();
    expect(guides).toHaveLength(2);
    expect(new Set(guides.map((guide) => guide.slug)).size).toBe(2);
    expect(guides.every((guide) => guide.locale === 'pt-PT')).toBe(true);
    expect(guides.every((guide) => guide.updatedAt === '2026-07-27')).toBe(true);
  });

  it('keeps the Romance guide substantive and links the full cluster', () => {
    const guide = getGuideBySlug('como-transformar-memorias-num-livro-personalizado-para-casal')!;
    expect(editorialWordCount(guide)).toBeGreaterThanOrEqual(1_200);
    expect(editorialWordCount(guide)).toBeLessThanOrEqual(1_600);
    expect(guide.faqs).toHaveLength(6);
    expect(guide.featuredSample.href).toBe('/pt-PT/sample-books/duas-chavenas-uma-vida');
    expect(guide.landingPage.href).toBe('/pt-PT/lp/livro-personalizado-para-casais');
    expect(guide.hub.href).toBe('/pt-PT/lp');
  });

  it('keeps the Supportive Stories guide substantive and within its safety boundary', () => {
    const guide = getGuideBySlug('como-criar-uma-historia-de-apoio-para-uma-mudanca')!;
    const text = JSON.stringify(guide).toLocaleLowerCase('pt-PT');
    expect(editorialWordCount(guide)).toBeGreaterThanOrEqual(1_300);
    expect(editorialWordCount(guide)).toBeLessThanOrEqual(1_700);
    expect(guide.faqs).toHaveLength(7);
    expect(text).toContain('não diagnostica');
    expect(text).toContain('não substitui');
    expect(text).toContain('sem prometer');
    expect(guide.featuredSample.href).toBe(
      '/pt-PT/sample-books/a-primeira-manha-corajosa-da-sofia',
    );
  });

  it('uses visible FAQs as the single schema-ready FAQ source', () => {
    for (const guide of getGuides()) {
      expect(new Set(guide.faqs.map((faq) => faq.question)).size).toBe(guide.faqs.length);
      expect(guide.faqs.every((faq) => faq.answer.length > 80)).toBe(true);
    }
  });
});
