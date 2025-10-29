import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PartnersPageContent from '../../../components/PartnersPageContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Partners' });

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    keywords: [
      t('metadata.keywords.0'),
      t('metadata.keywords.1'),
      t('metadata.keywords.2'),
      t('metadata.keywords.3'),
      t('metadata.keywords.4'),
      t('metadata.keywords.5'),
      t('metadata.keywords.6'),
      t('metadata.keywords.7'),
    ],
    openGraph: {
      title: t('metadata.ogTitle'),
      description: t('metadata.ogDescription'),
      type: 'website',
      url: 'https://mythoria.pt/partners',
      images: [
        {
          url: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
          width: 512,
          height: 336,
          alt: t('metadata.ogImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metadata.twitterTitle'),
      description: t('metadata.twitterDescription'),
    },
  };
}

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <PartnersPageContent />
      </div>
    </div>
  );
}
