'use client';

import { usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

interface HreflangLink {
  hreflang: string;
  href: string;
}

/**
 * Client-side hook to get hreflang links for the current page
 * Use this in client components if needed
 */
export function useHreflangLinks(): HreflangLink[] {
  const pathname = usePathname();
  const baseUrl = 'https://mythoria.pt';
  
  // Remove the locale from the pathname to get the base path
  const basePathWithoutLocale = pathname.replace(/^\/[a-z]{2}-[A-Z]{2}/, '') || '/';
  
  return routing.locales.map((locale) => ({
    hreflang: locale.toLowerCase(), // Convert en-US to en-us for proper hreflang format
    href: `${baseUrl}/${locale}${basePathWithoutLocale}`
  }));
}
