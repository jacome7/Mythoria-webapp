import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/config/locales';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES as SupportedLocale[],
  defaultLocale: (SUPPORTED_LOCALES[0] as SupportedLocale) || 'en-US',
});

export type Locale = SupportedLocale;

// Helper function to check if a string is a valid locale
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale);
}

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
