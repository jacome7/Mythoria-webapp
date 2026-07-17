// Wrapped provider with instrumentation for missing translation detection
import ClientProvider from '@/i18n/ClientProvider';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import StickyHeader from '@/components/StickyHeader';
import Footer from '@/components/Footer';
import StructuredData from '@/components/StructuredData';
import LanguageAttribute from '@/components/LanguageAttribute';
import LocaleSync from '@/components/LocaleSync';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { papercutScopeClassName, papercutStyles } from '@/components/papercut';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { Metadata, Viewport } from 'next';
import { getManifestUrl } from '@/lib/manifest';

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
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: '#014A70',
  };
}

async function getMessages(locale: string): Promise<Messages> {
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages', locale);
    const files = await readdir(messagesDir);
    const messages: Messages = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(messagesDir, file);
        try {
          const fileContent = await readFile(filePath, 'utf8');
          const json = JSON.parse(fileContent);

          // Extract namespace from filename (e.g., 'MyStoriesPage.json' -> 'MyStoriesPage')
          const namespace = file.replace('.json', '');

          // Add namespace if the JSON doesn't already have it as a top-level key
          if (json && typeof json === 'object' && !json[namespace]) {
            messages[namespace] = json;
          } else {
            // If the JSON already has the namespace, merge it directly
            Object.assign(messages, json);
          }
        } catch (parseError) {
          console.error(`Failed to parse ${file} for locale ${locale}:`, parseError);
          throw parseError;
        }
      }
    }

    // Add validation
    if (Object.keys(messages).length === 0) {
      throw new Error(`No messages found for locale: ${locale}`);
    }

    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Define custom metadata structure for easier management
  interface CustomMetadata {
    title: string;
    description: string;
    openGraph: {
      title: string;
      description: string;
      image: string;
    };
  }

  // Load metadata using dynamic import with proper error handling
  let metadata: CustomMetadata = {
    title: 'Mythoria | Personalized Books Creator',
    description: "Create unique, fully illustrated books with Mythoria's generative-AI.",
    openGraph: {
      title: 'Mythoria | Personalized Books Creator',
      description: 'Turn your ideas into personalised, beautifully illustrated books with AI.',
      image: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
    },
  };

  try {
    if (locale === 'pt-PT') {
      metadata = {
        title: 'Mythoria | Criador de Livros Personalizados',
        description:
          'Crie livros únicos e totalmente ilustrados com a IA generativa da Mythoria. Transforme qualquer história num e-book, audiolivro ou presente impresso em minutos.',
        openGraph: {
          title: 'Mythoria | Criador de Livros Personalizados',
          description:
            'Transforme as suas ideias em livros personalizados e lindamente ilustrados — leia, ouça ou imprima.',
          image: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
        },
      };
    } else if (locale === 'es-ES') {
      metadata = {
        title: 'Mythoria | Creador de Libros Personalizados',
        description:
          'Crea libros únicos y completamente ilustrados con la IA generativa de Mythoria. Transforma cualquier historia en un e-book, audiolibro o regalo impreso en minutos.',
        openGraph: {
          title: 'Mythoria | Creador de Libros Personalizados',
          description:
            'Transforma tus ideas en libros personalizados y bellamente ilustrados — lee, escucha o imprime.',
          image: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
        },
      };
    } else if (locale === 'fr-FR') {
      metadata = {
        title: 'Mythoria | Créateur de Livres Personnalisés',
        description:
          "Créez des livres uniques et entièrement illustrés avec l'IA générative de Mythoria. Transformez n'importe quelle histoire en e-book, livre audio ou cadeau imprimé en quelques minutes.",
        openGraph: {
          title: 'Mythoria | Créateur de Livres Personnalisés',
          description:
            'Transformez vos idées en livres personnalisés et magnifiquement illustrés — lisez, écoutez ou imprimez.',
          image: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
        },
      };
    } else if (locale === 'de-DE') {
      metadata = {
        title: 'Mythoria | Personalisierter Buchgenerator',
        description:
          'Erstelle einzigartige, vollständig illustrierte Bücher mit der generativen KI von Mythoria. Verwandle jede Geschichte in wenigen Minuten in ein E-Book, Hörbuch oder gedrucktes Geschenk.',
        openGraph: {
          title: 'Mythoria | Personalisierter Buchgenerator',
          description:
            'Verwandle deine Ideen in personalisierte, wunderschön illustrierte Bücher – lesen, anhören oder drucken.',
          image: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
        },
      };
    }
  } catch (error) {
    console.error(`Failed to load metadata for locale ${locale}:`, error);
  }

  return {
    title: metadata.title,
    description: metadata.description,
    robots: {
      index: false,
      follow: false,
    },
    manifest: getManifestUrl(locale),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Mythoria',
    },
    openGraph: {
      type: 'website',
      siteName: 'Mythoria',
      title: metadata.openGraph.title,
      description: metadata.openGraph.description,
      images: [
        {
          url: metadata.openGraph.image,
          width: 1200,
          height: 630,
          alt: 'Mythoria - Personalized Books Creator',
        },
      ],
      locale: locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.openGraph.title,
      description: metadata.openGraph.description,
      images: [metadata.openGraph.image],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    console.error('[LocaleLayout] Invalid locale:', locale);
    notFound();
  }

  setRequestLocale(locale);

  // Get messages using the helper function
  const messages = await getMessages(locale);
  const metadata = (messages?.Metadata as MetadataMessages) || ({} as MetadataMessages);
  const mainClassName = papercutScopeClassName('flex-grow', papercutStyles.footerBlend);

  // Structure data for JSON-LD
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'SoftwareApplication'],
    name: metadata.structuredData?.name || 'Mythoria',
    url: 'https://mythoria.pt',
    logo: 'https://mythoria.pt/assets/logo.svg',
    description:
      metadata.structuredData?.description ||
      'Mythoria lets anyone create and customize fully illustrated books using generative AI.',
    applicationCategory: 'CreativeWorkCreationSoftware',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    sameAs: [
      'https://www.instagram.com/mythoria_oficial/',
      'https://www.linkedin.com/company/mythoria',
    ],
    inLanguage: metadata.structuredData?.inLanguage || locale,
  };

  return (
    <ClientProvider locale={locale} messages={messages} timeZone={'Europe/Lisbon'}>
      <LanguageAttribute locale={locale} />
      <StructuredData data={structuredData} />
      <LocaleSync />
      <div className="flex flex-col min-h-screen">
        <StickyHeader />
        <main className={mainClassName}>{children}</main>
        <Footer />
      </div>
      <CookieConsentBanner />
    </ClientProvider>
  );
}
