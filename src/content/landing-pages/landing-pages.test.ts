import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  getIndexableLandingPages,
  getLandingPageIndexItems,
  getLandingPageBySlug,
  getLandingPageIntentContext,
  getLandingPageStaticParams,
  getRelatedLandingPageItems,
} from './index';

describe('landing page content registry', () => {
  it('registers the autism landing page as a pt-PT indexable page', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.books).toHaveLength(5);
  });

  it('provides categorized hub items and three crawlable related pages per landing page', () => {
    const hubItems = getLandingPageIndexItems();
    const related = getRelatedLandingPageItems('livro-personalizado-para-casais');

    expect(hubItems.every((item) => item.category.length > 0)).toBe(true);
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.href)).toContain('/pt-PT/lp/livro-personalizado-avos-netos');
    expect(related.every((item) => item.href.startsWith('/pt-PT/lp/'))).toBe(true);
  });

  it('keeps every indexable landing-page quick answer concise and citation-friendly', () => {
    for (const page of getIndexableLandingPages()) {
      const wordCount = page.quickAnswer.body.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(40);
      expect(wordCount).toBeLessThanOrEqual(80);
    }
  });

  it('exposes static params and sitemap candidates from the same registry', () => {
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'livro-personalizado-criancas-autistas',
    });
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'workshops-criancas',
    });
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'livro-personalizado-avos-netos',
    });
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'historias-de-apoio',
    });
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain(
      'livro-personalizado-criancas-autistas',
    );
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain('workshops-criancas');
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain(
      'livro-personalizado-avos-netos',
    );
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain(
      'livro-personalizado-para-casais',
    );
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain('historias-de-apoio');
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
    expect(page?.hero.imageSrc).toContain(
      '/landing-pages/livro-personalizado-criancas-autistas/assets/hero/hero.jpeg',
    );
    expect(page?.ogImageSrc).toContain(
      '/landing-pages/livro-personalizado-criancas-autistas/assets/hero/og-cover.jpeg',
    );
    expect(page?.breadcrumbLabel).toBeTruthy();
    expect(page?.updatedAt).toBe('2026-06-15');
  });

  it('uses the live PEA/PHDA sample books with audio samples', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');
    const audioBase =
      'https://storage.googleapis.com/mythoria-public/landing-page-assets/livro-personalizado-criancas-autistas/audio/';

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
      expect(book.imageSrc).toContain('/card.jpeg');
      expect(book.audio).toBeUndefined();
      expect(book.audioSampleSrc).toMatch(new RegExp(`^${audioBase}.+\\.mp3$`));
      expect(book.sampleChapterHref).toBeUndefined();
      expect(book.chapters).toHaveLength(3);
    });
  });

  it('uses papercut icons across the autism landing page template sections', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page?.templateIcons?.heroEyebrow?.src).toBe('/Papercut_icons/sparkles.webp');
    expect(page?.templateIcons?.ctaArrow?.src).toBe(
      '/Papercut_icons/fa-chevron-right-papercut.webp',
    );
    expect(page?.templateIcons?.quickAnswer?.src).toBe('/Papercut_icons/fa-check-papercut.webp');
    expect(page?.templateIcons?.audioSample?.src).toBe(
      '/Papercut_icons/fa-microphone-papercut.webp',
    );
    expect(page?.templateIcons?.sampleChapter?.src).toBe('/Papercut_icons/openBook.webp');
    expect(page?.templateIcons?.professionalPanel?.src).toBe(
      '/Papercut_icons/fa-heart-business-family-papercut.png',
    );
    expect(page?.templateIcons?.safetyNote?.src).toBe(
      '/Papercut_icons/fa-exclamation-triangle-papercut.webp',
    );
    expect(page?.templateIcons?.formats).toHaveLength(4);
    expect(
      page?.carefulBenefits.items.every(
        (item) => typeof item !== 'string' && item.iconSrc.startsWith('/Papercut_icons/'),
      ),
    ).toBe(true);
  });

  it('does not reference deprecated landing-page-assets paths or removed draft stories', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');
    const serialized = JSON.stringify(page);

    expect(serialized).not.toContain('"imageSrc":"/landing-page-assets/');
    expect(serialized).not.toContain('"hero":{"imageSrc":"/landing-page-assets/');
    expect(serialized).not.toContain('Mateus e o Leão');
    expect(serialized).not.toContain('O Castelo de Estrelas da Maria');
    expect(serialized).not.toContain('Turma 4.º A no Planetário do Porto');
    expect(serialized).not.toContain('A Nossa Horta de Descobertas');
    expect(serialized).not.toContain('Recordar o Avô Manuel');
  });

  it('registers the workshops landing page with workshop-specific sections', () => {
    const page = getLandingPageBySlug('workshops-criancas');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.updatedAt).toBe('2026-07-19');
    expect(page?.primaryCtaHref).toContain('/pt-PT/contactUs');
    expect(page?.hero.imageSrc).toContain('/landing-pages/workshops-criancas/assets/');
    expect(page?.books[0]?.audioSampleSrc).toBe(
      '/landing-pages/workshops-criancas/assets/sample-books/o-gato-que-guardava-a-lua/audio-teaser.mp3',
    );
    expect(page?.books.map((book) => book.title)).toEqual([
      'O Gato que Guardava a Lua',
      'A Final do Bairro das Estrelas',
      'O Clube dos Mapas Impossíveis',
    ]);
    expect(page?.templateIcons?.heroEyebrow?.src).toBe('/Papercut_icons/sparkles.webp');
    expect(page?.templateIcons?.ctaArrow?.src).toBe(
      '/Papercut_icons/fa-chevron-right-papercut.webp',
    );
    expect(page?.templateIcons?.sampleChapter?.src).toBe('/Papercut_icons/openBook.webp');
    expect(page?.templateIcons?.formats).toHaveLength(4);
    expect(page?.books).toHaveLength(3);
    expect(page?.books.every((book) => !book.chapters)).toBe(true);
    expect(
      page?.books.every((book) => book.sampleChapter?.imageSrc.includes('/chapter-01.jpeg')),
    ).toBe(true);
    expect(page?.books.every((book) => book.sampleChapter?.paragraphs.length)).toBe(true);
    expect(page?.workshop?.audiences.items.length).toBeGreaterThanOrEqual(6);
    expect(page?.workshop?.paperToBook.steps.length).toBeGreaterThanOrEqual(7);
    expect(page?.workshop?.ageActivities.items).toHaveLength(3);
    expect(page?.workshop?.exampleLibrary).toBeUndefined();
    expect(page?.workshop?.personas).toBeUndefined();
    expect(page?.workshop?.learningOutcomes.items).toHaveLength(6);
    expect(
      page?.workshop?.learningOutcomes.items.every((item) =>
        item.iconSrc?.startsWith('/Papercut_icons/'),
      ),
    ).toBe(true);
    expect(page?.glossary).toBeUndefined();
    expect(page?.faq).toHaveLength(7);
    expect(page?.structuredData?.serviceName).toContain('Workshops Mythoria');
    expect(serialized).not.toContain('landing page');
    expect(serialized).not.toContain('comprador B2B');
    expect(serialized).not.toContain('produto premium');
    expect(serialized).not.toContain('programador');
  });

  it('builds localized landing page index links from the registry', () => {
    const hrefs = getLandingPageIndexItems().map((page) => page.href);

    expect(hrefs).toContain('/pt-PT/lp/livro-personalizado-criancas-autistas');
    expect(hrefs).toContain('/pt-PT/lp/workshops-criancas');
    expect(hrefs).toContain('/pt-PT/lp/livro-personalizado-avos-netos');
  });

  it('registers the grandparents landing page with diaspora and guided creation sections', () => {
    const page = getLandingPageBySlug('livro-personalizado-avos-netos');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.riskRating).toBe('yellow');
    expect(page?.updatedAt).toBe('2026-06-28');
    expect(page?.primaryIntent).toBe('grandparents');
    expect(page?.books).toHaveLength(5);
    expect(page?.books.map((book) => book.title)).toEqual([
      'A Receita das Estrelas da Avó',
      'O Comboio dos Domingos do Avô',
      'A Mala que Falava Português',
      'O Jardim das Fotografias Antigas',
      'As Férias na Casa Amarela',
    ]);
    expect(page?.hero.imageSrc).toBe(
      '/landing-pages/livro-personalizado-avos-netos/assets/books/a-receita-das-estrelas-da-avo/feature.jpeg',
    );
    expect(page?.ogImageSrc).toBe(
      '/landing-pages/livro-personalizado-avos-netos/assets/books/a-receita-das-estrelas-da-avo/feature.jpeg',
    );
    page?.books.forEach((book) => {
      expect(book.imageSrc).toMatch(
        /^\/landing-pages\/livro-personalizado-avos-netos\/assets\/books\/.+\/feature\.jpeg$/,
      );
      expect(book.sampleChapter?.imageSrc).toMatch(
        /^\/landing-pages\/livro-personalizado-avos-netos\/assets\/books\/.+\/cover\.jpeg$/,
      );
      expect(book.audioSampleSrc).toMatch(
        /^\/landing-pages\/livro-personalizado-avos-netos\/assets\/books\/.+\/audio-teaser\.mp3$/,
      );
      expect(book.sampleChapter?.paragraphs.length).toBeGreaterThanOrEqual(6);
    });
    expect(page?.personalization?.groups).toHaveLength(5);
    expect(page?.agePaths?.items).toHaveLength(3);
    expect(page?.diaspora?.languageExamples.length).toBeGreaterThanOrEqual(4);
    expect(page?.faq.length).toBeGreaterThanOrEqual(12);
    expect(page?.templateIcons?.heroEyebrow?.src).toBe('/Papercut_icons/sparkles.webp');
    expect(page?.carefulBenefits.items).toHaveLength(5);
    expect(
      page?.carefulBenefits.items.every(
        (item) => typeof item !== 'string' && item.iconSrc.startsWith('/Papercut_icons/'),
      ),
    ).toBe(true);
    expect(serialized).toContain('Mirandês');
    expect(serialized).toContain('Português + francês');
    expect(serialized).not.toContain('/SampleBooks');
    expect(serialized).not.toContain('Gerar com IA');
  });

  it('builds homepage intent context for canonical landing page intents only', () => {
    expect(getLandingPageIntentContext('pt-PT', 'livro-personalizado-avos-netos')).toEqual({
      intent: 'grandparents',
    });
    expect(getLandingPageIntentContext('pt-PT', 'workshops-criancas')).toBeNull();
  });

  it('registers the approved supportive stories hub as an indexable page', () => {
    const page = getLandingPageBySlug('historias-de-apoio');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.riskRating).toBe('yellow');
    expect(page?.primaryIntent).toBe('kids_transitions');
    expect(page?.supportHub?.paths).toHaveLength(2);
    expect(page?.supportHub?.challenges).toHaveLength(12);
    expect(new Set(page?.supportHub?.challenges.map((challenge) => challenge.id)).size).toBe(12);
    expect(
      page?.supportHub?.challenges.every((challenge) =>
        ['kids_transitions', 'pet_stories', 'remembrance'].includes(challenge.primaryIntent),
      ),
    ).toBe(true);
    expect(page?.books).toHaveLength(6);
    expect(page?.books.every((book) => !book.fictionalLabel)).toBe(true);
    expect(page?.books.every((book) => book.sampleChapter?.paragraphs.length === 6)).toBe(true);
    expect(page?.faq).toHaveLength(12);
    expect(page?.faq.every((item) => item.answer.length >= 150)).toBe(true);
    expect(page?.faq.some((item) => item.question.includes('tema difícil'))).toBe(true);
    expect(page?.showFormatsNearProcess).toBe(false);
    expect(page?.forProfessionals).toBeUndefined();
    expect(page?.structuredData?.includeProduct).toBe(false);
    expect(page?.trustBadges).toEqual([
      'Conta adulta',
      'Privado por defeito',
      'Reveja antes de partilhar',
    ]);
    expect(serialized).not.toContain('4.9');
    expect(serialized).not.toContain('29.90');
    expect(serialized).not.toContain('Gerar com IA');
    expect(serialized).not.toContain('garante uma transição feliz');
    expect(serialized).not.toContain('clinicamente comprovado');
    expect(serialized).not.toContain('não diagnostica, trata nem garante resultados');
  });

  it('lists the supportive stories URL in the directory while preserving intent context', () => {
    expect(getLandingPageIndexItems().map((page) => page.href)).toContain(
      '/pt-PT/lp/historias-de-apoio',
    );
    expect(getLandingPageIntentContext('pt-PT', 'historias-de-apoio')).toEqual({
      intent: 'kids_transitions',
    });
  });

  it('registers the indexable romance landing page with five complete samples', () => {
    const page = getLandingPageBySlug('livro-personalizado-para-casais');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.primaryIntent).toBe('romance');
    expect(page?.riskRating).toBe('green');
    expect(page?.indexable).toBe(true);
    expect(page?.showFormatsNearHero).toBe(false);
    expect(page?.structuredData?.includeProduct).toBe(false);
    expect(page?.testimonials).toBeUndefined();
    expect(page?.books.map((book) => book.title)).toEqual([
      'Inês & Diogo — Um Amor Inesperado',
      'O Nosso Primeiro Beijo Foi Só o Princípio',
      'Duas Chávenas, Uma Vida',
      'Leonor & Matilde — Dois Países, Uma Casa',
      'Rui & Tomás — O Último Capítulo Antes do Sim',
    ]);
    expect(page?.books.every((book) => book.fictionalLabel === undefined)).toBe(true);
    expect(page?.books.every((book) => book.sampleChapter?.paragraphs.length === 6)).toBe(true);
    expect(page?.trustBadges).toEqual(['Privado por defeito', 'Reveja antes de oferecer']);
    expect(page?.trustAndPrivacy?.items).toHaveLength(4);
    expect(page?.useCases?.items).toHaveLength(6);
    expect(page?.faq).toHaveLength(13);
    expect(page?.faq.every((entry) => entry.answer.length >= 120)).toBe(true);

    const localAssets = [
      page?.hero.imageSrc,
      page?.ogImageSrc,
      ...(page?.books.flatMap((book) => [
        book.imageSrc,
        book.sampleChapter?.imageSrc,
        book.audioSampleSrc,
      ]) ?? []),
    ].filter((asset): asset is string => Boolean(asset));
    localAssets.forEach((asset) => {
      expect(existsSync(join(process.cwd(), 'public', asset.replace(/^\//, '')))).toBe(true);
    });

    expect(getLandingPageIndexItems().map((item) => item.href)).toContain(
      '/pt-PT/lp/livro-personalizado-para-casais',
    );
    expect(getLandingPageIntentContext('pt-PT', 'livro-personalizado-para-casais')).toEqual({
      intent: 'romance',
    });
    expect(serialized).not.toContain('29.90');
    expect(serialized).not.toContain('4.9');
    expect(serialized).not.toContain('garantia de entrega');
    expect(serialized).not.toContain('clinicamente comprovado');
    expect(serialized.toLowerCase()).not.toContain('ficcion');
  });
});
