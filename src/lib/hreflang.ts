import { routing } from '@/i18n/routing';
import { headers } from 'next/headers';

/**
 * Generate hreflang links for the current page across all supported locales
 * This is used in the metadata alternates configuration
 */
export function generateHreflangLinks(
  currentLocale: string,
  pathname?: string,
): Record<string, string> {
  const baseUrl = 'https://mythoria.pt';
  const hreflangLinks: Record<string, string> = {};

  // If no pathname provided, default to homepage
  const cleanPath = pathname || '/';

  // Remove the locale from the pathname to get the base path
  const basePathWithoutLocale = cleanPath.replace(/^\/[a-z]{2}-[A-Z]{2}/, '') || '/';

  // Generate hreflang links for all supported locales
  routing.locales.forEach((locale) => {
    hreflangLinks[locale] = `${baseUrl}/${locale}${basePathWithoutLocale}`;
  });

  return hreflangLinks;
}

/**
 * Generate hreflang links for server components (async)
 * Use this in generateMetadata functions
 */
export async function generateServerHreflangLinks(
  currentLocale: string,
): Promise<Record<string, string>> {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  return generateHreflangLinks(currentLocale, pathname);
}

/**
 * Utility to convert locale format for hreflang (en-US -> en-us)
 */
export function formatHreflangCode(locale: string): string {
  return locale.toLowerCase();
}
