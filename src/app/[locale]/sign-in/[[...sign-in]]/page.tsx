import { setRequestLocale } from 'next-intl/server';
import SignInClient from './SignInClient';

export function generateStaticParams() {
  return [
    { locale: 'en-US', 'sign-in': [] },
    { locale: 'pt-PT', 'sign-in': [] },
    { locale: 'es-ES', 'sign-in': [] },
    { locale: 'fr-FR', 'sign-in': [] },
  ];
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignInClient locale={locale} />;
}
