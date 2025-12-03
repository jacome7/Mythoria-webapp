'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const isDebugModeEnabled = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      const path = pathname || window.location.pathname;
      const sp = searchParams ? searchParams.toString() : '';
      const url = path + (sp ? `?${sp}` : '');

      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197', {
        ...(isDebugModeEnabled ? { debug_mode: true } : {}),
        page_location: window.location.origin + url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
