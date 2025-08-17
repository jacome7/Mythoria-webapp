import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '../../i18n/routing';
import {setRequestLocale} from 'next-intl/server';
import StickyHeader from '@/components/StickyHeader';
import Footer from '@/components/Footer';
import StructuredData from '@/components/StructuredData';
import LanguageAttribute from '@/components/LanguageAttribute';
import LocaleSync from '@/components/LocaleSync';
import { generateServerHreflangLinks } from '@/lib/hreflang';
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
  return routing.locales.map((locale) => ({locale}));
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
    let messages: Messages = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(messagesDir, file);
        try {
          const fileContent = await readFile(filePath, 'utf8');
          const json = JSON.parse(fileContent);
          messages = { ...messages, ...json };
        } catch (parseError) {
          console.error(`Failed to parse ${file} for locale ${locale}:`, parseError);
        }
      }
    }
    
    // Add validation
    if (Object.keys(messages).length === 0) {
      console.warn(`No messages found for locale: ${locale}`);
      // Return fallback messages
      return await getFallbackMessages();
    }
    
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Return fallback messages
    return await getFallbackMessages();
  }
}

async function getFallbackMessages(): Promise<Messages> {
  try {
    // Try to load default English messages
    const fallbackDir = path.join(process.cwd(), 'src', 'messages', 'en-US');
    const files = await readdir(fallbackDir);
    let messages: Messages = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(fallbackDir, file);
        try {
          const content = await readFile(filePath, 'utf8');
          const json = JSON.parse(content);
          messages = { ...messages, ...json };
        } catch (parseError) {
          console.error(`Failed to parse fallback file ${file}:`, parseError);
        }
      }
    }
    
    if (Object.keys(messages).length > 0) {
      return messages;
    }
  } catch (fallbackError) {
    console.error('Failed to load fallback messages:', fallbackError);
  }
  
  // Return minimal fallback structure
  return {
    common: {
      Header: {
        navigation: {
          homepage: "Homepage",
          getInspired: "Get Inspired",
          tellYourStory: "Tell Your Story",
          myStories: "My Stories",
          pricing: "Pricing",
          dashboard: "Dashboard"
        },
        auth: {
          signIn: "Sign In",
          signUp: "Sign Up"
        },
        logoAlt: "Mythoria Logo"
      },
      Footer: {
        aboutFounder: "About the founder",
        readMyStory: "Read my story",
        privacyPolicy: "Privacy & Cookies",
        termsConditions: "Terms & Conditions",
        contactUs: "Contact Us",
        copyright: "© 2024 Mythoria"
      }
    },
    HomePage: {
      words: ['Adventure', 'Love Story', 'Mystery', 'Fairy Tale'],
      hero: {
        writeYourOwn: "Write Your Own",
        subtitle: "Create unique, fully illustrated books with AI",
        subtitleEmphasized: "AI",
        tryItNow: "Try It Now"
      },
      audiences: {
        kids: {
          title: "For Kids 🎈",
          description: "Turn your child into the hero of their own magical adventure!"
        },
        adults: {
          title: "For Adults ❤️",
          description: "Relive your memories as a stunning illustrated story."
        },
        companies: {
          title: "For Companies 🌟",
          description: "Create personalized storybooks for your team."
        }
      },
      howItWorks: {
        title: "How It Works",
        steps: {
          step1: { title: "The Author", description: "Start your journey" },
          step2: { title: "The Story", description: "Share your idea" },
          step3: { title: "The Characters", description: "Personalize details" },
          step4: { title: "The Plot", description: "Shape your story" },
          step5: { title: "The Gift", description: "Choose your format" },
          step6: { title: "Experience", description: "Enjoy your story" }
        },
        conclusion: "Our Story Factory will handle the rest!"
      },
      community: {
        title: "Join Our Growing Community!"
      }
    }
  };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>
}): Promise<Metadata> {
  const {locale} = await params;
  
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
    description: 'Create unique, fully illustrated books with Mythoria\'s generative-AI.',
    openGraph: {
      title: 'Mythoria | Personalized Books Creator',
      description: 'Turn your ideas into personalised, beautifully illustrated books with AI.',
      image: 'https://mythoria.pt/assets/og/mythoria_en.jpg'
    }
  };
  
  try {
    if (locale === 'pt-PT') {
      metadata = {
        title: 'Mythoria | Criador de Livros Personalizados',
        description: 'Crie livros únicos e totalmente ilustrados com a IA generativa da Mythoria. Transforme qualquer história num e-book, audiolivro ou presente impresso em minutos.',
        openGraph: {
          title: 'Mythoria | Criador de Livros Personalizados',
          description: 'Transforme as suas ideias em livros personalizados e lindamente ilustrados — leia, ouça ou imprima.',
          image: 'https://mythoria.pt/assets/og/mythoria_pt.jpg'
        }
      };
    } else if (locale === 'es-ES') {
      metadata = {
        title: 'Mythoria | Creador de Libros Personalizados',
        description: 'Crea libros únicos y completamente ilustrados con la IA generativa de Mythoria. Transforma cualquier historia en un e-book, audiolibro o regalo impreso en minutos.',
        openGraph: {
          title: 'Mythoria | Creador de Libros Personalizados',
          description: 'Transforma tus ideas en libros personalizados y bellamente ilustrados — lee, escucha o imprime.',
          image: 'https://mythoria.pt/assets/og/mythoria_es.jpg'
        }
      };
    }
  } catch (error) {
    console.error(`Failed to load metadata for locale ${locale}:`, error);
  }
  
  // Base URL for the application
  const baseUrl = 'https://mythoria.pt';
  const currentUrl = `${baseUrl}/${locale}/`;
  
  // Generate hreflang links dynamically for the current page
  const hreflangLinks = await generateServerHreflangLinks(locale);
  
  return {
    title: metadata.title,
    description: metadata.description,
    robots: 'index,follow,max-snippet:-1,max-image-preview:large',
    manifest: getManifestUrl(locale),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Mythoria',
    },
    alternates: {
      canonical: currentUrl,
      languages: hreflangLinks
    },
    openGraph: {
      type: 'website',
      siteName: 'Mythoria',
      url: currentUrl,
      title: metadata.openGraph.title,
      description: metadata.openGraph.description,
      images: [
        {
          url: metadata.openGraph.image,
          width: 1200,
          height: 630,
          alt: 'Mythoria - Personalized Books Creator'
        }
      ],
      locale: locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.openGraph.title,
      description: metadata.openGraph.description,
      images: [metadata.openGraph.image],
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
  
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    console.error('[LocaleLayout] Invalid locale:', locale);
    notFound();
  }
  
  setRequestLocale(locale);
  
  // Get messages using the helper function
  const messages = await getMessages(locale);
  const metadata = (messages?.Metadata as MetadataMessages) || {} as MetadataMessages;

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LanguageAttribute locale={locale} />
      <StructuredData data={structuredData} />
      <LocaleSync />
      <div className="flex flex-col min-h-screen">
  <StickyHeader />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}