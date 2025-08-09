import { getTranslations, setRequestLocale } from 'next-intl/server';
import ContactPageContent from '../../../components/ContactPageContent';

interface ContactUsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactUsPage({ params }: ContactUsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ContactUsPage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header Section */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary">{t('title')}</h1>
          <p className="text-xl mt-4 text-gray-700">{t('intro')}</p>
        </header>
        
        <ContactPageContent />
      </div>
    </div>
  );
}
