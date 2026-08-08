import { autismStoriesLandingPage } from './autism-stories.pt-PT';
import { childrenBooksLandingPage } from './children-books.pt-PT';
import { familyTravelLandingPage } from './family-travel.pt-PT';
import { grandparentsStoriesLandingPage } from './grandparents-stories.pt-PT';
import { localizedLandingPages } from './localized';
import { romanceGiftsLandingPage } from './romance-gifts.pt-PT';
import { supportiveStoriesLandingPage } from './supportive-stories.pt-PT';
import type {
  LandingPageBook,
  LandingPageContent,
  LandingPageTemplateIcon,
  LandingPageTranslationKey,
} from './types';
import { workshopsChildrenLandingPage } from './workshops-criancas.pt-PT';
import { isValidIntent, normalizeIntent } from '@/constants/intents';
import type { IntentContext } from '@/types/intent-context';

const landingPages = [
  childrenBooksLandingPage,
  autismStoriesLandingPage,
  familyTravelLandingPage,
  grandparentsStoriesLandingPage,
  romanceGiftsLandingPage,
  supportiveStoriesLandingPage,
  workshopsChildrenLandingPage,
  ...localizedLandingPages,
] satisfies LandingPageContent[];

export const LANDING_PAGE_HUB_UPDATED_AT = '2026-07-27';

const landingPageCategories: Record<LandingPageTranslationKey, string> = {
  'personalized-children-books': 'Crianças e aprendizagem',
  'grandparents-stories': 'Família e relações',
  'romance-gifts': 'Família e relações',
  'autism-stories': 'Crianças e aprendizagem',
  'workshops-children': 'Crianças e aprendizagem',
  'supportive-stories': 'Histórias de apoio',
  'family-travel': 'Viagens e memórias',
};

const relatedLandingPageKeys: Record<LandingPageTranslationKey, LandingPageTranslationKey[]> = {
  'personalized-children-books': ['supportive-stories', 'autism-stories', 'grandparents-stories'],
  'grandparents-stories': ['family-travel', 'romance-gifts', 'supportive-stories'],
  'romance-gifts': ['family-travel', 'grandparents-stories', 'supportive-stories'],
  'autism-stories': ['supportive-stories', 'workshops-children', 'grandparents-stories'],
  'supportive-stories': ['autism-stories', 'grandparents-stories', 'family-travel'],
  'workshops-children': ['autism-stories', 'grandparents-stories', 'family-travel'],
  'family-travel': ['grandparents-stories', 'romance-gifts', 'workshops-children'],
};

export function getLandingPage(locale: string, slug: string): LandingPageContent | undefined {
  return landingPages.find((page) => page.locale === locale && page.slug === slug);
}

/** Resolves legacy or wrong-locale URLs whose slug is globally unique. */
export function getLandingPageBySlug(slug: string): LandingPageContent | undefined {
  return landingPages.find((page) => page.slug === slug);
}

export function getLandingPageTranslations(
  translationKey: LandingPageTranslationKey,
): LandingPageContent[] {
  return landingPages.filter((page) => page.translationKey === translationKey);
}

export function getLandingPageIntentContext(locale: string, slug: string): IntentContext | null {
  const page = getLandingPage(locale, slug);
  if (!page) return null;

  const intent = normalizeIntent(page.primaryIntent);
  if (!isValidIntent(intent)) return null;

  return { intent };
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

export function getLandingPageIndexItems(locale = 'pt-PT') {
  return landingPages
    .filter((page) => page.locale === locale && (page.indexable || page.showInLandingPageIndex))
    .map((page) => ({
      title: page.title,
      metaDescription: page.metaDescription,
      locale: page.locale,
      slug: page.slug,
      indexable: page.indexable,
      updatedAt: page.updatedAt,
      href: `/${page.locale}/lp/${page.slug}`,
      category: landingPageCategories[page.translationKey],
    }));
}

export function getHomepageLandingPageGuides(locale: string) {
  return landingPages
    .filter((page) => page.locale === locale && page.indexable && page.homepageCard)
    .map((page) => ({
      href: `/${page.locale}/lp/${page.slug}`,
      title: page.homepageCard!.title,
      description: page.homepageCard!.description,
    }));
}

export function getLandingPageHubUpdatedAt(): string {
  return landingPages
    .filter((page) => page.locale === 'pt-PT' && (page.indexable || page.showInLandingPageIndex))
    .reduce(
      (latest, page) => (page.updatedAt > latest ? page.updatedAt : latest),
      LANDING_PAGE_HUB_UPDATED_AT,
    );
}

export function getRelatedLandingPageItems(locale: string, slug: string) {
  const page = getLandingPage(locale, slug);
  if (!page) return [];

  return relatedLandingPageKeys[page.translationKey]
    .map((translationKey) =>
      landingPages.find(
        (candidate) =>
          candidate.translationKey === translationKey &&
          candidate.locale === locale &&
          candidate.indexable,
      ),
    )
    .filter((candidate): candidate is LandingPageContent => Boolean(candidate))
    .map((candidate) => ({
      title: candidate.title,
      description: candidate.metaDescription,
      href: `/${candidate.locale}/lp/${candidate.slug}`,
    }));
}

export type {
  LandingPageBook,
  LandingPageContent,
  LandingPageTemplateIcon,
  LandingPageTranslationKey,
};
