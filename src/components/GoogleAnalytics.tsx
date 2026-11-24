'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ensureGtag } from '@/lib/analytics';
import { getAuditBrowserMeasurementId } from '@/lib/analytics/destinations';
import { canLoadAuditBrowserTag, sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';
import { CONSENT_UPDATED_EVENT, getDefaultConsent, getStoredConsent } from '@/lib/consent';

const TAG_ID = 'mythoria-audit-google-tag';

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const measurementId = getAuditBrowserMeasurementId(window.location.origin);
    if (!measurementId) return;
    const disableKey = `ga-disable-${measurementId}`;
    const globals = window as unknown as Record<string, unknown>;
    const sync = () => {
      const url = new URL(window.location.href);
      const granted = getStoredConsent()?.state.analytics_storage === 'granted';
      const safe = granted && canLoadAuditBrowserTag(url, document.referrer);
      globals[disableKey] = !safe;
      if (!safe || document.getElementById(TAG_ID)) return;
      const gtag = ensureGtag();
      if (!gtag) return;

      // This audit destination deliberately has no Ads or connected Google Tag configuration.
      const defaults = getDefaultConsent();
      gtag('consent', 'default', defaults);
      gtag('consent', 'update', { ...defaults, analytics_storage: 'granted' });
      gtag('set', 'ads_data_redaction', true);
      gtag('set', 'url_passthrough', false);
      gtag('js', new Date());
      gtag('config', measurementId, {
        send_page_view: false,
        ...(process.env.NEXT_PUBLIC_GA_DEBUG === 'true' ? { debug_mode: true } : {}),
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: url.origin + (sanitizeAnalyticsPathname(url.pathname) || '/'),
        page_referrer: '',
        page_title: 'Mythoria',
      });

      const script = document.createElement('script');
      script.id = TAG_ID;
      script.async = true;
      script.setAttribute('referrerpolicy', 'no-referrer');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.append(script);
    };
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener('popstate', sync);
    return () => {
      globals[disableKey] = true;
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener('popstate', sync);
    };
  }, [pathname]);

  return null;
}
