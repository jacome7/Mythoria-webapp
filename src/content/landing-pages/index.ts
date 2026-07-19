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

const landingPageCategories: Record<string, string> = {
  'livro-personalizado-avos-netos': 'Família e relações',
  'livro-personalizado-para-casais': 'Família e relações',
  'livro-personalizado-criancas-autistas': 'Crianças e aprendizagem',
  'workshops-criancas': 'Crianças e aprendizagem',
  'historias-de-apoio': 'Histórias de apoio',
};

const relatedLandingPageSlugs: Record<string, string[]> = {
  'livro-personalizado-avos-netos': [
    'livro-personalizado-para-casais',
    'historias-de-apoio',
    'livro-personalizado-criancas-autistas',
  ],
  'livro-personalizado-para-casais': [
    'livro-personalizado-avos-netos',
    'historias-de-apoio',
    'workshops-criancas',
  ],
  'livro-personalizado-criancas-autistas': [
    'historias-de-apoio',
    'workshops-criancas',
    'livro-personalizado-avos-netos',
  ],
  'historias-de-apoio': [
    'livro-personalizado-criancas-autistas',
    'livro-personalizado-avos-netos',
    'livro-personalizado-para-casais',
  ],
  'workshops-criancas': [
    'livro-personalizado-criancas-autistas',
    'livro-personalizado-avos-netos',
    'livro-personalizado-para-casais',
  ],
};

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
      category: landingPageCategories[page.slug] ?? 'Outros guias',
    }));
}

export function getRelatedLandingPageItems(slug: string) {
  const relatedSlugs = relatedLandingPageSlugs[slug] ?? [];

  return relatedSlugs
    .map((relatedSlug) => landingPages.find((page) => page.slug === relatedSlug))
    .filter((page): page is LandingPageContent => Boolean(page?.indexable))
    .map((page) => ({
      title: page.title,
      description: page.metaDescription,
      href: `/${page.locale}/lp/${page.slug}`,
    }));
}

export type { LandingPageBook, LandingPageContent, LandingPageTemplateIcon };
