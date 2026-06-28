import { autismStoriesLandingPage } from './autism-stories.pt-PT';
import { grandparentsStoriesLandingPage } from './grandparents-stories.pt-PT';
import type { LandingPageBook, LandingPageContent, LandingPageTemplateIcon } from './types';
import { workshopsChildrenLandingPage } from './workshops-criancas.pt-PT';

const landingPages = [
  autismStoriesLandingPage,
  grandparentsStoriesLandingPage,
  workshopsChildrenLandingPage,
] satisfies LandingPageContent[];

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

export function getLandingPageIndexItems() {
  return getIndexableLandingPages().map((page) => ({
    title: page.title,
    metaDescription: page.metaDescription,
    locale: page.locale,
    slug: page.slug,
    indexable: page.indexable,
    updatedAt: page.updatedAt,
    href: `/${page.locale}/lp/${page.slug}`,
  }));
}

export type { LandingPageBook, LandingPageContent, LandingPageTemplateIcon };
