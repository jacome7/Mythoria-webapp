import type { Metadata } from "next";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { enUS, ptPT } from '@clerk/localizations';
import GoogleAnalytics from "../components/GoogleAnalytics";
import AnalyticsProvider from "../components/AnalyticsProvider";
import { headers } from 'next/headers';
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
  const locale = localeMatch ? localeMatch[1] : 'en-US';
  
  // Select appropriate Clerk localization
  const clerkLocalization = locale === 'pt-PT' ? ptPT : enUS;
  
  // Debugging configuration for Clerk
  const isDebugMode = process.env.CLERK_DEBUG === 'true';
  const telemetryDebug = process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG === 'true';
    if (isDebugMode) {
    console.log('[Clerk Debug] Environment configuration:', {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
      debugMode: isDebugMode,
      logLevel: process.env.CLERK_LOG_LEVEL,
      telemetryDisabled: process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED,
      telemetryDebug: telemetryDebug,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      detectedLocale: locale,
      clerkLocalization: locale === 'pt-PT' ? 'ptPT' : 'enUS'
    });
  }
  return (
    <ClerkProvider 
      localization={clerkLocalization}
      // Debug configuration is handled via environment variables
      // Additional debugging props would go here if supported by the version
    >
      <html data-theme="autumn">
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
