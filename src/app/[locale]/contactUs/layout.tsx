import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContactUsPage' });

  return buildStaticPageMetadata({
    locale,
    path: '/contactUs',
    title: `${t('title')} | Mythoria`,
    description: t('intro'),
  });
}

export default function ContactUsLayout({ children }: { children: ReactNode }) {
  return children;
}
