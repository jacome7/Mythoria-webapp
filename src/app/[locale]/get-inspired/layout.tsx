import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'GetInspiredPage' });

  return buildStaticPageMetadata({
    locale,
    path: '/get-inspired',
    title: t('gallery.title'),
    description: t('gallery.subtitle'),
  });
}

export default function GetInspiredLayout({ children }: { children: React.ReactNode }) {
  return children;
}
