import { autismStoriesLandingPage } from './autism-stories.pt-PT';
import { grandparentsStoriesLandingPage } from './grandparents-stories.pt-PT';
import { romanceGiftsLandingPage } from './romance-gifts.pt-PT';
import type { LandingPageBook, LandingPageContent, LandingPageTemplateIcon } from './types';
import { supportiveStoriesLandingPage } from './supportive-stories.pt-PT';
import { workshopsChildrenLandingPage } from './workshops-criancas.pt-PT';
import { isValidIntent, normalizeIntent } from '@/constants/intents';
import type { IntentContext } from '@/types/intent-context';

const landingPages = [
  autismStoriesLandingPage,
  grandparentsStoriesLandingPage,
  romanceGiftsLandingPage,
  supportiveStoriesLandingPage,
  workshopsChildrenLandingPage,
] satisfies LandingPageContent[];

export function getLandingPageBySlug(slug: string): LandingPageContent | undefined {
  return landingPages.find((page) => page.slug === slug);
}

export function getLandingPageIntentContext(locale: string, slug: string): IntentContext | null {
  const page = landingPages.find((item) => item.locale === locale && item.slug === slug);
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

export function getLandingPageIndexItems() {
  return landingPages
    .filter((page) => page.indexable || page.showInLandingPageIndex)
    .map((page) => ({
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
