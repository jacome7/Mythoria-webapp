import type { LandingPageBook, LandingPageTemplateIcons, LandingPageTranslationKey } from './types';

export type LocalizedLandingLocale = 'en-US' | 'es-ES' | 'fr-FR';

export interface LocalizedBookCopy {
  sourceSlug: string;
  title: string;
  synopsis: string;
  excerpt: string;
  sampleTitle: string;
  sampleParagraphs: string[];
  imageAlt: string;
  styleLabel: string;
  contextLabel: string;
  ageLabel: string;
  audioSampleTitle: string;
  audioTranscript?: string;
  audioTranscriptLabel?: string;
  sampleImageFile?: string;
  sampleImageAlt?: string;
}

const iconBase = '/Papercut_icons';

export const commonTemplateIcons: LandingPageTemplateIcons = {
  heroEyebrow: { src: `${iconBase}/sparkles.webp`, alt: '' },
  ctaArrow: { src: `${iconBase}/fa-chevron-right-papercut.webp`, alt: '' },
  quickAnswer: { src: `${iconBase}/fa-check-papercut.webp`, alt: '' },
  audioSample: { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
  sampleChapter: { src: `${iconBase}/openBook.webp`, alt: '' },
  safetyNote: { src: `${iconBase}/fa-lock-romance-papercut.webp`, alt: '' },
  formats: [
    { src: `${iconBase}/openBook.webp`, alt: '' },
    { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
    { src: `${iconBase}/fa-file-upload-papercut.webp`, alt: '' },
    { src: `${iconBase}/fa-book-open-papercut.webp`, alt: '' },
  ],
};

export function getLocalizedAssetBase(
  sourceLandingSlug: string,
  locale: LocalizedLandingLocale,
): string {
  return `/landing-pages/${sourceLandingSlug}/assets/i18n/${locale}`;
}

export function buildLocalizedBooks({
  translationKey,
  sourceLandingSlug,
  locale,
  books,
}: {
  translationKey: LandingPageTranslationKey;
  sourceLandingSlug: string;
  locale: LocalizedLandingLocale;
  books: LocalizedBookCopy[];
}): LandingPageBook[] {
  const base = getLocalizedAssetBase(sourceLandingSlug, locale);

  return books.map((book, index) => {
    const assetBase = `${base}/books/${book.sourceSlug}`;
    return {
      id: `${translationKey}-${locale}-${index + 1}`,
      slug: `${book.sourceSlug}-${locale.toLowerCase()}`,
      title: book.title,
      synopsis: book.synopsis,
      excerpt: book.excerpt,
      imageSrc: `${assetBase}/feature.jpeg`,
      imageAlt: book.imageAlt,
      styleLabel: book.styleLabel,
      contextLabel: book.contextLabel,
      ageLabel: book.ageLabel,
      audioSampleSrc: `${assetBase}/audio-teaser.mp3`,
      audioSampleTitle: book.audioSampleTitle,
      audioSampleTranscript: book.audioTranscript,
      audioTranscriptLabel: book.audioTranscriptLabel,
      sampleChapter: {
        title: book.sampleTitle,
        imageSrc: `${assetBase}/${book.sampleImageFile ?? 'cover.jpeg'}`,
        imageAlt: book.sampleImageAlt ?? book.imageAlt,
        paragraphs: book.sampleParagraphs,
      },
    };
  });
}

export function getAreaServed(locale: LocalizedLandingLocale): string {
  return locale.split('-')[1]!;
}
