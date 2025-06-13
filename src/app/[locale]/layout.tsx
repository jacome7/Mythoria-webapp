import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '../../i18n/routing';
import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  // Merge all JSON files in the locale folder
  let messages = {};
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages', locale);
    const files = await readdir(messagesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(messagesDir, file);
        const fileContent = await readFile(filePath, 'utf8');
        const json = JSON.parse(fileContent);
        messages = { ...messages, ...json };
      }
    }  } catch {
    // fallback or error handling
  }

  const showSoonPage = process.env.NEXT_PUBLIC_SHOW_SOON_PAGE === 'true';

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex flex-col min-h-screen">
        {!showSoonPage && <Header />}
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}