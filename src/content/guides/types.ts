export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideLink {
  href: string;
  label: string;
}

export interface GuideContent {
  locale: 'pt-PT';
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  updatedAt: string;
  readingTime: string;
  intro: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  featuredSample: GuideLink & { title: string };
  landingPage: GuideLink;
  hub: GuideLink;
}
