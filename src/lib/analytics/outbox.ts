import { createHash, randomUUID } from 'crypto';
import { and, asc, desc, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  analyticsAttributions,
  authorCreditBalances,
  creditLedger,
  stories,
  storyGenerationRequests,
  type AnalyticsConsent,
  type NewAnalyticsOutboxEntry,
} from '@/db/schema';
import { publishStoryRequest } from '@/lib/pubsub';
import { ga4Service } from './ga4';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from './page-context';

const MAX_DELIVERY_ATTEMPTS = 8;
const BATCH_SIZE = 25;
const ABANDONED_PUBLISH_CLAIM_MS = 5 * 60 * 1000;
const ABANDONED_ANALYTICS_CLAIM_MS = 5 * 60 * 1000;
const ATTRIBUTION_GRACE_MS = 24 * 60 * 60 * 1000;
const ATTRIBUTION_RETRY_MS = 5 * 60 * 1000;

export function signUpOutboxEntry(
  clerkUserId: string,
  occurredAt = new Date(),
): NewAnalyticsOutboxEntry {
  return {
    dedupeKey: `sign_up:${clerkUserId}`,
    eventName: 'sign_up',
    userId: clerkUserId,
    params: { method: 'unknown' },
    occurredAt,
    availableAt: new Date(occurredAt.getTime() + 24 * 60 * 60 * 1000),
  };
}

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

export async function deliverAnalytics(): Promise<{
  delivered: number;
  failed: number;
  skipped: number;
  deferred: number;
}> {
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
          lastError: 'Analytics storage was not granted',
        })
        .where(claimWhere);
      logAnalyticsOutcome(claimed, 'skipped', { reason: 'analytics_storage_not_granted' });
      skipped += 1;
      continue;
    }
    const analyticsConsent = claimed.consent;

    let effectiveEntry = claimed;
    if (effectiveEntry.authorId && (!effectiveEntry.clientId || !effectiveEntry.attributionId)) {
      const eventTimeConditions = [
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
            engagementTimeMsec: effectiveEntry.engagementTimeMsec || 100,
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

    if (!effectiveEntry.clientId) {
      const graceExpired = Date.now() - effectiveEntry.occurredAt.getTime() >= ATTRIBUTION_GRACE_MS;
      if (!graceExpired && effectiveEntry.authorId) {
        await db
          .update(analyticsOutbox)
          .set({
            availableAt: new Date(Date.now() + ATTRIBUTION_RETRY_MS),
            claimToken: null,
            claimedAt: null,
            lastError: 'Awaiting consented analytics attribution',
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
          lastError: 'Consented analytics attribution was unavailable after the grace period',
        })
        .where(claimWhere);
      logAnalyticsOutcome(effectiveEntry, 'skipped', { reason: 'attribution_unavailable' });
      skipped += 1;
      continue;
    }

    const event = {
      eventName: effectiveEntry.eventName,
      clientId: effectiveEntry.clientId,
      ...(effectiveEntry.userId ? { userId: effectiveEntry.userId } : {}),
      ...(effectiveEntry.sessionId ? { sessionId: effectiveEntry.sessionId } : {}),
      ...(effectiveEntry.pageLocation ? { pageLocation: effectiveEntry.pageLocation } : {}),
      ...(effectiveEntry.pageReferrer ? { pageReferrer: effectiveEntry.pageReferrer } : {}),
      ...(effectiveEntry.engagementTimeMsec
        ? { engagementTimeMsec: effectiveEntry.engagementTimeMsec }
        : {}),
      consent: analyticsConsent,
      occurredAt: effectiveEntry.occurredAt,
      params: effectiveEntry.params,
    };
    const validation = await ga4Service.validateEvent(event);
    const result = validation.ok ? await ga4Service.sendEvent(event) : validation;

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
          ...(attempts >= MAX_DELIVERY_ATTEMPTS ? { skippedAt: new Date() } : {}),
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

export async function compensateGeneration(runId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(storyGenerationRequests)
      .where(eq(storyGenerationRequests.runId, runId));
    if (!request || request.compensatedAt) return;

    if (request.creditsSpent > 0) {
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

      await tx
        .update(stories)
        .set({ status: 'draft', storyGenerationStatus: 'failed', updatedAt: new Date() })
        .where(eq(stories.storyId, request.storyId));
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
    .select()
    .from(storyGenerationRequests)
    .where(
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
    )
    .orderBy(asc(storyGenerationRequests.createdAt))
    .limit(BATCH_SIZE);

  let published = 0;
  let failed = 0;
  for (const request of requests) {
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

    try {
      const messageId = await publishStoryRequest({
        storyId: claimed.storyId,
        runId: claimed.runId,
      });
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
          ),
        );
      published += 1;
    } catch (error) {
      const attempts = claimed.publishAttempts + 1;
      await db
        .update(storyGenerationRequests)
        .set({
          status: attempts >= MAX_DELIVERY_ATTEMPTS ? 'delivery_failed' : 'retrying',
          publishAttempts: attempts,
          availableAt: retryAt(attempts),
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storyGenerationRequests.runId, claimed.runId),
            eq(storyGenerationRequests.status, 'publishing'),
          ),
        );
      if (attempts >= MAX_DELIVERY_ATTEMPTS) await compensateGeneration(claimed.runId);
      failed += 1;
    }
  }
  return { published, failed };
}

export async function drainDurableOutboxes() {
  const [generation, analytics] = await Promise.all([publishGenerations(), deliverAnalytics()]);
  return { generation, analytics };
}

export function normalizeAnalyticsConsent(
  consent: AnalyticsConsent | null,
): AnalyticsConsent | null {
  return consent?.analyticsStorage === 'granted' ? consent : null;
}
