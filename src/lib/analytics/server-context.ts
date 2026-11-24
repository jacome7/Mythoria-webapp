import { readAnalyticsConsentCookie } from './consent-server';
import { and, eq, gt, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema';
import { getValidatedIntent } from '@/lib/campaign-context';
import {
  sanitizeClientAnalyticsContext,
  type ClientAnalyticsContext,
} from '@/lib/analytics/ecommerce';
import type { AnalyticsConsent } from '@/db/schema';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from './page-context';

interface ResolveServerAnalyticsContextInput {
  browserContext?: unknown;
  attributionId?: string;
  authorId: string;
  storedConsentValue?: string;
  occurredAt?: Date;
}

export interface ResolvedServerAnalyticsContext {
  context?: ClientAnalyticsContext;
  consent?: AnalyticsConsent;
  attributionId?: string;
  primaryIntent?: ClientAnalyticsContext['primaryIntent'];
  landingSlug?: string;
  landingPath?: string;
}

type AttributionRow = typeof analyticsAttributions.$inferSelect;

function contextFromAttribution(row: AttributionRow): ClientAnalyticsContext {
  const primaryIntent = getValidatedIntent(row.firstPrimaryIntent || row.primaryIntent);
  const pageLocation = row.latestPath
    ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${row.latestPath}`)
    : undefined;
  const pageReferrer = row.latestReferrerPath
    ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${row.latestReferrerPath}`)
    : undefined;
  return {
    clientId: row.clientId,
    ...(row.sessionId ? { sessionId: row.sessionId } : {}),
    ...(primaryIntent ? { primaryIntent } : {}),
    ...(pageLocation ? { pageLocation } : {}),
    ...(pageReferrer ? { pageReferrer } : {}),
    ...(row.engagementTimeMsec ? { engagementTimeMsec: row.engagementTimeMsec } : {}),
    consent: row.consent,
  };
}

/** Resolve consented GA4 identity consistently across server-side funnel endpoints. */
export async function resolveServerAnalyticsContext({
  browserContext,
  attributionId,
  authorId,
  storedConsentValue,
  occurredAt = new Date(),
}: ResolveServerAnalyticsContextInput): Promise<ResolvedServerAnalyticsContext> {
  const incoming = sanitizeClientAnalyticsContext(browserContext);
  const consent = readAnalyticsConsentCookie(storedConsentValue);
  if (!consent) return {};
  let attribution: AttributionRow | undefined;

  if (attributionId) {
    [attribution] = await db
      .select()
      .from(analyticsAttributions)
      .where(
        and(
          eq(analyticsAttributions.attributionId, attributionId),
          lte(analyticsAttributions.createdAt, occurredAt),
          gt(analyticsAttributions.expiresAt, occurredAt),
          isNull(analyticsAttributions.revokedAt),
          or(
            isNull(analyticsAttributions.latestAttributionAt),
            lte(analyticsAttributions.latestAttributionAt, occurredAt),
          ),
          or(isNull(analyticsAttributions.authorId), eq(analyticsAttributions.authorId, authorId)),
        ),
      )
      .limit(1);
  }

  const storedContext = attribution ? contextFromAttribution(attribution) : undefined;
  if (
    attribution &&
    incoming &&
    (incoming.clientId !== attribution.clientId ||
      (incoming.sessionId && attribution.sessionId && incoming.sessionId !== attribution.sessionId))
  ) {
    console.warn('[Analytics] Incoming GA identity did not match explicit attribution');
  }
  const candidateContext = storedContext
    ? {
        ...storedContext,
        ...(incoming?.pageLocation ? { pageLocation: incoming.pageLocation } : {}),
        ...(incoming?.pageReferrer ? { pageReferrer: incoming.pageReferrer } : {}),
        ...(incoming?.engagementTimeMsec
          ? { engagementTimeMsec: incoming.engagementTimeMsec }
          : {}),
      }
    : incoming;
  const context = candidateContext ? { ...candidateContext, consent } : undefined;
  const primaryIntent = storedContext?.primaryIntent || incoming?.primaryIntent;
  const landingSlug = attribution?.landingSlug || undefined;
  const landingPath = attribution?.firstLandingPath || undefined;
  return {
    consent,
    ...(context ? { context: { ...context, ...(primaryIntent ? { primaryIntent } : {}) } } : {}),
    ...(attribution ? { attributionId: attribution.attributionId } : {}),
    ...(primaryIntent ? { primaryIntent } : {}),
    ...(landingSlug ? { landingSlug } : {}),
    ...(landingPath ? { landingPath } : {}),
  };
}
