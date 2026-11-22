import HomePageClient from './HomePageClient';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';
import { getHomepageLandingPageGuides } from '@/content/landing-pages';

export const dynamic = 'force-dynamic';

interface HomePageProps {
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

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  const homepageGuides = getHomepageLandingPageGuides(locale);

  return <HomePageClient homepageGuides={homepageGuides} storyTemplatesEnabled />;
}
