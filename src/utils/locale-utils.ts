import { SUPPORTED_LOCALES, SupportedLocale } from '@/config/locales';

// Lightweight locale normalization utilities
// Maps short or variant locale codes to canonical BCP47 tags we support.

// Normalize preferred locale input (accepts undefined, short codes, underscores, case variants)
export function normalizeLocale(locale?: string): SupportedLocale {
  if (!locale) return 'en-US';
  const lower = locale.toLowerCase().replace('_', '-');
  switch (lower) {
    case 'en':
    case 'en-us':
      return 'en-US';
    case 'pt':
    case 'pt-pt':
      return 'pt-PT';
    case 'es':
    case 'es-es':
      return 'es-ES';
    default:
      return 'en-US';
  }
}

// Basic heuristic (duplicated previously in webhook route). Centralized here so future
// improvements (accepting browser locales, Accept-Language parsing, etc.) propagate easily.
export function detectUserLocaleFromEmail(email?: string | null): SupportedLocale {
  if (!email) return 'en-US';
  const lower = email.toLowerCase();
  if (lower.endsWith('.pt') || lower.includes('.pt')) return 'pt-PT';
  if (lower.endsWith('.es') || lower.includes('.es')) return 'es-ES';
  return 'en-US';
}

export { SUPPORTED_LOCALES };
