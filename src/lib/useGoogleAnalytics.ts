'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197', {
        page_location: window.location.origin + url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
