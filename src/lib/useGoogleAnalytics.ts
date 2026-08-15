'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from './analytics';
import {
  CONSENT_UPDATED_EVENT,
  getStoredConsent,
  type ConsentStatus,
  type ConsentUpdatedDetail,
} from './consent';

const SAFE_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  '_gl',
]);

export function sanitizeAnalyticsPath(pathname: string, params: URLSearchParams): string {
  const safe = new URLSearchParams();
  params.forEach((value, key) => {
    if (SAFE_QUERY_KEYS.has(key) && value.length <= 255) safe.append(key, value);
  });
  const query = safe.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sentPageViewsRef = useRef(new Set<string>());
  const [analyticsConsent, setAnalyticsConsent] = useState<ConsentStatus>(() =>
    getStoredConsent()?.state.analytics_storage === 'granted' ? 'granted' : 'denied',
  );

  useEffect(() => {
    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      setAnalyticsConsent(detail.state.analytics_storage);
    };
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && analyticsConsent === 'granted') {
      const path = pathname || window.location.pathname;
      // Query cleanup and attribution redirects can update search params without a real page
      // navigation. GA4 should receive exactly one page_view for that canonical path.
      const pageViewKey = path;
      if (sentPageViewsRef.current.has(pageViewKey)) return;

      const url = sanitizeAnalyticsPath(path, new URLSearchParams(searchParams?.toString() || ''));
      const pageLocation = window.location.origin + url;

      sentPageViewsRef.current.add(pageViewKey);
      trackEvent('page_view', {
        page_location: pageLocation,
        page_path: path,
        page_title: document.title,
      });
    }
  }, [analyticsConsent, pathname, searchParams]);
}
