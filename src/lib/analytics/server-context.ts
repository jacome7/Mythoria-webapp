import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema';
import { getValidatedIntent } from '@/lib/campaign-context';
import {
  sanitizeClientAnalyticsContext,
  type ClientAnalyticsContext,
} from '@/lib/analytics/ecommerce';

interface ResolveServerAnalyticsContextInput {
  browserContext?: unknown;
  attributionId?: string;
  authorId: string;
  storedConsentValue?: string;
}

export interface ResolvedServerAnalyticsContext {
  context?: ClientAnalyticsContext;
  attributionId?: string;
  primaryIntent?: ClientAnalyticsContext['primaryIntent'];
}

type AttributionRow = typeof analyticsAttributions.$inferSelect;

function contextFromAttribution(row: AttributionRow): ClientAnalyticsContext {
  const primaryIntent = getValidatedIntent(row.primaryIntent);
  return {
    clientId: row.clientId,
    ...(row.sessionId ? { sessionId: row.sessionId } : {}),
    ...(primaryIntent ? { primaryIntent } : {}),
    consent: row.consent,
  };
}

/** Resolve consented GA4 identity consistently across server-side funnel endpoints. */
export async function resolveServerAnalyticsContext({
  browserContext,
  attributionId,
  authorId,
  storedConsentValue,
}: ResolveServerAnalyticsContextInput): Promise<ResolvedServerAnalyticsContext> {
  const incoming = sanitizeClientAnalyticsContext(browserContext);
  let storedAnalyticsGranted = false;
  try {
    const stored = JSON.parse(decodeURIComponent(storedConsentValue || '')) as {
      state?: { analytics_storage?: string };
    };
    storedAnalyticsGranted = stored.state?.analytics_storage === 'granted';
  } catch {
    storedAnalyticsGranted = false;
  }
  if (!incoming && !storedAnalyticsGranted) return {};
  let attribution: AttributionRow | undefined;

  if (attributionId) {
    [attribution] = await db
      .select()
      .from(analyticsAttributions)
      .where(
        and(
          eq(analyticsAttributions.attributionId, attributionId),
          gt(analyticsAttributions.expiresAt, new Date()),
          or(isNull(analyticsAttributions.authorId), eq(analyticsAttributions.authorId, authorId)),
        ),
      )
      .limit(1);
  }

  if (!attribution) {
    [attribution] = await db
      .select()
      .from(analyticsAttributions)
      .where(
        and(
          eq(analyticsAttributions.authorId, authorId),
          gt(analyticsAttributions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(analyticsAttributions.createdAt))
      .limit(1);
  }

  const storedContext = attribution ? contextFromAttribution(attribution) : undefined;
  const context = incoming || storedContext;
  const primaryIntent = incoming?.primaryIntent || storedContext?.primaryIntent;
  return {
    ...(context ? { context: { ...context, ...(primaryIntent ? { primaryIntent } : {}) } } : {}),
    ...(attribution ? { attributionId: attribution.attributionId } : {}),
    ...(primaryIntent ? { primaryIntent } : {}),
  };
}
