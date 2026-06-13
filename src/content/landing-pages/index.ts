import { autismStoriesLandingPage } from './autism-stories.pt-PT';
import type { LandingPageContent } from './types';

const landingPages = [autismStoriesLandingPage] satisfies LandingPageContent[];

export function getLandingPageBySlug(slug: string): LandingPageContent | undefined {
  return landingPages.find((page) => page.slug === slug);
}

export function getIndexableLandingPages(): LandingPageContent[] {
  return landingPages.filter((page) => page.indexable);
}

export function getLandingPageStaticParams(): Array<{ locale: string; slug: string }> {
  return landingPages.map((page) => ({
    locale: page.locale,
    slug: page.slug,
  }));
}

export type { LandingPageContent };
