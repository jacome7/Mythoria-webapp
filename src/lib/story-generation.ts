import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  authorCreditBalances,
  authors,
  characters,
  creditLedger,
  stories,
  storyCharacters,
  storyGenerationRequests,
  type AnalyticsConsent,
} from '@/db/schema';
import { pricingService } from '@/db/services/pricing';
import type { ClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import type { StoryIntent } from '@/constants/intents';
import { analyticsReference } from '@/lib/analytics/reference';
import { conversions } from '@/lib/openai-ads/events';
import { enqueueAdConversion } from '@/lib/openai-ads/outbox';
import type { AdContext } from '@/lib/openai-ads/types';
import {
  premiumAudienceSchema,
  premiumBookType,
  readPremiumBookMarker,
  storyFeatureRecord,
  type BookType,
} from '@/lib/premium-children-book/contract';
import {
  isBookFormatEditable,
  premiumGenerationEnabled,
  PremiumBookSelectionError,
} from '@/lib/premium-children-book/selection';

export interface StartStoryGenerationInput {
  authorId: string;
  clerkUserId: string;
  storyId: string;
  idempotencyKey: string;
  features: { ebook: boolean; printed: boolean; audiobook: boolean };
  expectedBookType?: BookType;
  deliveryAddress?: Record<string, unknown> | null;
  dedicationMessage?: string | null;
  customAuthor?: string | null;
  attributionId?: string;
  primaryIntent?: StoryIntent;
  analyticsContext?: ClientAnalyticsContext;
  analyticsConsent?: AnalyticsConsent;
  productProfile?: 'biographer';
  /**
   * OpenAI Ads request context. When omitted (e.g. MCP, which has no browser or consent context)
   * no `lead_created` conversion is enqueued.
   */
  adContext?: AdContext | null;
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
          inArray(storyGenerationRequests.status, [
            'queued',
            'retrying',
            'publishing',
            'published',
          ]),
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

    if (process.env.BIOGRAPHER_ENABLED === 'true') {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(project_id::text)) from biographer_book_versions where story_id = ${input.storyId}`,
      );
    }
    const [story] = await tx
      .select({
        storyId: stories.storyId,
        additionalRequests: stories.additionalRequests,
        features: stories.features,
        status: stories.status,
        targetAudience: stories.targetAudience,
      })
      .from(stories)
      .where(and(eq(stories.storyId, input.storyId), eq(stories.authorId, input.authorId)))
      .for('update');
    if (!story) throw new Error('Story not found');
    if (
      story.additionalRequests?.includes('[MYTHORIA_BIOGRAPHER_V1]') &&
      process.env.BIOGRAPHER_ENABLED !== 'true'
    )
      throw new Error('Biographer purchases are paused');

    const profile =
      input.productProfile || (await pricingService.getStoryProductProfile(input.storyId));
    const marker = readPremiumBookMarker(story.features);
    const bookType = marker ? premiumBookType : 'standard';
    if (input.expectedBookType && input.expectedBookType !== bookType) {
      throw new PremiumBookSelectionError('book_type_changed');
    }
    const { ebook, printed, audiobook } = input.features;
    const billable = { ebook, printed, audiobook };
    const runId = randomUUID();
    const features: Record<string, unknown> = {
      ...storyFeatureRecord(story.features),
      ...billable,
    };
    if (marker) {
      if (marker.state !== 'draft' || !isBookFormatEditable(story.status)) {
        throw new PremiumBookSelectionError('book_type_locked');
      }
      const [author] = await tx
        .select({ experimental: authors.experimentalFeaturesEnabled })
        .from(authors)
        .where(eq(authors.authorId, input.authorId))
        .for('share');
      const audience = premiumAudienceSchema.safeParse(story.targetAudience);
      if (!premiumGenerationEnabled() || !author?.experimental || !audience.success) {
        throw new PremiumBookSelectionError('book_type_not_available');
      }
      if (!ebook || printed || audiobook || profile !== 'standard') {
        throw new PremiumBookSelectionError('incompatible_book_features');
      }
      await tx
        .select({ characterId: characters.characterId })
        .from(storyCharacters)
        .innerJoin(characters, eq(storyCharacters.characterId, characters.characterId))
        .where(eq(storyCharacters.storyId, input.storyId))
        .for('share', { of: characters });
      features.premiumBook = {
        ...marker,
        state: 'queued',
        revision: runId,
        ownerId: input.authorId,
        audience: audience.data,
      };
    }
    const pricing = await pricingService.calculateCreditsForFeatures(billable, profile);
    if (pricing.total <= 0) throw new Error('No active pricing exists for the selected features');

    const [balance] = await tx
      .select({ totalCredits: authorCreditBalances.totalCredits })
      .from(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, input.authorId));
    const currentBalance = balance?.totalCredits ?? 0;
    if (currentBalance < pricing.total) throw new Error('Insufficient credits');

    for (const item of pricing.breakdown) {
      const creditEventType = ['printOrder', 'biographerPrintOrder'].includes(item.serviceCode)
        ? 'printOrder'
        : ['audioBookGeneration', 'biographerAudioBookGeneration'].includes(item.serviceCode)
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
        features,
        deliveryAddress: input.deliveryAddress || undefined,
        dedicationMessage: input.dedicationMessage || undefined,
        customAuthor: input.customAuthor || undefined,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, input.storyId));

    const analyticsConsent = input.analyticsContext?.consent || input.analyticsConsent;

    await tx.insert(storyGenerationRequests).values({
      runId,
      storyId: input.storyId,
      authorId: input.authorId,
      idempotencyKey: input.idempotencyKey,
      creditsSpent: pricing.total,
      attributionId: input.attributionId,
      clientId: input.analyticsContext?.clientId,
      sessionId: input.analyticsContext?.sessionId,
      consent: analyticsConsent,
    });

    if (analyticsConsent) {
      await tx.insert(analyticsOutbox).values({
        dedupeKey: `story:${runId}:requested`,
        eventName: 'story_generation_requested',
        authorId: input.authorId,
        attributionId: input.attributionId,
        clientId: input.analyticsContext?.clientId,
        userId: input.clerkUserId,
        sessionId: input.analyticsContext?.sessionId,
        consent: analyticsConsent,
        pageLocation: input.analyticsContext?.pageLocation,
        pageReferrer: input.analyticsContext?.pageReferrer,
        engagementTimeMsec: input.analyticsContext?.engagementTimeMsec,
        params: {
          item_id: analyticsReference(input.storyId),
          run_ref: analyticsReference(runId),
          credits_spent: pricing.total,
          ...(input.primaryIntent ? { primary_intent: input.primaryIntent } : {}),
        },
      });
    }

    if (input.adContext !== undefined) {
      await enqueueAdConversion(tx, {
        conversion: conversions.storyLead(runId),
        authorId: input.authorId,
        adContext: input.adContext,
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
