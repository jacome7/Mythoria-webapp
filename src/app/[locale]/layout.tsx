import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '../../i18n/routing';
import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StructuredData from '@/components/StructuredData';
import LanguageAttribute from '@/components/LanguageAttribute';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { Metadata, Viewport } from 'next';

interface MetadataMessages {
  title?: string;
  description?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  structuredData?: {
    name?: string;
    description?: string;
    inLanguage?: string;
  };
}

interface Messages {
  metadata?: MetadataMessages;
  [key: string]: unknown;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  };
}

async function getMessages(locale: string): Promise<Messages> {
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages', locale);
    const files = await readdir(messagesDir);
    let messages: Messages = {};
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(messagesDir, file);
        const fileContent = await readFile(filePath, 'utf8');
        const json = JSON.parse(fileContent);
        messages = { ...messages, ...json };
      }
    }
    return messages;
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>
}): Promise<Metadata> {
  const {locale} = await params;
    // Get messages for metadata
  const messages = await getMessages(locale);
  const metadata = messages?.metadata || {};
  
  // Base URL for the application
  const baseUrl = 'https://mythoria.pt';
  const currentUrl = `${baseUrl}/${locale}/`;
  return {
    title: metadata.title || 'Mythoria |  Personalized Books Creator',
    description: metadata.description || 'Create unique, fully illustrated books with Mythoria\'s generative-AI.',
    robots: 'index,follow,max-snippet:-1,max-image-preview:large',
    alternates: {
      canonical: currentUrl,
      languages: {
        'en-US': `${baseUrl}/en-US/`,
        'pt-PT': `${baseUrl}/pt-PT/`,
      }
    },
    openGraph: {
      type: 'website',
      siteName: 'Mythoria',
      url: currentUrl,
      title: metadata.openGraph?.title || metadata.title || 'Mythoria | Personalized Books Creator',
      description: metadata.openGraph?.description || metadata.description || 'Turn your ideas into personalised, beautifully illustrated books with AI.',
      images: [
        {
          url: metadata.openGraph?.image || 'https://mythoria.pt/assets/og/mythoria_en.jpg',
          width: 1200,
          height: 630,
          alt: 'Mythoria - Personalized Books Creator'
        }
      ],
      locale: locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.openGraph?.title || metadata.title || 'Mythoria | Personalized Books Creator',
      description: metadata.openGraph?.description || metadata.description || 'Turn your ideas into personalised, beautifully illustrated books with AI.',
      images: [metadata.openGraph?.image || 'https://mythoria.pt/assets/og/mythoria_en.jpg'],
    }
  };
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
  // Get messages using the helper function
  const messages = await getMessages(locale);
  const metadata = messages?.metadata || {};

  // Structure data for JSON-LD
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SoftwareApplication"],
    "name": metadata.structuredData?.name || "Mythoria",
    "url": "https://mythoria.pt",
    "logo": "https://mythoria.pt/assets/logo.svg",
    "description": metadata.structuredData?.description || "Mythoria lets anyone create and customize fully illustrated books using generative AI.",
    "applicationCategory": "CreativeWorkCreationSoftware",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    },
    "sameAs": [
      "https://www.instagram.com/mythoria_oficial/",
      "https://www.linkedin.com/company/mythoria"
    ],
    "inLanguage": metadata.structuredData?.inLanguage || locale
  };

  const showSoonPage = process.env.NEXT_PUBLIC_SHOW_SOON_PAGE === 'true';
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LanguageAttribute locale={locale} />
      <StructuredData data={structuredData} />
      <div className="flex flex-col min-h-screen">
        {!showSoonPage && <Header />}
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}