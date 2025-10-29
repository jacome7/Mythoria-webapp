'use client';

import { useTranslations } from 'next-intl';
import ContactPageContent from '../../../components/ContactPageContent';
import ScrollFadeIn from '@/components/ScrollFadeIn';

export default function ContactUsPage() {
  const tContactUsPage = useTranslations('ContactUsPage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header Section */}
        <ScrollFadeIn>
          <header className="text-center mb-16">
            <h1 className="text-5xl font-bold text-primary">{tContactUsPage('title')}</h1>
            <p className="text-xl mt-4 text-gray-700">{tContactUsPage('intro')}</p>
          </header>
        </ScrollFadeIn>

        <ScrollFadeIn delay={100}>
          <ContactPageContent />
        </ScrollFadeIn>
      </div>
    </div>
  );
}
