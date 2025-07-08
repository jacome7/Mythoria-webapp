import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en-US', 'pt-PT'],
 
  // Used when no locale matches
  defaultLocale: 'en-US'
});

// Type for supported locales
export type Locale = typeof routing.locales[number];

// Helper function to check if a string is a valid locale
export function isValidLocale(locale: string): locale is Locale {
  return routing.locales.includes(locale as Locale);
}
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
