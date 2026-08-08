import { and, eq, gt, gte, lt, or, isNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { analyticsAttributions, analyticsOutbox, storyGenerationRequests } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from '@/lib/analytics/page-context';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const attributionId = request.cookies.get('mythoria_attribution')?.value;
  if (!attributionId) return NextResponse.json({ linked: false });

  try {
    const [attribution] = await db
      .select()
      .from(analyticsAttributions)
      .where(
        and(
          eq(analyticsAttributions.attributionId, attributionId),
          gt(analyticsAttributions.expiresAt, new Date()),
          or(
            isNull(analyticsAttributions.authorId),
            eq(analyticsAttributions.authorId, author.authorId),
          ),
        ),
      );
    if (!attribution) return NextResponse.json({ linked: false });

    const repaired = await db.transaction(async (tx) => {
      await tx
        .update(analyticsAttributions)
        .set({ authorId: author.authorId, linkedAt: new Date() })
        .where(eq(analyticsAttributions.attributionId, attributionId));

      const attributionParams = {
        ...(attribution.firstLandingPath || attribution.landingSlug
          ? { landing_slug: attribution.firstLandingPath || attribution.landingSlug }
          : {}),
        ...(attribution.firstPrimaryIntent || attribution.primaryIntent
          ? { primary_intent: attribution.firstPrimaryIntent || attribution.primaryIntent }
          : {}),
      };
      const pageLocation = attribution.latestPath
        ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestPath}`)
        : undefined;
      const pageReferrer = attribution.latestReferrerPath
        ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestReferrerPath}`)
        : undefined;
      await tx
        .insert(analyticsOutbox)
        .values({
          dedupeKey: `sign_up:${author.clerkUserId}`,
          eventName: 'sign_up',
          authorId: author.authorId,
          attributionId: attribution.attributionId,
          clientId: attribution.clientId,
          userId: author.clerkUserId,
          sessionId: attribution.sessionId,
          consent: attribution.consent,
          pageLocation,
          pageReferrer,
          engagementTimeMsec: 100,
          availableAt: new Date(),
          params: { method: 'unknown', ...attributionParams },
        })
        .onConflictDoUpdate({
          target: analyticsOutbox.dedupeKey,
          set: {
            authorId: author.authorId,
            attributionId: attribution.attributionId,
            clientId: attribution.clientId,
            sessionId: attribution.sessionId,
            consent: attribution.consent,
            pageLocation,
            pageReferrer,
            engagementTimeMsec: 100,
            availableAt: new Date(),
            claimToken: null,
            claimedAt: null,
            skippedAt: null,
            lastError: null,
            params: sql`${analyticsOutbox.params} || ${JSON.stringify(attributionParams)}::jsonb`,
          },
        })
        .returning({ outboxId: analyticsOutbox.outboxId });

      const enrichedOutbox = await tx
        .update(analyticsOutbox)
        .set({
          clientId: attribution.clientId,
          attributionId: attribution.attributionId,
          sessionId: attribution.sessionId,
          consent: attribution.consent,
          availableAt: new Date(),
          claimToken: null,
          claimedAt: null,
          lastError: null,
          pageLocation,
          pageReferrer,
          engagementTimeMsec: 100,
        })
        .where(
          and(
            eq(analyticsOutbox.authorId, author.authorId),
            isNull(analyticsOutbox.attributionId),
            isNull(analyticsOutbox.clientId),
            isNull(analyticsOutbox.deliveredAt),
            isNull(analyticsOutbox.skippedAt),
            gte(analyticsOutbox.occurredAt, attribution.createdAt),
            lt(analyticsOutbox.occurredAt, attribution.expiresAt),
            ...(attribution.latestAttributionAt
              ? [gte(analyticsOutbox.occurredAt, attribution.latestAttributionAt)]
              : []),
            ...(attribution.sessionId
              ? [
                  or(
                    isNull(analyticsOutbox.sessionId),
                    eq(analyticsOutbox.sessionId, attribution.sessionId),
                  ),
                ]
              : []),
          ),
        )
        .returning({ outboxId: analyticsOutbox.outboxId });

      const enrichedRequests = await tx
        .update(storyGenerationRequests)
        .set({
          attributionId: attribution.attributionId,
          clientId: attribution.clientId,
          sessionId: attribution.sessionId,
          consent: attribution.consent,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storyGenerationRequests.authorId, author.authorId),
            isNull(storyGenerationRequests.clientId),
            isNull(storyGenerationRequests.terminalAt),
            gte(storyGenerationRequests.createdAt, attribution.createdAt),
            lt(storyGenerationRequests.createdAt, attribution.expiresAt),
            ...(attribution.latestAttributionAt
              ? [gte(storyGenerationRequests.createdAt, attribution.latestAttributionAt)]
              : []),
            ...(attribution.sessionId
              ? [
                  or(
                    isNull(storyGenerationRequests.sessionId),
                    eq(storyGenerationRequests.sessionId, attribution.sessionId),
                  ),
                ]
              : []),
          ),
        )
        .returning({ runId: storyGenerationRequests.runId });

      return { outbox: enrichedOutbox.length, requests: enrichedRequests.length };
    });

    console.info('[AnalyticsAttributionLink]', {
      linked: true,
      enrichedOutbox: repaired.outbox,
      enrichedRequests: repaired.requests,
    });

    return NextResponse.json({ linked: true });
  } catch (error) {
    console.error('Failed to link analytics attribution:', error);
    return NextResponse.json({ error: 'Attribution link failed' }, { status: 500 });
  }
}
