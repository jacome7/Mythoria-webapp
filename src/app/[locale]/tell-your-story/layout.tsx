import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'TellYourStoryPage' });

  return buildStaticPageMetadata({
    locale,
    path: '/tell-your-story',
    title: t('signedOut.title'),
    description: t('signedOut.subtitle'),
  });
}

export default function TellYourStoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
