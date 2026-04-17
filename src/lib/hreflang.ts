import { routing } from '@/i18n/routing';
import { headers } from 'next/headers';
import { BASE_URL, extractLocalizedPath, normalizePathname } from '@/lib/seo';

/**
 * Generate hreflang links for the current page across all supported locales
 * This is used in the metadata alternates configuration
 */
export function generateHreflangLinks(
  _currentLocale: string,
  pathname?: string,
): Record<string, string> {
  const hreflangLinks: Record<string, string> = {};

  // If no pathname provided, default to homepage
  const cleanPath = normalizePathname(pathname || '/');

  // Remove the locale from the pathname to get the base path
  const { pathSuffix } = extractLocalizedPath(cleanPath);
  const basePathWithoutLocale = pathSuffix || '/';

  // Generate hreflang links for all supported locales
  routing.locales.forEach((locale) => {
    const suffix = basePathWithoutLocale === '/' ? '' : basePathWithoutLocale;
    hreflangLinks[locale] = `${BASE_URL}/${locale}${suffix}`;
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
