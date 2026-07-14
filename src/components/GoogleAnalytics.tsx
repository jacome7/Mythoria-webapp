import Script from 'next/script';
import { getDefaultConsent, CONSENT_COOKIE_NAME } from '@/lib/consent';

const isDebugModeEnabled = process.env.NEXT_PUBLIC_GA_DEBUG === 'true';

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
  if (!measurementId) {
    return null;
  }

  const scriptId = googleTagId || measurementId;
  const debugConfig = isDebugModeEnabled ? ', debug_mode: true' : '';

  // Generate the inline script to initialize gtag and set consent defaults.
  // We read the cookie manually here because this script runs before React hydration.
  const initScript = `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};

    // 1. Parse stored consent from cookie (synchronously)
    var storedConsent = null;
    try {
      var match = document.cookie.match(new RegExp('(^| )${CONSENT_COOKIE_NAME}=([^;]+)'));
      if (match) {
        storedConsent = JSON.parse(decodeURIComponent(match[2]));
      }
    } catch (e) {}

    // 2. Determine consent state (stored or default)
    var consentState = storedConsent ? storedConsent.state : ${JSON.stringify(getDefaultConsent())};

    // 3. Set consent defaults BEFORE any config
    // We use wait_for_update: 500 to give the consent banner a chance to load and update consent
    // if this is the first visit, although we default to denied anyway.
    window.gtag('consent', 'default', {
      ad_storage: consentState.ad_storage,
      ad_user_data: consentState.ad_user_data,
      ad_personalization: consentState.ad_personalization,
      analytics_storage: consentState.analytics_storage,
      wait_for_update: 500
    });

    // 4. Set other flags
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'url_passthrough', true);
    
    // Set developer ID for Next.js integration tracking
    window.gtag('set', 'developer_id.dZTNiMT', true);

    // 5. Initialize the library
    window.gtag('js', new Date());

    // React sends one manual page_view for the initial URL and every SPA navigation.
    window.gtag('config', ${JSON.stringify(measurementId)}, { send_page_view: false${debugConfig} });
    ${googleAdsId ? `window.gtag('config', ${JSON.stringify(googleAdsId)}, { send_page_view: false });` : ''}
    ${googleTagId ? `window.gtag('config', ${JSON.stringify(googleTagId)}, { send_page_view: false });` : ''}
  `;

  return (
    <>
      {/* Inline script to initialize Consent Mode and gtag immediately */}
      <script id="gtag-init" dangerouslySetInnerHTML={{ __html: initScript }} />

      {/* External Google Tag script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
