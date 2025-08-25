// Lightweight locale normalization utilities
// Maps short or variant locale codes to canonical BCP47 tags we support.

export type SupportedLocale = 'en-US' | 'pt-PT';

// Normalize preferred locale input (accepts undefined, short codes, underscores, case variants)
export function normalizePreferredLocale(locale?: string): SupportedLocale {
  if (!locale) return 'en-US';
  const lower = locale.toLowerCase().replace('_', '-');
  switch (lower) {
    case 'en':
    case 'en-us':
      return 'en-US';
    case 'pt':
    case 'pt-pt':
      return 'pt-PT';
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
  return 'en-US';
}
