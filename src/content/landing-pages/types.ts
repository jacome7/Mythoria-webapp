export interface LandingPageBookAudio {
  src: string;
  label: string;
}

export interface LandingPageBookChapter {
  title: string;
  summary: string;
}

export interface LandingPageBookSampleChapter {
  title: string;
  imageSrc: string;
  imageAlt: string;
  paragraphs: string[];
}

export interface LandingPageBook {
  id: string;
  slug?: string;
  title: string;
  synopsis: string;
  excerpt: string;
  imageSrc: string;
  imageAlt: string;
  styleLabel: string;
  contextLabel: string;
  ageLabel?: string;
  sampleChapterHref?: string;
  audio?: LandingPageBookAudio;
  chapterCountLabel?: string;
  durationLabel?: string;
  chapters?: LandingPageBookChapter[];
  sampleChapter?: LandingPageBookSampleChapter;
  audioSampleSrc?: string;
  audioSampleTitle?: string;
  fictionalLabel?: string;
}

export interface LandingPageFaq {
  question: string;
  answer: string;
}

export interface LandingPageUseCase {
  title: string;
  body: string;
  iconSrc?: string;
  iconAlt?: string;
}

export interface LandingPageIconItem {
  title: string;
  body: string;
  iconSrc: string;
  iconAlt: string;
}

export interface LandingPageGlossaryTerm {
  term: string;
  definition: string;
}

export interface LandingPageTestimonial {
  quote: string;
  author: string;
  role: string;
  location?: string;
  stars?: number;
}

export interface LandingPageBookSection {
  eyebrow?: string;
  title: string;
  intro?: string;
}

export interface LandingPageTemplateIcon {
  src: string;
  alt: string;
}

export interface LandingPageTemplateIcons {
  heroEyebrow?: LandingPageTemplateIcon;
  ctaArrow?: LandingPageTemplateIcon;
  quickAnswer?: LandingPageTemplateIcon;
  audioSample?: LandingPageTemplateIcon;
  professionalPanel?: LandingPageTemplateIcon;
  safetyNote?: LandingPageTemplateIcon;
  sampleChapter?: LandingPageTemplateIcon;
  formats?: LandingPageTemplateIcon[];
}

export interface LandingPageSupportPath {
  id: 'grow-and-change' | 'remember-and-say-goodbye';
  title: string;
  body: string;
  ctaLabel: string;
  tone: 'warm' | 'calm';
}

export interface LandingPageSupportChallenge {
  id: string;
  pathId: LandingPageSupportPath['id'];
  title: string;
  ageRange: string;
  body: string;
  primaryIntent: string;
  priority: number;
  iconSrc: string;
  iconAlt: string;
}

export interface LandingPageSupportHub {
  title: string;
  intro: string;
  paths: LandingPageSupportPath[];
  challengesTitle: string;
  challengesIntro: string;
  initialVisibleCount: number;
  showMoreLabel: string;
  showLessLabel: string;
  challenges: LandingPageSupportChallenge[];
}

export interface LandingPageAnalyticsConfig {
  pageViewEvent?: 'landing_page_view' | 'supportive_story_page_view';
  variant?: string;
}

export interface LandingPageWorkshopStep extends LandingPageIconItem {}

export interface LandingPageAgeActivity {
  ageRange: string;
  title: string;
  objective: string;
  activitySteps: string[];
  concepts: string[];
  exampleTitle: string;
  exampleBody: string;
  imageSrc: string;
  imageAlt: string;
}

export interface LandingPageExampleIdea {
  age: string;
  title: string;
  activityType: string;
  teaches: string;
}

export interface LandingPageLearningOutcome {
  title: string;
  body: string;
  iconSrc?: string;
  iconAlt?: string;
}

export interface LandingPageWorkshopFormat {
  title: string;
  duration: string;
  idealFor: string;
  result: string;
}

export interface LandingPagePersonaExample {
  idea: string;
  persona: string;
  result: string;
}

export interface LandingPageChoiceGroup {
  title: string;
  body: string;
  choices: string[];
  iconSrc?: string;
  iconAlt?: string;
}

export interface LandingPageAgePath {
  ageRange: string;
  title: string;
  body: string;
  steps: string[];
  exampleTitle: string;
  exampleBody: string;
  imageSrc: string;
  imageAlt: string;
}

export interface LandingPageLanguageExample {
  label: string;
  phrase: string;
  note: string;
}

export interface LandingPageDiasporaContent {
  title: string;
  body: string[];
  options: LandingPageIconItem[];
  languageExamples: LandingPageLanguageExample[];
}

export interface LandingPageWorkshopContent {
  audiences: {
    title: string;
    intro: string;
    items: LandingPageIconItem[];
  };
  paperToBook: {
    title: string;
    body: string;
    imageSrc: string;
    imageAlt: string;
    steps: LandingPageWorkshopStep[];
  };
  ageActivities: {
    title: string;
    intro: string;
    items: LandingPageAgeActivity[];
  };
  exampleLibrary?: {
    title: string;
    intro: string;
    items: LandingPageExampleIdea[];
  };
  learningOutcomes: {
    title: string;
    intro: string;
    items: LandingPageLearningOutcome[];
  };
  workshopFormats: {
    title: string;
    intro: string;
    items: LandingPageWorkshopFormat[];
  };
  businessBenefits: {
    title: string;
    intro: string;
    items: LandingPageLearningOutcome[];
  };
  personas?: {
    title: string;
    intro: string;
    items: LandingPagePersonaExample[];
  };
  implementationKit?: {
    title: string;
    intro: string;
    items: LandingPageIconItem[];
  };
  finalResults: {
    title: string;
    intro: string;
    items: LandingPageIconItem[];
  };
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
  /** Lists the page in `/lp` without making it indexable by search engines. */
  showInLandingPageIndex?: boolean;
  /** Shows the formats panel directly below the hero. Defaults to true. */
  showFormatsNearHero?: boolean;
  /** Repeats the formats panel beside the process panel. Defaults to true. */
  showFormatsNearProcess?: boolean;
  /** Short label for the breadcrumb / structured data (falls back to `title`). */
  breadcrumbLabel?: string;
  /** Dedicated 1200x630 social image (falls back to `hero.imageSrc`). */
  ogImageSrc?: string;
  /** Optional dedicated CTA hrefs. Defaults to the story creation flow and #exemplos. */
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  primaryCta: string;
  secondaryCta: string;
  templateIcons?: LandingPageTemplateIcons;
  analytics?: LandingPageAnalyticsConfig;
  supportHub?: LandingPageSupportHub;
  booksSection?: LandingPageBookSection;
  hero: {
    eyebrow: string;
    heading?: string;
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
  personalization?: {
    title: string;
    intro: string;
    groups: LandingPageChoiceGroup[];
    ctaLabel: string;
  };
  agePaths?: {
    title: string;
    intro: string;
    items: LandingPageAgePath[];
  };
  diaspora?: LandingPageDiasporaContent;
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
    items: Array<string | LandingPageIconItem>;
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
  workshop?: LandingPageWorkshopContent;
  faq: LandingPageFaq[];
  safetyNote?: {
    title: string;
    body: string;
  };
  trustAndPrivacy?: {
    title: string;
    intro: string;
    items: LandingPageIconItem[];
  };
  finalCta: {
    title: string;
    body: string;
  };
  trustBadges?: string[];
  testimonials?: {
    title: string;
    intro?: string;
    items: LandingPageTestimonial[];
  };
  structuredData?: {
    about: string[];
    serviceName: string;
    serviceType: string;
    includeProduct?: boolean;
  };
}
