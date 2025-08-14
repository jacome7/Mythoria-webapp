import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const tDeleteAccount = await getTranslations({ locale, namespace: 'DeleteAccount' });

  return {
    title: tDeleteAccount('title'),
    description: tDeleteAccount('subtitle'),
    robots: {
      index: false, // Don't index this sensitive page
      follow: false,
    },
  };
}
