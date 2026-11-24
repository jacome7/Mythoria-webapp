import { createHash, randomUUID } from 'crypto';
import { and, asc, desc, eq, getTableColumns, gt, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  analyticsAttributions,
  authorCreditBalances,
  creditLedger,
  stories,
  storyGenerationRequests,
  type AnalyticsConsent,
} from '@/db/schema';
import { publishStoryRequest } from '@/lib/pubsub';
import { draftPremiumBookMarker, premiumBookType } from '@/lib/premium-children-book/contract';
import {
  deliverAdConversions,
  fanOutAdConversions,
  safeAdErrorMessage,
  scrubPaymentOrderAdContext,
} from '@/lib/openai-ads/outbox';
import { ga4Service } from './ga4';
import { getServerAnalyticsDestination, isGaClientId } from './destinations';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from './page-context';
import { storyShareEventParams, storyShareFromCampaign } from './story-share';

const MAX_DELIVERY_ATTEMPTS = 8;
const BATCH_SIZE = 25;
const ABANDONED_PUBLISH_CLAIM_MS = 5 * 60 * 1000;
const ABANDONED_ANALYTICS_CLAIM_MS = 5 * 60 * 1000;
const ATTRIBUTION_GRACE_MS = 24 * 60 * 60 * 1000;
const ATTRIBUTION_RETRY_MS = 5 * 60 * 1000;

export { signUpOutboxEntry } from './signup';

const retryAt = (attempts: number): Date => {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts));
  return new Date(Date.now() + delayMinutes * 60_000);
};

const eventReference = (dedupeKey: string): string =>
  createHash('sha256').update(dedupeKey).digest('hex').slice(0, 12);

function logAnalyticsOutcome(
  entry: { dedupeKey: string; eventName: string },
  outcome: string,
  details: Record<string, unknown> = {},
): void {
  console.info('[AnalyticsOutbox]', {
    eventName: entry.eventName,
    eventRef: eventReference(entry.dedupeKey),
    outcome,
    ...details,
  });
}

function storyShareParamsForEvent(
  attribution: typeof analyticsAttributions.$inferSelect | undefined,
  occurredAt: Date,
): Record<string, string> {
  if (
    !attribution?.storyShareExpiresAt ||
    attribution.storyShareExpiresAt <= occurredAt ||
    !attribution.storyShareItemId ||
    !attribution.storyShareMethod ||
    !attribution.storyShareScope
  ) {
    return {};
  }
  const medium =
    attribution.storyShareMethod === 'whatsapp' || attribution.storyShareMethod === 'facebook'
      ? 'social'
      : attribution.storyShareMethod === 'email'
        ? 'email'
        : 'referral';
  const context = storyShareFromCampaign({
    utm_source: attribution.storyShareMethod,
    utm_medium: medium,
    utm_campaign: 'story_share',
    utm_id: attribution.storyShareItemId,
    utm_content: attribution.storyShareScope,
  });
  return context
    ? { story_share_attribution: 'within_30d', ...storyShareEventParams(context) }
    : {};
}

export async function deliverAnalytics(): Promise<{
  delivered: number;
  failed: number;
  skipped: number;
  deferred: number;
}> {
  if (!getServerAnalyticsDestination()) return { delivered: 0, failed: 0, skipped: 0, deferred: 0 };
  const now = new Date();
  const abandonedBefore = new Date(now.getTime() - ABANDONED_ANALYTICS_CLAIM_MS);
  const entries = await db
    .select()
    .from(analyticsOutbox)
    .where(
      and(
        isNull(analyticsOutbox.deliveredAt),
        isNull(analyticsOutbox.skippedAt),
        lte(analyticsOutbox.availableAt, now),
        lt(analyticsOutbox.attempts, MAX_DELIVERY_ATTEMPTS),
        or(isNull(analyticsOutbox.claimedAt), lte(analyticsOutbox.claimedAt, abandonedBefore)),
      ),
    )
    .orderBy(asc(analyticsOutbox.occurredAt))
    .limit(BATCH_SIZE);

  let delivered = 0;
  let failed = 0;
  let skipped = 0;
  let deferred = 0;

  for (const entry of entries) {
    const claimTime = new Date();
    const claimToken = randomUUID();
    const [claimed] = await db
      .update(analyticsOutbox)
      .set({ claimToken, claimedAt: claimTime })
      .where(
        and(
          eq(analyticsOutbox.outboxId, entry.outboxId),
          isNull(analyticsOutbox.deliveredAt),
          isNull(analyticsOutbox.skippedAt),
          lte(analyticsOutbox.availableAt, claimTime),
          lt(analyticsOutbox.attempts, MAX_DELIVERY_ATTEMPTS),
          or(isNull(analyticsOutbox.claimedAt), lte(analyticsOutbox.claimedAt, abandonedBefore)),
        ),
      )
      .returning();
    if (!claimed) continue;

    logAnalyticsOutcome(claimed, 'claimed', { attempts: claimed.attempts });
    const claimWhere = and(
      eq(analyticsOutbox.outboxId, claimed.outboxId),
      eq(analyticsOutbox.claimToken, claimToken),
    );

    if (claimed.consent?.analyticsStorage !== 'granted') {
      await db
        .update(analyticsOutbox)
        .set({
          skippedAt: new Date(),
          claimToken: null,
          claimedAt: null,
          suppressionReason: 'consent_missing',
          lastError: 'Analytics storage was not granted',
        })
        .where(claimWhere);
      logAnalyticsOutcome(claimed, 'skipped', { reason: 'analytics_storage_not_granted' });
      skipped += 1;
      continue;
    }

    let effectiveEntry = claimed;
    let effectiveAttribution: typeof analyticsAttributions.$inferSelect | undefined;
    if (
      effectiveEntry.authorId &&
      (effectiveEntry.attributionId ||
        !effectiveEntry.clientId ||
        !effectiveEntry.sessionId ||
        !effectiveEntry.engagementTimeMsec)
    ) {
      const eventTimeConditions = [
        isNull(analyticsAttributions.revokedAt),
        lte(analyticsAttributions.createdAt, effectiveEntry.occurredAt),
        gt(analyticsAttributions.expiresAt, effectiveEntry.occurredAt),
        or(
          isNull(analyticsAttributions.latestAttributionAt),
          lte(analyticsAttributions.latestAttributionAt, effectiveEntry.occurredAt),
        ),
        or(
          isNull(analyticsAttributions.authorId),
          eq(analyticsAttributions.authorId, effectiveEntry.authorId),
        ),
      ];
      const [attribution] = effectiveEntry.attributionId
        ? await db
            .select()
            .from(analyticsAttributions)
            .where(
              and(
                eq(analyticsAttributions.attributionId, effectiveEntry.attributionId),
                ...eventTimeConditions,
              ),
            )
            .limit(1)
        : await db
            .select()
            .from(analyticsAttributions)
            .where(
              and(
                eq(analyticsAttributions.authorId, effectiveEntry.authorId),
                ...eventTimeConditions,
                ...(effectiveEntry.sessionId
                  ? [eq(analyticsAttributions.sessionId, effectiveEntry.sessionId)]
                  : []),
              ),
            )
            .orderBy(desc(analyticsAttributions.createdAt))
            .limit(1);
      if (attribution) {
        effectiveAttribution = attribution;
        const primaryIntent = attribution.firstPrimaryIntent || attribution.primaryIntent;
        const pageLocation = attribution.latestPath
          ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestPath}`)
          : undefined;
        const pageReferrer = attribution.latestReferrerPath
          ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestReferrerPath}`)
          : undefined;
        const params = {
          ...effectiveEntry.params,
          ...(primaryIntent && typeof effectiveEntry.params.primary_intent !== 'string'
            ? { primary_intent: primaryIntent }
            : {}),
          ...storyShareParamsForEvent(attribution, effectiveEntry.occurredAt),
        };
        const [enriched] = await db
          .update(analyticsOutbox)
          .set({
            attributionId: attribution.attributionId,
            clientId: attribution.clientId,
            sessionId: attribution.sessionId,
            consent: attribution.consent,
            pageLocation: effectiveEntry.pageLocation || pageLocation,
            pageReferrer: effectiveEntry.pageReferrer || pageReferrer,
            engagementTimeMsec: effectiveEntry.engagementTimeMsec || attribution.engagementTimeMsec,
            params,
            lastError: null,
          })
          .where(claimWhere)
          .returning();
        if (!enriched) continue;
        effectiveEntry = enriched;
        logAnalyticsOutcome(effectiveEntry, 'context_enriched');
      }
    }

    if (!effectiveAttribution && effectiveEntry.attributionId && effectiveEntry.authorId) {
      const [storyShareAttribution] = await db
        .select()
        .from(analyticsAttributions)
        .where(
          and(
            eq(analyticsAttributions.attributionId, effectiveEntry.attributionId),
            isNull(analyticsAttributions.revokedAt),
            lte(analyticsAttributions.createdAt, effectiveEntry.occurredAt),
            gt(analyticsAttributions.storyShareExpiresAt, effectiveEntry.occurredAt),
            or(
              isNull(analyticsAttributions.authorId),
              eq(analyticsAttributions.authorId, effectiveEntry.authorId),
            ),
          ),
        )
        .limit(1);
      const shareParams = storyShareParamsForEvent(
        storyShareAttribution,
        effectiveEntry.occurredAt,
      );
      if (Object.keys(shareParams).length) {
        const [enriched] = await db
          .update(analyticsOutbox)
          .set({ params: { ...effectiveEntry.params, ...shareParams }, lastError: null })
          .where(claimWhere)
          .returning();
        if (!enriched) continue;
        effectiveEntry = enriched;
        logAnalyticsOutcome(effectiveEntry, 'share_context_enriched');
      }
    }

    const requiresSessionAttribution = Boolean(effectiveEntry.attributionId);
    const missingDeliveryContext =
      !effectiveEntry.clientId ||
      !effectiveEntry.engagementTimeMsec ||
      (requiresSessionAttribution && !effectiveEntry.sessionId);
    if (missingDeliveryContext) {
      const attributionDeadline = new Date(
        (effectiveAttribution?.createdAt || effectiveEntry.occurredAt).getTime() +
          ATTRIBUTION_GRACE_MS,
      );
      const graceExpired = Date.now() >= attributionDeadline.getTime();
      if (!graceExpired && effectiveEntry.authorId) {
        const availableAt = new Date(
          Math.min(Date.now() + ATTRIBUTION_RETRY_MS, attributionDeadline.getTime()),
        );
        await db
          .update(analyticsOutbox)
          .set({
            availableAt,
            claimToken: null,
            claimedAt: null,
            lastError: 'Awaiting explicit session-linked analytics context',
          })
          .where(claimWhere);
        logAnalyticsOutcome(effectiveEntry, 'deferred_context');
        deferred += 1;
        continue;
      }

      await db
        .update(analyticsOutbox)
        .set({
          skippedAt: new Date(),
          claimToken: null,
          claimedAt: null,
          suppressionReason: 'session_unavailable',
          lastError: 'Explicit session-linked analytics context was unavailable before deadline',
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'skipped', { reason: 'attribution_unavailable' });
      skipped += 1;
      continue;
    }

    if (!effectiveEntry.attributionId || !isGaClientId(effectiveEntry.clientId)) {
      const suppressionReason = effectiveEntry.attributionId
        ? 'ga_client_unavailable'
        : 'receipt_unavailable';
      await db
        .update(analyticsOutbox)
        .set({
          skippedAt: new Date(),
          suppressionReason,
          claimToken: null,
          claimedAt: null,
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'skipped', { reason: suppressionReason });
      skipped += 1;
      continue;
    }

    const event = {
      eventName: effectiveEntry.eventName,
      clientId: effectiveEntry.clientId!,
      ...(effectiveEntry.sessionId ? { sessionId: effectiveEntry.sessionId } : {}),
      requireSessionAttribution: requiresSessionAttribution,
      ...(effectiveEntry.pageLocation ? { pageLocation: effectiveEntry.pageLocation } : {}),
      ...(effectiveEntry.pageReferrer ? { pageReferrer: effectiveEntry.pageReferrer } : {}),
      engagementTimeMsec: effectiveEntry.engagementTimeMsec!,
      consent: claimed.consent,
      occurredAt: effectiveEntry.occurredAt,
      params: effectiveEntry.params,
    };
    const attributionId = effectiveEntry.attributionId;
    const withCurrentConsent = (send: typeof ga4Service.sendEvent) =>
      db.transaction(async (tx) => {
        // Sharing the receipt lock establishes a cutoff at revoke acknowledgment. Keep only
        // a bounded network request inside each transaction and recheck between the two sends.
        const [receipt] = await tx
          .select()
          .from(analyticsAttributions)
          .where(
            and(
              eq(analyticsAttributions.attributionId, attributionId),
              isNull(analyticsAttributions.revokedAt),
              lte(analyticsAttributions.createdAt, event.occurredAt),
            ),
          )
          .for('share');
        if (!receipt || receipt.clientId !== event.clientId) return undefined;
        return send({
          ...event,
          consent: {
            analyticsStorage: 'granted',
            adUserData:
              receipt.consent.adUserData === 'granted' ? event.consent.adUserData : 'denied',
            adPersonalization:
              receipt.consent.adPersonalization === 'granted'
                ? event.consent.adPersonalization
                : 'denied',
          },
        });
      });

    const validation = await withCurrentConsent(ga4Service.validateEvent);
    const result = validation?.ok ? await withCurrentConsent(ga4Service.sendEvent) : validation;
    if (!result) {
      await db
        .update(analyticsOutbox)
        .set({
          skippedAt: new Date(),
          suppressionReason: 'receipt_unavailable',
          claimToken: null,
          claimedAt: null,
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'skipped', { reason: 'receipt_unavailable' });
      skipped += 1;
      continue;
    }

    if (result.ok) {
      // GA4 2xx acknowledges transport only. End-to-end ingestion is verified by the release probe.
      await db
        .update(analyticsOutbox)
        .set({
          deliveredAt: new Date(),
          attempts: effectiveEntry.attempts + 1,
          claimToken: null,
          claimedAt: null,
          lastError: null,
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'transport_delivered', {
        attempts: effectiveEntry.attempts + 1,
      });
      delivered += 1;
    } else {
      const attempts = effectiveEntry.attempts + 1;
      await db
        .update(analyticsOutbox)
        .set({
          attempts,
          availableAt: retryAt(attempts),
          claimToken: null,
          claimedAt: null,
          lastError: result.errors.join('; ').slice(0, 2000),
          ...(attempts >= MAX_DELIVERY_ATTEMPTS
            ? {
                skippedAt: new Date(),
                suppressionReason: validation?.ok ? 'transport_failed' : 'validation_failed',
              }
            : {}),
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'failed', {
        attempts,
        validationErrors: result.errors.length,
      });
      failed += 1;
    }
  }

  return { delivered, failed, skipped, deferred };
}

export async function compensateGeneration(
  runId: string,
  publishFailure?: { claimedAt: Date; attempts: number; message: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    // SGW activates a premium run under the same story-then-request lock order.
    await tx
      .select({ storyId: stories.storyId })
      .from(stories)
      .innerJoin(storyGenerationRequests, eq(storyGenerationRequests.storyId, stories.storyId))
      .where(eq(storyGenerationRequests.runId, runId))
      .for('update', { of: stories });
    const [request] = await tx
      .select()
      .from(storyGenerationRequests)
      .where(
        and(
          eq(storyGenerationRequests.runId, runId),
          eq(storyGenerationRequests.status, publishFailure ? 'publishing' : 'delivery_failed'),
          publishFailure
            ? eq(storyGenerationRequests.updatedAt, publishFailure.claimedAt)
            : undefined,
          isNull(storyGenerationRequests.compensatedAt),
          isNull(storyGenerationRequests.terminalAt),
        ),
      )
      .for('update');
    if (!request) return;

    if (request.creditsSpent > 0) {
      const [unclaimed] = await tx
        .update(stories)
        .set({
          status: 'draft',
          storyGenerationStatus: 'failed',
          features: sql`case when ${stories.features} ? 'premiumBook'
            then jsonb_set(${stories.features}, '{premiumBook}', ${JSON.stringify(draftPremiumBookMarker)}::jsonb)
            else ${stories.features} end`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stories.storyId, request.storyId),
            eq(stories.authorId, request.authorId),
            eq(stories.status, 'writing'),
            eq(stories.storyGenerationStatus, 'queued'),
            sql`(not coalesce(${stories.features} ? 'premiumBook', false) or (
            ${stories.features}->'premiumBook'->>'state' = 'queued' and
            ${stories.features}->'premiumBook'->>'revision' = ${runId}
          ))`,
          ),
        )
        .returning({ storyId: stories.storyId });
      if (!unclaimed) {
        // The broker can deliver despite reporting a failure. Allow terminal reconciliation.
        await tx
          .update(storyGenerationRequests)
          .set({
            status: 'published',
            ...(publishFailure && {
              publishAttempts: publishFailure.attempts,
              lastError: publishFailure.message,
            }),
            updatedAt: new Date(),
          })
          .where(eq(storyGenerationRequests.runId, runId));
        return;
      }
      const refundKey = `story_generation_refund:${runId}`;
      const [refund] = await tx
        .insert(creditLedger)
        .values({
          authorId: request.authorId,
          amount: request.creditsSpent,
          creditEventType: 'refund',
          storyId: request.storyId,
          idempotencyKey: refundKey,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey })
        .returning();

      if (refund) {
        await tx
          .update(authorCreditBalances)
          .set({
            totalCredits: sql`${authorCreditBalances.totalCredits} + ${request.creditsSpent}`,
            lastUpdated: new Date(),
          })
          .where(eq(authorCreditBalances.authorId, request.authorId));
      }
    } else {
      // Admin/MCP restarts spend no credits. Preserve the last published story
      // while exposing the failed regeneration attempt.
      await tx
        .update(stories)
        .set({ storyGenerationStatus: 'failed', updatedAt: new Date() })
        .where(eq(stories.storyId, request.storyId));
    }

    await tx
      .update(storyGenerationRequests)
      .set({
        status: 'delivery_failed',
        ...(publishFailure && {
          publishAttempts: publishFailure.attempts,
          lastError: publishFailure.message,
        }),
        compensatedAt: new Date(),
        terminalAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storyGenerationRequests.runId, runId));
  });
}

export async function publishGenerations(): Promise<{ published: number; failed: number }> {
  const now = new Date();
  const abandonedBefore = new Date(now.getTime() - ABANDONED_PUBLISH_CLAIM_MS);
  const requests = await db
    .select({
      ...getTableColumns(storyGenerationRequests),
      premium: sql<boolean>`exists (
        select 1 from "stories" as "generation_story"
        where "generation_story"."story_id" = "story_generation_requests"."story_id"
          and "generation_story"."features"->'premiumBook'->>'type' = ${premiumBookType}
          and "generation_story"."features"->'premiumBook'->>'revision' = "story_generation_requests"."run_id"::text
      )`,
    })
    .from(storyGenerationRequests)
    .where(
      or(
        and(
          eq(storyGenerationRequests.status, 'delivery_failed'),
          isNull(storyGenerationRequests.compensatedAt),
          isNull(storyGenerationRequests.terminalAt),
        ),
        and(
          or(
            eq(storyGenerationRequests.status, 'queued'),
            eq(storyGenerationRequests.status, 'retrying'),
            and(
              eq(storyGenerationRequests.status, 'publishing'),
              lte(storyGenerationRequests.updatedAt, abandonedBefore),
            ),
          ),
          lte(storyGenerationRequests.availableAt, now),
          lt(storyGenerationRequests.publishAttempts, MAX_DELIVERY_ATTEMPTS),
        ),
      ),
    )
    .orderBy(asc(storyGenerationRequests.createdAt))
    .limit(BATCH_SIZE);

  let published = 0;
  let failed = 0;
  for (const request of requests) {
    if (request.status === 'delivery_failed') {
      await compensateGeneration(request.runId);
      continue;
    }
    const claimTime = new Date();
    const [claimed] = await db
      .update(storyGenerationRequests)
      .set({ status: 'publishing', updatedAt: claimTime })
      .where(
        and(
          eq(storyGenerationRequests.runId, request.runId),
          or(
            eq(storyGenerationRequests.status, 'queued'),
            eq(storyGenerationRequests.status, 'retrying'),
            and(
              eq(storyGenerationRequests.status, 'publishing'),
              lte(storyGenerationRequests.updatedAt, abandonedBefore),
            ),
          ),
          lte(storyGenerationRequests.availableAt, claimTime),
          lt(storyGenerationRequests.publishAttempts, MAX_DELIVERY_ATTEMPTS),
        ),
      )
      .returning();
    if (!claimed) continue;

    let messageId: string;
    try {
      messageId = await publishStoryRequest({
        storyId: claimed.storyId,
        runId: claimed.runId,
        ...(request.premium ? { bookType: premiumBookType } : {}),
      });
    } catch (error) {
      const attempts = claimed.publishAttempts + 1;
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        // Keep the claim recoverable until the story reset, refund and terminal request commit.
        await compensateGeneration(claimed.runId, { claimedAt: claimTime, attempts, message });
      } else {
        await db
          .update(storyGenerationRequests)
          .set({
            status: 'retrying',
            publishAttempts: attempts,
            availableAt: retryAt(attempts),
            lastError: message,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(storyGenerationRequests.runId, claimed.runId),
              eq(storyGenerationRequests.status, 'publishing'),
              eq(storyGenerationRequests.updatedAt, claimTime),
            ),
          );
      }
      failed += 1;
      continue;
    }

    try {
      await db
        .update(storyGenerationRequests)
        .set({
          status: 'published',
          messageId,
          publishedAt: new Date(),
          publishAttempts: claimed.publishAttempts + 1,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storyGenerationRequests.runId, claimed.runId),
            eq(storyGenerationRequests.status, 'publishing'),
            eq(storyGenerationRequests.updatedAt, claimTime),
          ),
        );
      published += 1;
    } catch {
      // The broker accepted the message. A failed acknowledgement write is safe to retry.
      console.error('Story queue acknowledgement could not be recorded', { runId: claimed.runId });
      failed += 1;
    }
  }
  return { published, failed };
}

async function drainAdConversions() {
  // OpenAI Ads delivery is isolated: its failures must never break GA4 or generation draining.
  let fanOut: { created: number } | { error: string };
  try {
    fanOut = await fanOutAdConversions();
  } catch (error) {
    console.error('[AdConversionOutbox] fan-out failed', { error: safeAdErrorMessage(error) });
    fanOut = { error: 'fan_out_failed' };
  }
  let delivery: Awaited<ReturnType<typeof deliverAdConversions>> | { error: string };
  try {
    delivery = await deliverAdConversions();
  } catch (error) {
    console.error('[AdConversionOutbox] delivery failed', { error: safeAdErrorMessage(error) });
    delivery = { error: 'delivery_failed' };
  }
  let paymentScrub: { scrubbed: number } | { error: string };
  try {
    paymentScrub = await scrubPaymentOrderAdContext();
  } catch (error) {
    console.error('[AdConversionOutbox] payment ad context scrub failed', {
      error: safeAdErrorMessage(error),
    });
    paymentScrub = { error: 'payment_scrub_failed' };
  }
  return { fanOut, delivery, paymentScrub };
}

export async function drainDurableOutboxes() {
  const [generation, analytics, ads] = await Promise.all([
    publishGenerations(),
    deliverAnalytics(),
    drainAdConversions(),
  ]);
  return { generation, analytics, ads };
}

export function normalizeAnalyticsConsent(
  consent: AnalyticsConsent | null,
): AnalyticsConsent | null {
  return consent?.analyticsStorage === 'granted' ? consent : null;
}
