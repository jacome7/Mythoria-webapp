import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import SignUpClient from './SignUpClient';
import { getLeadSession } from '@/lib/lead-session';

export function generateStaticParams() {
  return [
    { locale: 'en-US', 'sign-up': [] },
    { locale: 'pt-PT', 'sign-up': [] },
    { locale: 'es-ES', 'sign-up': [] },
    { locale: 'fr-FR', 'sign-up': [] },
    { locale: 'de-DE', 'sign-up': [] },
  ];
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tSignUpPage = await getTranslations('SignUpPage');

  // Extract all needed translations
  const translations = {
    title: tSignUpPage('title'),
    subtitle: tSignUpPage('subtitle'),
    pageTitle: tSignUpPage('pageTitle'),
    pageSubtitle: tSignUpPage('pageSubtitle'),
    features: {
      free: tSignUpPage('features.free'),
      character: tSignUpPage('features.character'),
      quality: tSignUpPage('features.quality'),
      creativity: tSignUpPage('features.creativity'),
    },
  };

  // Check for lead session to pre-fill form
  const leadSession = await getLeadSession();

  return <SignUpClient locale={locale} translations={translations} leadSession={leadSession} />;
}
