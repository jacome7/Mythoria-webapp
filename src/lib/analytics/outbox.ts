import { and, asc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  authorCreditBalances,
  creditLedger,
  stories,
  storyGenerationRequests,
  type AnalyticsConsent,
  type NewAnalyticsOutboxEntry,
} from '@/db/schema';
import { publishStoryRequest } from '@/lib/pubsub';
import { ga4Service } from './ga4';

const MAX_DELIVERY_ATTEMPTS = 8;
const BATCH_SIZE = 25;

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

export async function deliverAnalytics(): Promise<{
  delivered: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();
  const entries = await db
    .select()
    .from(analyticsOutbox)
    .where(
      and(
        isNull(analyticsOutbox.deliveredAt),
        isNull(analyticsOutbox.skippedAt),
        lte(analyticsOutbox.availableAt, now),
        lt(analyticsOutbox.attempts, MAX_DELIVERY_ATTEMPTS),
      ),
    )
    .orderBy(asc(analyticsOutbox.occurredAt))
    .limit(BATCH_SIZE);

  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.clientId || entry.consent?.analyticsStorage !== 'granted') {
      await db
        .update(analyticsOutbox)
        .set({ skippedAt: now, lastError: 'Missing consented analytics attribution' })
        .where(eq(analyticsOutbox.outboxId, entry.outboxId));
      skipped += 1;
      continue;
    }

    const event = {
      eventName: entry.eventName,
      clientId: entry.clientId,
      ...(entry.userId ? { userId: entry.userId } : {}),
      ...(entry.sessionId ? { sessionId: entry.sessionId } : {}),
      consent: entry.consent,
      occurredAt: entry.occurredAt,
      params: entry.params,
    };
    const validation = await ga4Service.validateEvent(event);
    const result = validation.ok ? await ga4Service.sendEvent(event) : validation;

    if (result.ok) {
      await db
        .update(analyticsOutbox)
        .set({ deliveredAt: new Date(), attempts: entry.attempts + 1, lastError: null })
        .where(eq(analyticsOutbox.outboxId, entry.outboxId));
      delivered += 1;
    } else {
      const attempts = entry.attempts + 1;
      await db
        .update(analyticsOutbox)
        .set({
          attempts,
          availableAt: retryAt(attempts),
          lastError: result.errors.join('; ').slice(0, 2000),
          ...(attempts >= MAX_DELIVERY_ATTEMPTS ? { skippedAt: new Date() } : {}),
        })
        .where(eq(analyticsOutbox.outboxId, entry.outboxId));
      failed += 1;
    }
  }

  return { delivered, failed, skipped };
}

export async function compensateGeneration(runId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(storyGenerationRequests)
      .where(eq(storyGenerationRequests.runId, runId));
    if (!request || request.compensatedAt) return;

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
    await tx
      .update(storyGenerationRequests)
      .set({
        status: 'failed',
        compensatedAt: new Date(),
        terminalAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storyGenerationRequests.runId, runId));
  });
}

export async function publishGenerations(): Promise<{ published: number; failed: number }> {
  const requests = await db
    .select()
    .from(storyGenerationRequests)
    .where(
      and(
        or(
          eq(storyGenerationRequests.status, 'queued'),
          eq(storyGenerationRequests.status, 'retrying'),
        ),
        lte(storyGenerationRequests.availableAt, new Date()),
        lt(storyGenerationRequests.publishAttempts, MAX_DELIVERY_ATTEMPTS),
      ),
    )
    .orderBy(asc(storyGenerationRequests.createdAt))
    .limit(BATCH_SIZE);

  let published = 0;
  let failed = 0;
  for (const request of requests) {
    try {
      const messageId = await publishStoryRequest({
        storyId: request.storyId,
        runId: request.runId,
      });
      await db
        .update(storyGenerationRequests)
        .set({
          status: 'published',
          messageId,
          publishedAt: new Date(),
          publishAttempts: request.publishAttempts + 1,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(storyGenerationRequests.runId, request.runId));
      published += 1;
    } catch (error) {
      const attempts = request.publishAttempts + 1;
      await db
        .update(storyGenerationRequests)
        .set({
          status: attempts >= MAX_DELIVERY_ATTEMPTS ? 'delivery_failed' : 'retrying',
          publishAttempts: attempts,
          availableAt: retryAt(attempts),
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(eq(storyGenerationRequests.runId, request.runId));
      if (attempts >= MAX_DELIVERY_ATTEMPTS) await compensateGeneration(request.runId);
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
