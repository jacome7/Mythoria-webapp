import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from '@/lib/analytics/page-context';

/**
 * Request-time advertising context captured for a server-side OpenAI conversion.
 *
 * Isomorphic and dependency-free: the Drizzle schema imports this type for its jsonb columns.
 */
export interface AdContext {
  /** Advertising consent at capture time. Identifiers below are only kept when `'granted'`. */
  adConsent: 'granted' | 'denied';
  /** OpenAI click reference (`__oppref` cookie / `oppref` query parameter). */
  oppref?: string;
  /** OpenAI browser reference (`__obref` cookie). */
  obref?: string;
  ipAddress?: string;
  userAgent?: string;
  sourceUrl: string;
  /** ISO-8601 timestamp of when the context was captured. */
  capturedAt: string;
}

export const AD_CONTEXT_LIMITS = {
  oppref: 512,
  obref: 255,
  ipAddress: 45,
  userAgent: 1024,
  sourceUrl: 2048,
} as const;

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  // Identifiers are dropped rather than truncated: a cut-off reference would no longer match.
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : undefined;
}

/**
 * Validates an untrusted value (jsonb column, order metadata) as an `AdContext`.
 *
 * Returns `undefined` when the value is not a usable context. When consent is not `'granted'`,
 * `oppref`, `obref`, `ipAddress` and `userAgent` are stripped. The URL always uses the
 * allowlisted analytics route template.
 */
export function sanitizeAdContext(value: unknown): AdContext | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;

  if (raw.adConsent !== 'granted' && raw.adConsent !== 'denied') return undefined;
  if (typeof raw.sourceUrl !== 'string' || raw.sourceUrl.trim().length === 0) return undefined;
  if (typeof raw.capturedAt !== 'string' || Number.isNaN(Date.parse(raw.capturedAt))) {
    return undefined;
  }

  const granted = raw.adConsent === 'granted';
  const requestedSource = raw.sourceUrl.trim();
  const sourceUrl =
    requestedSource === ANALYTICS_BASE_URL
      ? ANALYTICS_BASE_URL
      : sanitizeAnalyticsPageUrl(requestedSource) || ANALYTICS_BASE_URL;
  const context: AdContext = {
    adConsent: raw.adConsent,
    sourceUrl,
    capturedAt: new Date(raw.capturedAt).toISOString(),
  };
  if (!granted) return context;

  const oppref = optionalString(raw.oppref, AD_CONTEXT_LIMITS.oppref);
  const obref = optionalString(raw.obref, AD_CONTEXT_LIMITS.obref);
  const ipAddress = optionalString(raw.ipAddress, AD_CONTEXT_LIMITS.ipAddress);
  const userAgent = optionalString(raw.userAgent, AD_CONTEXT_LIMITS.userAgent);
  if (oppref) context.oppref = oppref;
  if (obref) context.obref = obref;
  if (ipAddress) context.ipAddress = ipAddress;
  if (userAgent) context.userAgent = userAgent;
  return context;
}
