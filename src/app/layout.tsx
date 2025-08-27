import type { Metadata } from "next";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { enUS, ptPT, esES } from '@clerk/localizations';
import GoogleAnalytics from "../components/GoogleAnalytics";
import AnalyticsProvider from "../components/AnalyticsProvider";
import { headers } from 'next/headers';
import { SUPPORTED_LOCALES } from '@/config/locales';
import "./globals.css";

// Base metadata for non-localized routes only
export const metadata: Metadata = {
  title: "Mythoria",
  description: "Personalized Books Creator",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the pathname from headers to determine locale
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // Extract locale from pathname (e.g., /en-US/sign-in -> en-US)
  const localeMatch = pathname.match(/^\/([a-z]{2}-[A-Z]{2})/);
  let locale = localeMatch ? localeMatch[1] : 'en-US';
  if (!SUPPORTED_LOCALES.includes(locale)) {
    locale = SUPPORTED_LOCALES[0] || 'en-US';
  }

  // Select appropriate Clerk localization
  const getClerkLocalization = (loc: string) => {
    switch (loc) {
      case 'pt-PT':
        return ptPT;
      case 'es-ES':
        return esES;
      case 'en-US':
      default:
        return enUS;
    }
  };

  const clerkLocalization = getClerkLocalization(locale);

  return (
    <ClerkProvider localization={clerkLocalization}>
      <html lang={locale} data-theme="autumn">
        <head>
          <GoogleAnalytics
            measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197'}
            googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}
            googleTagId={process.env.NEXT_PUBLIC_GOOGLE_TAG_ID}
          />
          {/* PWA Meta Tags */}
          <meta name="application-name" content="Mythoria" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Mythoria" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#014a70" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
          <meta name="msapplication-tap-highlight" content="no" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <link rel="mask-icon" href="/icon-192.png" />
        </head>
        <body suppressHydrationWarning={true}>
          <div className="flex flex-col min-h-screen"><AnalyticsProvider>
              <main className="flex-grow">{children}</main>
            </AnalyticsProvider>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
