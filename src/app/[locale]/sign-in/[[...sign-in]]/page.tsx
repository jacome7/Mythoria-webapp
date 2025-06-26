import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import SignInClient from './SignInClient'

export function generateStaticParams() {
  return [
    { locale: 'en-US', 'sign-in': [] },
    { locale: 'pt-PT', 'sign-in': [] }
  ];
}

export default async function SignInPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('auth');
  
  // Extract all needed translations
  const translations = {
    title: t('signIn.title'),
    subtitle: t('signIn.subtitle'),
    pageTitle: t('signIn.pageTitle'),
    pageSubtitle: t('signIn.pageSubtitle'),
    firstTimeText: t('signIn.firstTimeText'),
    createAccountLink: t('signIn.createAccountLink'),
    createAccountText: t('signIn.createAccountText'),
    features: {
      unlimited: t('signIn.features.unlimited'),
      library: t('signIn.features.library'),
      customize: t('signIn.features.customize')
    }
  };
  
  return <SignInClient locale={locale} translations={translations} />
}
