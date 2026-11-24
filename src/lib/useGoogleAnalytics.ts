'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from './analytics';
import { ANALYTICS_TAG_READY_EVENT } from './analytics/destinations';
import { canLoadAuditBrowserTag, sanitizeAnalyticsPathname } from './analytics/page-context';
import { CONSENT_UPDATED_EVENT, getStoredConsent } from './consent';

export function sanitizeAnalyticsPath(pathname: string): string {
  return sanitizeAnalyticsPathname(pathname) || '/';
}

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const lastPageView = useRef<string | undefined>(undefined);

  useEffect(() => {
    const view = () => {
      if (getStoredConsent()?.state.analytics_storage !== 'granted') {
        lastPageView.current = undefined;
        return;
      }
      const url = new URL(window.location.href);
      if (!canLoadAuditBrowserTag(url, document.referrer)) return;
      const path = sanitizeAnalyticsPath(pathname || url.pathname);
      if (lastPageView.current === path) return;
      if (trackEvent('page_view')) lastPageView.current = path;
    };
    view();
    window.addEventListener(CONSENT_UPDATED_EVENT, view);
    window.addEventListener(ANALYTICS_TAG_READY_EVENT, view);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, view);
      window.removeEventListener(ANALYTICS_TAG_READY_EVENT, view);
    };
  }, [pathname]);
}
