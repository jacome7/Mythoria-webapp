import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PricingPage' });

  return buildStaticPageMetadata({
    locale,
    path: '/pricing',
    title: `${t('header.title')} | Mythoria`,
    description: t('header.subtitle'),
  });
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
