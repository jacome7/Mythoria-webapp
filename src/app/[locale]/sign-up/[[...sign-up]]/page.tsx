import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import SignUpClient from './SignUpClient'

export function generateStaticParams() {
  return [
    { locale: 'en-US', 'sign-up': [] },
    { locale: 'pt-PT', 'sign-up': [] }
  ];
}

export default async function SignUpPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('auth');
  
  // Extract all needed translations
  const translations = {
    title: t('signUp.title'),
    subtitle: t('signUp.subtitle'),
    pageTitle: t('signUp.pageTitle'),
    pageSubtitle: t('signUp.pageSubtitle'),
    features: {
      free: t('signUp.features.free'),
      character: t('signUp.features.character'),
      quality: t('signUp.features.quality'),
      creativity: t('signUp.features.creativity')
    }
  };
  
  return <SignUpClient locale={locale} translations={translations} />
}
