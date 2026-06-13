export interface LandingPageBook {
  id: string;
  title: string;
  synopsis: string;
  excerpt: string;
  imageSrc: string;
  imageAlt: string;
  styleLabel: string;
  contextLabel: string;
}

export interface LandingPageFaq {
  question: string;
  answer: string;
}

export interface LandingPageUseCase {
  title: string;
  body: string;
}

export interface LandingPageGlossaryTerm {
  term: string;
  definition: string;
}

export interface LandingPageContent {
  slug: string;
  locale: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryIntent: string;
  riskRating: 'green' | 'yellow' | 'red';
  updatedAt: string;
  indexable: boolean;
  /** Short label for the breadcrumb / structured data (falls back to `title`). */
  breadcrumbLabel?: string;
  /** Dedicated 1200x630 social/OG image (falls back to `hero.imageSrc`). */
  ogImageSrc?: string;
  primaryCta: string;
  secondaryCta: string;
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    imageSrc: string;
    imageAlt: string;
  };
  quickAnswer: {
    title: string;
    body: string;
  };
  /** Optional explainer (e.g. "what is a social story?"). */
  socialStoryExplainer?: {
    title: string;
    body: string[];
  };
  /** Optional grid of concrete, query-shaped use cases. */
  useCases?: {
    title: string;
    intro?: string;
    items: LandingPageUseCase[];
  };
  intro: {
    title: string;
    body: string[];
  };
  whyThisFits: {
    title: string;
    body: string[];
  };
  carefulBenefits: {
    title: string;
    items: string[];
  };
  books: LandingPageBook[];
  process: {
    title: string;
    steps: string[];
  };
  formats: {
    title: string;
    items: string[];
  };
  /** Optional section addressed to therapists, educators and partners. */
  forProfessionals?: {
    title: string;
    body: string[];
    ctaLabel: string;
    /** Localized path/URL for the CTA (falls back to the contactUs page). */
    ctaHref?: string;
  };
  /** Optional glossary of key terms (long-tail SEO + entity clarity). */
  glossary?: {
    title: string;
    terms: LandingPageGlossaryTerm[];
  };
  faq: LandingPageFaq[];
  safetyNote: {
    title: string;
    body: string;
  };
  finalCta: {
    title: string;
    body: string;
  };
}
