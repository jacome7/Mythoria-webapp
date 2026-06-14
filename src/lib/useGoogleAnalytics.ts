'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from './analytics';

const isDebugModeEnabled = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      const path = pathname || window.location.pathname;
      const sp = searchParams ? searchParams.toString() : '';
      const url = path + (sp ? `?${sp}` : '');

      const pageLocation = window.location.origin + url;

      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197', {
        ...(isDebugModeEnabled ? { debug_mode: true } : {}),
        page_location: pageLocation,
        page_title: document.title,
        send_page_view: false,
      });

      trackEvent('page_view', {
        ...(isDebugModeEnabled ? { debug_mode: true } : {}),
        page_location: pageLocation,
        page_path: url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
