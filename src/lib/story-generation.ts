import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  authorCreditBalances,
  creditLedger,
  stories,
  storyGenerationRequests,
} from '@/db/schema';
import { pricingService } from '@/db/services/pricing';
import type { ClientAnalyticsContext } from '@/lib/analytics/ecommerce';

export interface StartStoryGenerationInput {
  authorId: string;
  clerkUserId: string;
  storyId: string;
  idempotencyKey: string;
  features: { ebook: boolean; printed: boolean; audiobook: boolean };
  deliveryAddress?: Record<string, unknown> | null;
  dedicationMessage?: string | null;
  customAuthor?: string | null;
  attributionId?: string;
  analyticsContext?: ClientAnalyticsContext;
}

export interface StartStoryGenerationResult {
  storyId: string;
  runId: string;
  status: string;
  remainingCredits: number;
  duplicate: boolean;
}

export async function startStoryGeneration(
  input: StartStoryGenerationInput,
): Promise<StartStoryGenerationResult> {
  const pricing = await pricingService.calculateCreditsForFeatures(input.features);
  if (pricing.total <= 0) throw new Error('No active pricing exists for the selected features');

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.authorId}))`);

    const [existing] = await tx
      .select()
      .from(storyGenerationRequests)
      .where(eq(storyGenerationRequests.idempotencyKey, input.idempotencyKey));
    if (existing) {
      if (existing.authorId !== input.authorId || existing.storyId !== input.storyId) {
        throw new Error('Idempotency key is already in use');
      }
      const [balance] = await tx
        .select({ totalCredits: authorCreditBalances.totalCredits })
        .from(authorCreditBalances)
        .where(eq(authorCreditBalances.authorId, input.authorId));
      return {
        storyId: existing.storyId,
        runId: existing.runId,
        status: existing.status,
        remainingCredits: balance?.totalCredits ?? 0,
        duplicate: true,
      };
    }

    const [activeRequest] = await tx
      .select()
      .from(storyGenerationRequests)
      .where(
        and(
          eq(storyGenerationRequests.storyId, input.storyId),
          eq(storyGenerationRequests.authorId, input.authorId),
          inArray(storyGenerationRequests.status, ['queued', 'retrying', 'published']),
        ),
      );
    if (activeRequest) {
      const [balance] = await tx
        .select({ totalCredits: authorCreditBalances.totalCredits })
        .from(authorCreditBalances)
        .where(eq(authorCreditBalances.authorId, input.authorId));
      return {
        storyId: activeRequest.storyId,
        runId: activeRequest.runId,
        status: activeRequest.status,
        remainingCredits: balance?.totalCredits ?? 0,
        duplicate: true,
      };
    }

    const [story] = await tx
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(and(eq(stories.storyId, input.storyId), eq(stories.authorId, input.authorId)));
    if (!story) throw new Error('Story not found');

    const [balance] = await tx
      .select({ totalCredits: authorCreditBalances.totalCredits })
      .from(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, input.authorId));
    const currentBalance = balance?.totalCredits ?? 0;
    if (currentBalance < pricing.total) throw new Error('Insufficient credits');

    const runId = randomUUID();
    for (const item of pricing.breakdown) {
      const creditEventType =
        item.serviceCode === 'printOrder'
          ? 'printOrder'
          : item.serviceCode === 'audioBookGeneration'
            ? 'audioBookGeneration'
            : 'eBookGeneration';
      await tx.insert(creditLedger).values({
        authorId: input.authorId,
        amount: -item.credits,
        creditEventType,
        storyId: input.storyId,
        idempotencyKey: `story_generation:${runId}:${item.serviceCode}`,
      });
    }
    await tx
      .update(authorCreditBalances)
      .set({
        totalCredits: sql`${authorCreditBalances.totalCredits} - ${pricing.total}`,
        lastUpdated: new Date(),
      })
      .where(eq(authorCreditBalances.authorId, input.authorId));

    await tx
      .update(stories)
      .set({
        status: 'writing',
        storyGenerationStatus: 'queued',
        features: input.features,
        deliveryAddress: input.deliveryAddress || undefined,
        dedicationMessage: input.dedicationMessage || undefined,
        customAuthor: input.customAuthor || undefined,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, input.storyId));

    await tx.insert(storyGenerationRequests).values({
      runId,
      storyId: input.storyId,
      authorId: input.authorId,
      idempotencyKey: input.idempotencyKey,
      creditsSpent: pricing.total,
      attributionId: input.attributionId,
      clientId: input.analyticsContext?.clientId,
      sessionId: input.analyticsContext?.sessionId,
      consent: input.analyticsContext?.consent,
    });

    if (input.analyticsContext) {
      await tx.insert(analyticsOutbox).values({
        dedupeKey: `story:${runId}:requested`,
        eventName: 'story_generation_requested',
        clientId: input.analyticsContext.clientId,
        userId: input.clerkUserId,
        sessionId: input.analyticsContext.sessionId,
        consent: input.analyticsContext.consent,
        params: {
          story_id: input.storyId,
          run_id: runId,
          credits_spent: pricing.total,
        },
      });
    }

    return {
      storyId: input.storyId,
      runId,
      status: 'queued',
      remainingCredits: currentBalance - pricing.total,
      duplicate: false,
    };
  });
}
