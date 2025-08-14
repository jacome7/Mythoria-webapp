import { setRequestLocale } from 'next-intl/server';
import SignUpClient from './SignUpClient';

export function generateStaticParams() {
  return [
    { locale: 'en-US', 'sign-up': [] },
    { locale: 'pt-PT', 'sign-up': [] },
  ];
}

export default async function SignUpPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignUpClient locale={locale} />;
}
