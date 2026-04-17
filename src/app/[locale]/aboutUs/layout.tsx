import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutUs' });

  return buildStaticPageMetadata({
    locale,
    path: '/aboutUs',
    title: `${t('hero.title')} | Mythoria`,
    description: t('hero.intro'),
  });
}

export default function AboutUsLayout({ children }: { children: ReactNode }) {
  return children;
}
