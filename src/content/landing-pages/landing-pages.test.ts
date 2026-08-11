import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getIndexableLandingPages,
  getLandingPageIndexItems,
  getLandingPage,
  getLandingPageBySlug,
  getLandingPageTranslations,
  getLandingPageIntentContext,
  getLandingPageHubUpdatedAt,
  getHomepageLandingPageGuides,
  getLandingPageStaticParams,
  getRelatedLandingPageItems,
} from './index';

describe('landing page content registry', () => {
  it('registers exactly sixteen variants in the four translated families without German pages', () => {
    const translationKeys = [
      'personalized-children-books',
      'family-travel',
      'romance-gifts',
      'grandparents-stories',
    ] as const;
    const variants = translationKeys.flatMap((key) => getLandingPageTranslations(key));

    expect(variants).toHaveLength(16);
    expect(new Set(variants.map((page) => `${page.locale}:${page.slug}`)).size).toBe(16);
    expect(variants.map((page) => page.locale)).not.toContain('de-DE');
    for (const key of translationKeys) {
      expect(
        getLandingPageTranslations(key)
          .map((page) => page.locale)
          .sort(),
      ).toEqual(['en-US', 'es-ES', 'fr-FR', 'pt-PT']);
    }
  });

  it('resolves localized slugs and preserves stable attribution intents', () => {
    expect(getLandingPage('en-US', 'personalized-vacation-book')?.primaryIntent).toBe(
      'family_travels',
    );
    expect(getLandingPage('es-ES', 'libro-personalizado-para-parejas')?.primaryIntent).toBe(
      'romance',
    );
    expect(
      getLandingPage('fr-FR', 'livre-personnalise-pour-grands-parents-et-petits-enfants')
        ?.primaryIntent,
    ).toBe('grandparents');
    expect(getLandingPage('de-DE', 'personalized-vacation-book')).toBeUndefined();
    expect(getLandingPage('es-ES', 'personalized-vacation-book')).toBeUndefined();
  });

  it('derives homepage cards from the locale-aware registry', () => {
    expect(getHomepageLandingPageGuides('pt-PT')).toHaveLength(7);
    expect(getHomepageLandingPageGuides('en-US')).toHaveLength(4);
    expect(getHomepageLandingPageGuides('es-ES')).toHaveLength(4);
    expect(getHomepageLandingPageGuides('fr-FR')).toHaveLength(4);
    expect(getHomepageLandingPageGuides('de-DE')).toHaveLength(0);
  });

  it('localizes fictional character names and relevant settings in every translated market', () => {
    const visibleBookCopy = (locale: string) =>
      (
        [
          'personalized-children-books',
          'family-travel',
          'romance-gifts',
          'grandparents-stories',
        ] as const
      )
        .flatMap((key) => getLandingPageTranslations(key))
        .filter((page) => page.locale === locale)
        .flatMap((page) => page.books)
        .map((book) =>
          [
            book.title,
            book.synopsis,
            book.excerpt,
            book.imageAlt,
            book.sampleChapter?.title,
            ...(book.sampleChapter?.paragraphs ?? []),
          ].join(' '),
        )
        .join(' ');

    const english = visibleBookCopy('en-US');
    expect(english).toContain('Eleanor');
    expect(english).toContain('Maya and the Moonlight Bakery');
    expect(english).toContain('Brooklyn Public Library');
    expect(english).toContain('Brooklyn');
    expect(english).toContain('New York Aquarium');
    expect(english).not.toMatch(/Leonor|Tomás|Inês|Diogo|Matilde|Rui/);

    const spanish = visibleBookCopy('es-ES');
    expect(spanish).toContain('Inés y Diego');
    expect(spanish).toContain('Lucía y el Jardín');
    expect(spanish).toContain('Madrid');
    expect(spanish).toContain('Oceanogràfic');
    expect(spanish).not.toMatch(/Inês|Diogo|Rui/);

    const french = visibleBookCopy('fr-FR');
    expect(french).toContain('Léonie');
    expect(french).toContain('Théo et la Carte');
    expect(french).toContain('Inès & Hugo');
    expect(french).toContain('Aquarium de Paris');
    expect(french).not.toMatch(/Leonor|Tomás|Inês|Diogo|Matilde|Rui/);
  });

  it('derives a stable hub lastmod from visible editorial dates', () => {
    expect(getLandingPageHubUpdatedAt()).toBe('2026-08-08');
  });

  it('gives every indexable landing page complete examples with playable audio', () => {
    for (const page of getIndexableLandingPages()) {
      expect(page.books.length).toBeGreaterThan(0);
      expect(page.books.every((book) => Boolean(book.audioSampleSrc))).toBe(true);
      expect(page.books.every((book) => Boolean(book.title && book.synopsis && book.excerpt))).toBe(
        true,
      );
    }
  });

  it('registers the autism landing page as a pt-PT indexable page', () => {
    const page = getLandingPageBySlug('livro-personalizado-criancas-autistas');

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.indexable).toBe(true);
    expect(page?.books).toHaveLength(5);
  });

  it('provides categorized hub items and three crawlable related pages per landing page', () => {
    const hubItems = getLandingPageIndexItems();
    const related = getRelatedLandingPageItems('pt-PT', 'livro-personalizado-para-casais');

    expect(hubItems.every((item) => item.category.length > 0)).toBe(true);
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.href)).toContain('/pt-PT/lp/livro-personalizado-avos-netos');
    expect(related.every((item) => item.href.startsWith('/pt-PT/lp/'))).toBe(true);
  });

  it('only returns related pages that exist in the same locale', () => {
    const related = getRelatedLandingPageItems('fr-FR', 'livre-personnalise-pour-couples');
    expect(related).toHaveLength(2);
    expect(related.every((item) => item.href.startsWith('/fr-FR/lp/'))).toBe(true);
    expect(JSON.stringify(related)).not.toContain('/pt-PT/');
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
    expect(getIndexableLandingPages().map((page) => page.slug)).toContain(
      'livro-personalizado-ferias',
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
    expect(page?.hero.imageSrc).toContain(
      '/landing-pages/livro-personalizado-criancas-autistas/assets/hero/hero.jpeg',
    );
    expect(page?.ogImageSrc).toContain(
      '/landing-pages/livro-personalizado-criancas-autistas/assets/hero/og-cover.jpeg',
    );
    expect(page?.breadcrumbLabel).toBeTruthy();
    expect(page?.updatedAt).toBe('2026-08-04');
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
    expect(page?.updatedAt).toBe('2026-08-04');
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
    expect(page?.updatedAt).toBe('2026-08-04');
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
    expect(JSON.stringify(page?.books)).not.toMatch(/fictional|ficcional/i);
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
    expect(JSON.stringify(page?.books)).not.toMatch(/fictional|ficcional/i);
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

  it('registers the travel landing page with its comparison, B2B route and eight samples', () => {
    const page = getLandingPageBySlug('livro-personalizado-ferias');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.primaryIntent).toBe('family_travels');
    expect(page?.riskRating).toBe('yellow');
    expect(page?.indexable).toBe(true);
    expect(page?.comparison?.rows).toHaveLength(4);
    expect(page?.books).toHaveLength(8);
    expect(
      page?.books.every(
        (book) => book.chapterCountLabel === undefined && book.durationLabel === undefined,
      ),
    ).toBe(true);
    expect(page?.trustBadges).toBeUndefined();
    expect(page?.showEditorialReview).toBe(false);
    expect(page?.booksSection?.eyebrow).toBeUndefined();
    expect(page?.safetyNote).toBeUndefined();
    expect(page?.formats.items).toHaveLength(4);
    expect(page?.forProfessionals?.items).toHaveLength(4);
    expect(page?.forProfessionals?.ctaHref).toBe('/pt-PT/partners');
    expect(page?.trustAndPrivacy?.items).toHaveLength(4);
    expect(page?.faq).toHaveLength(7);
    expect(page?.testimonials).toBeUndefined();
    expect(page?.structuredData?.includeProduct).toBe(false);

    const localAssets = [
      page?.hero.imageSrc,
      page?.ogImageSrc,
      ...(page?.templateIcons?.formats?.map((icon) => icon.src) ?? []),
      ...(page?.carefulBenefits.items.flatMap((item) =>
        typeof item === 'string' ? [] : [item.iconSrc],
      ) ?? []),
      ...(page?.useCases?.items.map((item) => item.iconSrc) ?? []),
      ...(page?.forProfessionals?.items?.map((item) => item.iconSrc) ?? []),
      ...(page?.books.flatMap((book) => [
        book.imageSrc,
        book.sampleChapter?.imageSrc,
        book.audioSampleSrc,
      ]) ?? []),
    ].filter((asset): asset is string => Boolean(asset));
    localAssets.forEach((asset) => {
      expect(existsSync(join(process.cwd(), 'public', asset.replace(/^\//, '')))).toBe(true);
    });

    expect(getLandingPageIndexItems()).toContainEqual(
      expect.objectContaining({
        category: 'Viagens e memórias',
        href: '/pt-PT/lp/livro-personalizado-ferias',
      }),
    );
    expect(getLandingPageIntentContext('pt-PT', 'livro-personalizado-ferias')).toEqual({
      intent: 'family_travels',
    });
    expect(serialized).not.toContain('centenas de fotografias automaticamente');
    expect(serialized).not.toContain('QR code');
    expect(serialized).not.toContain('revenue share');
    expect(serialized).not.toContain('testemunho');
    expect(serialized).not.toContain('AggregateRating');
    expect(serialized.toLowerCase()).not.toContain('ficcion');
  });

  it('registers the indexable personalized children landing with five complete books', () => {
    const page = getLandingPageBySlug('livro-personalizado-crianca');
    const serialized = JSON.stringify(page);

    expect(page).toBeDefined();
    expect(page?.locale).toBe('pt-PT');
    expect(page?.primaryIntent).toBe('kids_adventures');
    expect(page?.riskRating).toBe('yellow');
    expect(page?.indexable).toBe(true);
    expect(page?.editorialReviewDaysAgo).toBe(17);
    expect(page?.showInLandingPageIndex).toBe(true);
    expect(page?.homepageCard).toEqual({
      title: 'Livro personalizado para crianças',
      description:
        'Transforme interesses, memórias e desenhos numa aventura criada à medida da criança.',
    });
    expect(page?.testimonials).toBeUndefined();
    expect(page?.structuredData?.includeProduct).toBe(false);
    expect(page?.primaryCtaHref).toBe(
      '/pt-PT/tell-your-story/step-1?landingSlug=livro-personalizado-crianca&primaryIntent=kids_adventures',
    );
    expect(page?.books.map((book) => book.title)).toEqual([
      'Mia e a Pastelaria da Lua',
      'Tomás e o Mapa das Portas Escondidas',
      'Lia e o Jardim das Palavras Perdidas',
      'A Equipa que Marcou um Golo nas Estrelas',
      'Inês e o Robô Feito de Desenhos',
    ]);
    expect(page?.books.map((book) => book.styleLabel)).toEqual([
      'Claymation',
      'Papercut',
      'Aguarela',
      'Banda desenhada europeia',
      'Lápis de cor',
    ]);
    expect(page?.books.every((book) => Boolean(book.audioSampleTranscript))).toBe(true);
    expect(page?.books.every((book) => Boolean(book.sampleChapterHref))).toBe(true);
    expect(
      page?.books.every((book) => book.sampleChapter?.imageSrc.endsWith('/chapter-01.jpeg')),
    ).toBe(true);
    expect(page?.faq).toHaveLength(15);
    expect(page?.useCases?.items).toHaveLength(6);
    expect(page?.personalization?.groups).toHaveLength(5);
    expect(page?.trustBadges).toEqual([
      'Conta adulta',
      'Privado por defeito',
      'Reveja antes de partilhar',
    ]);
    expect(getLandingPageStaticParams()).toContainEqual({
      locale: 'pt-PT',
      slug: 'livro-personalizado-crianca',
    });
    expect(getIndexableLandingPages().map((candidate) => candidate.slug)).toContain(
      'livro-personalizado-crianca',
    );
    expect(getLandingPageIndexItems().map((candidate) => candidate.slug)).toContain(
      'livro-personalizado-crianca',
    );
    expect(getHomepageLandingPageGuides('pt-PT')).toContainEqual({
      href: '/pt-PT/lp/livro-personalizado-crianca',
      title: 'Livro personalizado para crianças',
      description:
        'Transforme interesses, memórias e desenhos numa aventura criada à medida da criança.',
    });

    const localAssets = [
      page?.hero.imageSrc,
      page?.ogImageSrc,
      ...(page?.useCases?.items.map((item) => item.iconSrc) ?? []),
      ...(page?.books.flatMap((book) => [
        book.imageSrc,
        book.sampleChapter?.imageSrc,
        book.audioSampleSrc,
      ]) ?? []),
    ].filter((asset): asset is string => Boolean(asset));
    localAssets.forEach((asset) => {
      expect(existsSync(join(process.cwd(), 'public', asset.replace(/^\//, '')))).toBe(true);
    });

    const assetManifest = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public',
          'landing-pages',
          'livro-personalizado-crianca',
          'assets',
          'asset-manifest.json',
        ),
        'utf8',
      ),
    ) as { books: Array<{ title: string }> };
    expect(assetManifest.books.map((book) => book.title)).toEqual(
      page?.books.map((book) => book.title),
    );

    expect(serialized.toLowerCase()).not.toMatch(/ficcional|exemplo ficcional/);
    expect(serialized).not.toContain('Limites');
    expect(serialized.toLowerCase()).not.toMatch(/família real|cliente|testemunho/);
    expect(serialized).not.toContain('29.90');
    expect(serialized).not.toContain('48 horas');
    expect(serialized).not.toContain('AggregateRating');
  });
});
