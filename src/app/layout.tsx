import type { Metadata } from "next";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { enUS } from '@clerk/localizations';
import GoogleAnalytics from "../components/GoogleAnalytics";
import AnalyticsProvider from "../components/AnalyticsProvider";
import "./globals.css";

// Base metadata for non-localized routes only
export const metadata: Metadata = {
  title: "Mythoria",
  description: "AI-Powered Personalized Books Creator",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    });
  }
  return (
    <ClerkProvider 
      localization={enUS}
      // Debug configuration is handled via environment variables
      // Additional debugging props would go here if supported by the version
    >
      <html data-theme="autumn">
        <head>
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197'} />
        </head>
        <body>
          <div className="flex flex-col min-h-screen">            <AnalyticsProvider>
              <main className="flex-grow">{children}</main>
            </AnalyticsProvider>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
