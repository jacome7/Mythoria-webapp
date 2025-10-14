'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
  googleAdsId?: string;
  googleTagId?: string;
}

export default function GoogleAnalytics({
  measurementId,
  googleAdsId,
  googleTagId,
}: GoogleAnalyticsProps) {
  useEffect(() => {
    // Initialize dataLayer if it doesn't exist
    window.dataLayer = window.dataLayer || [];

    // Define gtag function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    function gtag(..._args: any[]) {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    }

    // Make gtag available globally
    window.gtag = gtag;

    // Initialize Google Analytics
    gtag('js', new Date());

    // Configure Google Analytics
    gtag('config', measurementId);

    // Configure Google Ads if provided
    if (googleAdsId) {
      gtag('config', googleAdsId);
    }

    // Configure Google Tag if provided
    if (googleTagId) {
      gtag('config', googleTagId);
    }
  }, [measurementId, googleAdsId, googleTagId]);

  if (!measurementId) {
    return null;
  }

  // Use the primary measurement ID for the script source
  const scriptId = googleTagId || measurementId;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`}
        strategy="afterInteractive"
      />
    </>
  );
}

// Utility functions for tracking events
export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_location: url,
    });
  }
};
