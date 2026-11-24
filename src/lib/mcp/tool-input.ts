import { SUPPORTED_LOCALES } from '@/config/locales';

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function resolveLocale(locale?: string) {
  const fallbackLocale = SUPPORTED_LOCALES[0] ?? 'en-US';
  if (!locale) return fallbackLocale;
  return SUPPORTED_LOCALES.includes(locale) ? locale : fallbackLocale;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}...`;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function sanitizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
