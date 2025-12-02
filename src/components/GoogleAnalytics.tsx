'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { getStoredConsent, getDefaultConsent } from '@/lib/consent';

// Note: Window.gtag and Window.dataLayer are declared in src/lib/analytics.ts

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

    // Define gtag function - use arguments object for compatibility with gtag API
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }

    // Make gtag available globally
    window.gtag = gtag;

    // ============================================
    // GOOGLE CONSENT MODE v2 - Set defaults FIRST
    // ============================================

    // Check if user has previously made a consent choice
    const storedConsent = getStoredConsent();
    const consentState = storedConsent?.state || getDefaultConsent();

    // Set consent defaults BEFORE any config calls
    gtag('consent', 'default', {
      ad_storage: consentState.ad_storage,
      ad_user_data: consentState.ad_user_data,
      ad_personalization: consentState.ad_personalization,
      analytics_storage: consentState.analytics_storage,
      wait_for_update: 500, // Wait 500ms for consent banner interaction
    });

    // Enable ads data redaction when ad_storage is denied
    gtag('set', 'ads_data_redaction', true);

    // Enable URL passthrough for better attribution when consent is denied
    gtag('set', 'url_passthrough', true);

    // ============================================
    // Initialize and configure Google tags
    // ============================================

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
