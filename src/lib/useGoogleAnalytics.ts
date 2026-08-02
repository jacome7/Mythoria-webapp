'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from './analytics';

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
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = pathname || window.location.pathname;
      // Query cleanup and attribution redirects can update search params without a real page
      // navigation. GA4 should receive exactly one page_view for that canonical path.
      if (lastTrackedPathRef.current === path) return;

      const url = sanitizeAnalyticsPath(path, new URLSearchParams(searchParams?.toString() || ''));
      const pageLocation = window.location.origin + url;

      lastTrackedPathRef.current = path;
      trackEvent('page_view', {
        page_location: pageLocation,
        page_path: path,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
