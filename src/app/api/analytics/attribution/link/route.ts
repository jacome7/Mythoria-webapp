import { and, eq, gt, gte, lt, or, isNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import {
  clerkCreationTime,
  canRecoverSignUp,
  signUpAttributionMatchesCreation,
} from '@/lib/analytics/signup';
import { db } from '@/db';
import { analyticsAttributions, analyticsOutbox, storyGenerationRequests } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from '@/lib/analytics/page-context';
import { storyShareEventParams } from '@/lib/analytics/story-share';

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

    const now = new Date();
    const clerkUser = await currentUser();
    const occurredAt =
      clerkUser?.id === author.clerkUserId
        ? clerkCreationTime(clerkUser.createdAt, now)
        : undefined;
    const recoverSignUp =
      canRecoverSignUp(occurredAt, now) &&
      signUpAttributionMatchesCreation(occurredAt, attribution);
    const repaired = await db.transaction(async (tx) => {
      await tx
        .update(analyticsAttributions)
        .set({ authorId: author.authorId, linkedAt: new Date() })
        .where(eq(analyticsAttributions.attributionId, attributionId));

      const attributionParams = {
        ...(attribution.firstLandingPath ? { landing_path: attribution.firstLandingPath } : {}),
        ...(attribution.landingSlug ? { landing_slug: attribution.landingSlug } : {}),
        ...(attribution.firstPrimaryIntent || attribution.primaryIntent
          ? { primary_intent: attribution.firstPrimaryIntent || attribution.primaryIntent }
          : {}),
      };
      const storyShare =
        attribution.storyShareExpiresAt &&
        attribution.storyShareExpiresAt > new Date() &&
        attribution.storyShareItemId &&
        attribution.storyShareMethod &&
        attribution.storyShareScope
          ? storyShareEventParams({
              itemId: attribution.storyShareItemId,
              method: attribution.storyShareMethod as
                'whatsapp' | 'facebook' | 'email' | 'copy_link' | 'native_share',
              scope: attribution.storyShareScope as 'public' | 'private_view' | 'private_edit',
            })
          : {};
      const pageLocation = attribution.latestPath
        ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestPath}`)
        : undefined;
      const pageReferrer = attribution.latestReferrerPath
        ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestReferrerPath}`)
        : undefined;
      let signUpPending = false;
      if (recoverSignUp && occurredAt) {
        const signUpEligibility = and(
          isNull(analyticsOutbox.deliveredAt),
          eq(analyticsOutbox.occurredAt, occurredAt),
          or(
            isNull(analyticsOutbox.skippedAt),
            eq(analyticsOutbox.lastError, 'Analytics storage was not granted'),
          ),
          or(
            isNull(analyticsOutbox.attributionId),
            eq(analyticsOutbox.attributionId, attribution.attributionId),
          ),
          or(isNull(analyticsOutbox.clientId), eq(analyticsOutbox.clientId, attribution.clientId)),
          ...(attribution.sessionId
            ? [
                or(
                  isNull(analyticsOutbox.sessionId),
                  eq(analyticsOutbox.sessionId, attribution.sessionId),
                ),
              ]
            : [isNull(analyticsOutbox.sessionId)]),
        );
        const signUpUpdates = await tx
          .insert(analyticsOutbox)
          .values({
            dedupeKey: `sign_up:${author.clerkUserId}`,
            eventName: 'sign_up',
            occurredAt,
            authorId: author.authorId,
            attributionId: attribution.attributionId,
            clientId: attribution.clientId,
            userId: author.clerkUserId,
            sessionId: attribution.sessionId,
            consent: attribution.consent,
            pageLocation,
            pageReferrer,
            engagementTimeMsec: attribution.engagementTimeMsec,
            availableAt: new Date(),
            params: {
              method: 'unknown',
              ...attributionParams,
              ...(Object.keys(storyShare).length ? { story_share_attribution: 'within_30d' } : {}),
              ...storyShare,
            },
          })
          .onConflictDoUpdate({
            target: analyticsOutbox.dedupeKey,
            setWhere: and(
              signUpEligibility,
              isNull(analyticsOutbox.claimToken),
              isNull(analyticsOutbox.claimedAt),
            ),
            set: {
              authorId: author.authorId,
              attributionId: attribution.attributionId,
              clientId: attribution.clientId,
              sessionId: attribution.sessionId,
              consent: attribution.consent,
              pageLocation,
              pageReferrer,
              engagementTimeMsec: attribution.engagementTimeMsec,
              availableAt: new Date(),
              skippedAt: null,
              lastError: null,
              params: sql`${analyticsOutbox.params} || ${JSON.stringify({
                ...attributionParams,
                ...(Object.keys(storyShare).length
                  ? { story_share_attribution: 'within_30d' }
                  : {}),
                ...storyShare,
              })}::jsonb`,
            },
          })
          .returning({ outboxId: analyticsOutbox.outboxId });
        if (!signUpUpdates.length) {
          // A delivery claim may finish between the upsert and this read. Retry if the
          // original signup is still eligible, including a just-released no-consent skip.
          const [pending] = await tx
            .select({ outboxId: analyticsOutbox.outboxId })
            .from(analyticsOutbox)
            .where(
              and(
                eq(analyticsOutbox.dedupeKey, `sign_up:${author.clerkUserId}`),
                signUpEligibility,
              ),
            )
            .limit(1);
          signUpPending = Boolean(pending);
        }
      }

      const enrichedOutbox = await tx
        .update(analyticsOutbox)
        .set({
          clientId: attribution.clientId,
          attributionId: attribution.attributionId,
          sessionId: attribution.sessionId,
          consent: attribution.consent,
          availableAt: new Date(),
          lastError: null,
          pageLocation,
          pageReferrer,
          engagementTimeMsec: attribution.engagementTimeMsec,
        })
        .where(
          and(
            eq(analyticsOutbox.authorId, author.authorId),
            isNull(analyticsOutbox.attributionId),
            isNull(analyticsOutbox.clientId),
            isNull(analyticsOutbox.deliveredAt),
            isNull(analyticsOutbox.claimToken),
            isNull(analyticsOutbox.claimedAt),
            sql`${analyticsOutbox.eventName} <> ${'sign_up'}`,
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

      return { outbox: enrichedOutbox.length, requests: enrichedRequests.length, signUpPending };
    });

    console.info('[AnalyticsAttributionLink]', {
      linked: true,
      enrichedOutbox: repaired.outbox,
      enrichedRequests: repaired.requests,
    });

    return NextResponse.json({
      linked: true,
      ...(repaired.signUpPending ? { signUpPending: true } : {}),
    });
  } catch (error) {
    console.error('Failed to link analytics attribution:', error);
    return NextResponse.json({ error: 'Attribution link failed' }, { status: 500 });
  }
}
