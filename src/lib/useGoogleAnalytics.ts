'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from './analytics';

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = pathname || window.location.pathname;
      const sp = searchParams ? searchParams.toString() : '';
      const url = path + (sp ? `?${sp}` : '');

      const pageLocation = window.location.origin + url;

      trackEvent('page_view', {
        page_location: pageLocation,
        page_path: url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
