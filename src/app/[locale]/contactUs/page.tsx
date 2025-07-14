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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-base-content/80 max-w-2xl mx-auto">
            {t('intro')}
          </p>
        </div>
        
        <ContactPageContent />
      </div>
    </div>
  );
}
