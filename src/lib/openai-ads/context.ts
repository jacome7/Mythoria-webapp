/**
 * Server-only request-time advertising context for OpenAI Conversions API events.
 *
 * Advertising consent is read straight from the `mythoria_consent` cookie and is independent of
 * analytics consent. Identifiers (`oppref`, `obref`, IP, user agent) are only captured when it is
 * granted; a denied context carries nothing but the consent flag, source URL and capture time.
 */
import { isIP } from 'node:net';
import { and, desc, eq, gt, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import { AD_CONTEXT_LIMITS, sanitizeAdContext, type AdContext } from './types';

export const OPPREF_COOKIE_NAME = '__oppref';
export const OBREF_COOKIE_NAME = '__obref';
/** `__oppref` lives for 30 days; a stored click reference older than that is no longer valid. */
export const OPPREF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type AdvertisingConsent = AdContext['adConsent'];

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export interface ResolveAdContextInput {
  headers: Headers;
  cookies: CookieReader;
  authorId?: string | null;
  /** Explicit page URL (absolute, or a path on the Mythoria origin). */
  sourceUrl?: string;
  now?: Date;
}

/** Cookie reader over a raw `cookie` header, for route handlers that receive a plain `Request`. */
export function cookiesFromHeaders(headers: Headers): CookieReader {
  const values = new Map<string, string>();
  for (const part of (headers.get('cookie') ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (name && !values.has(name)) values.set(name, part.slice(separator + 1).trim());
  }
  return {
    get: (name: string) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
  };
}

function decodeCookie(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Granted iff the stored choice enables advertising (`preferences.advertising` or `ad_user_data`). */
export function readAdvertisingConsent(consentCookieValue?: string): AdvertisingConsent {
  const decoded = decodeCookie(consentCookieValue);
  if (!decoded) return 'denied';
  try {
    const parsed = JSON.parse(decoded) as {
      state?: { ad_user_data?: unknown };
      preferences?: { advertising?: unknown };
    } | null;
    if (!parsed || typeof parsed !== 'object') return 'denied';
    return parsed.preferences?.advertising === true || parsed.state?.ad_user_data === 'granted'
      ? 'granted'
      : 'denied';
  } catch {
    return 'denied';
  }
}

const BASE_ORIGIN = new URL(ANALYTICS_BASE_URL).origin;

/** Origin + redacted pathname on the Mythoria origin; never a query string or fragment. */
function mythoriaPageUrl(value: string | null | undefined): string | undefined {
  if (!value || value.length > 4096) return undefined;
  try {
    const url = new URL(value, ANALYTICS_BASE_URL);
    if (url.origin !== BASE_ORIGIN) return undefined;
    const pathname = sanitizeAnalyticsPathname(url.pathname);
    return pathname ? `${url.origin}${pathname}` : undefined;
  } catch {
    return undefined;
  }
}

function resolveSourceUrl(sourceUrl: string | undefined, headers: Headers): string {
  return (
    mythoriaPageUrl(sourceUrl) ?? mythoriaPageUrl(headers.get('referer')) ?? ANALYTICS_BASE_URL
  );
}

function validIp(value: string | null | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}

/** First `x-forwarded-for` hop (the client), else `x-real-ip`. */
export function clientIpAddress(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for');
  const firstHop = forwarded ? forwarded.split(',')[0] : undefined;
  return validIp(firstHop) ?? validIp(headers.get('x-real-ip'));
}

function cookieValue(cookies: CookieReader, name: string, maxLength: number): string | undefined {
  const value = decodeCookie(cookies.get(name)?.value)?.trim();
  return value && value.length <= maxLength ? value : undefined;
}

async function storedOpenAiReferences(
  authorId: string,
  now: Date,
): Promise<{ oppref?: string; obref?: string }> {
  const [row] = await db
    .select({ oppref: analyticsAttributions.oppref, obref: analyticsAttributions.obref })
    .from(analyticsAttributions)
    .where(
      and(
        eq(analyticsAttributions.authorId, authorId),
        isNotNull(analyticsAttributions.oppref),
        gt(analyticsAttributions.opprefCapturedAt, new Date(now.getTime() - OPPREF_MAX_AGE_MS)),
      ),
    )
    .orderBy(desc(analyticsAttributions.opprefCapturedAt))
    .limit(1);
  return {
    ...(row?.oppref ? { oppref: row.oppref } : {}),
    ...(row?.obref ? { obref: row.obref } : {}),
  };
}

/** A context carrying no identifiers, used when consent is denied or capture fails. */
export function deniedAdContext(sourceUrl?: string, now = new Date()): AdContext {
  return {
    adConsent: 'denied',
    sourceUrl: mythoriaPageUrl(sourceUrl) ?? ANALYTICS_BASE_URL,
    capturedAt: now.toISOString(),
  };
}

/**
 * Captures the advertising context of the current request. Always returns a context; identifiers
 * are only present when advertising consent is granted.
 */
export async function resolveAdContext({
  headers,
  cookies,
  authorId,
  sourceUrl,
  now = new Date(),
}: ResolveAdContextInput): Promise<AdContext> {
  const adConsent = readAdvertisingConsent(cookies.get(CONSENT_COOKIE_NAME)?.value);
  const base: AdContext = {
    adConsent,
    sourceUrl: resolveSourceUrl(sourceUrl, headers),
    capturedAt: now.toISOString(),
  };
  if (adConsent !== 'granted') return base;

  let oppref = cookieValue(cookies, OPPREF_COOKIE_NAME, AD_CONTEXT_LIMITS.oppref);
  let obref = cookieValue(cookies, OBREF_COOKIE_NAME, AD_CONTEXT_LIMITS.obref);
  if (!oppref && authorId) {
    try {
      const stored = await storedOpenAiReferences(authorId, now);
      oppref = stored.oppref;
      obref = obref ?? stored.obref;
    } catch (error) {
      console.warn('[OpenAIAds] Stored click reference lookup failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  const userAgent = headers.get('user-agent') ?? undefined;
  return (
    sanitizeAdContext({
      ...base,
      oppref,
      obref,
      ipAddress: clientIpAddress(headers),
      userAgent,
    }) ?? base
  );
}

/** `resolveAdContext` that never throws: falls back to a denied context on any failure. */
export async function resolveAdContextSafely(input: ResolveAdContextInput): Promise<AdContext> {
  try {
    return await resolveAdContext(input);
  } catch (error) {
    console.warn('[OpenAIAds] Ad context capture failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return deniedAdContext(input.sourceUrl, input.now);
  }
}
