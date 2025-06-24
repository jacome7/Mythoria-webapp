import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'DeleteAccount' });

  return {
    title: t('title'),
    description: t('subtitle'),
    robots: {
      index: false, // Don't index this sensitive page
      follow: false,
    },
  };
}
