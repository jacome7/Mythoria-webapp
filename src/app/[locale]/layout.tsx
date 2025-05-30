import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '../../i18n/routing';
import Header from '@/components/Header';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {  const {locale} = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  
  const showSoonPage = process.env.NEXT_PUBLIC_SHOW_SOON_PAGE === 'true';
  
  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    messages = {};
  }  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {!showSoonPage && <Header />}
      {children}
    </NextIntlClientProvider>
  );
}