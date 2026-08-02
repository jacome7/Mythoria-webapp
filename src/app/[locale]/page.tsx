import { getIntentContext } from '@/app/i/actions';
import type { IntentContext } from '@/types/intent-context';
import { getFirstQueryValue, getValidatedIntent } from '@/lib/campaign-context';
import HomePageClient from './HomePageClient';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';
import { getHomepageLandingPageGuides } from '@/content/landing-pages';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return buildStaticPageMetadata({
    locale,
    path: '',
    title: t('title'),
    description: t('description'),
  });
}

function buildIntentContext(
  cookieContext: IntentContext | null,
  intentOverride: IntentContext['intent'] | null,
): IntentContext | null {
  if (!intentOverride) return cookieContext;

  return {
    ...cookieContext,
    intent: intentOverride,
  };
}

export default async function Home({ searchParams, params }: HomePageProps) {
  const [query, routeParams, cookieIntentContext] = await Promise.all([
    searchParams,
    params,
    getIntentContext(),
  ]);
  const initialHeroIntentOverride = getValidatedIntent(getFirstQueryValue(query.intent));
  const initialIntentContext = buildIntentContext(cookieIntentContext, initialHeroIntentOverride);
  const homepageGuides = getHomepageLandingPageGuides(routeParams.locale);

  return (
    <HomePageClient
      initialHeroIntentOverride={initialHeroIntentOverride}
      initialIntentContext={initialIntentContext}
      intentOverrideActive={initialHeroIntentOverride !== null}
      homepageGuides={homepageGuides}
    />
  );
}
