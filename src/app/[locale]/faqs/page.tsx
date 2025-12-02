import FaqComponent from '@/components/faq/FaqComponent';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FaqPage' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: `https://mythoria.pt/${locale}/faqs/` },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
  };
}

export default async function FaqsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FaqPage' });
  const tFaq = await getTranslations({ locale, namespace: 'Faq' });

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <header className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary">{t('title')}</h1>
          <p className="text-lg text-base-content/70 max-w-3xl mx-auto">{t('subtitle')}</p>
        </header>

        <section className="bg-base-200 rounded-box shadow-xl p-6 md:p-10">
          <FaqComponent
            searchPlaceholder={tFaq('searchPlaceholder')}
            allSectionsLabel={tFaq('allSections')}
            noResultsMessage={tFaq('noResults')}
            loadingMessage={tFaq('loading')}
            errorMessage={tFaq('error')}
            showAllEntries
          />
        </section>
      </div>
    </div>
  );
}
