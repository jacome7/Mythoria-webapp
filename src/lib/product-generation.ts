import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsOutbox,
  authorCreditBalances,
  creditLedger,
  productGenerationRequests,
  type AnalyticsConsent,
  type ProductGenerationAction,
  type ProductGenerationRequest,
  type NewAnalyticsOutboxEntry,
} from '@/db/schema';
import type { ClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import { analyticsReference } from '@/lib/analytics/reference';

type ProductCreditEvent = 'audioBookGeneration' | 'selfPrinting';

export interface StartProductGenerationInput {
  actionType: ProductGenerationAction;
  authorId: string;
  userId?: string;
  storyId: string;
  idempotencyKey: string;
  creditsSpent: number;
  creditEventType: ProductCreditEvent;
  attributionId?: string;
  analyticsContext?: ClientAnalyticsContext;
  analyticsConsent?: AnalyticsConsent;
  primaryIntent?: string;
  landingSlug?: string;
}

export interface StartProductGenerationResult {
  request: ProductGenerationRequest;
  remainingCredits: number;
  duplicate: boolean;
}

export class InsufficientProductCreditsError extends Error {
  constructor(readonly available: number) {
    super('Insufficient credits');
    this.name = 'InsufficientProductCreditsError';
  }
}

export interface PrintOrderRequestedAnalyticsInput {
  printRequestId: string;
  storyId: string;
  authorId: string;
  userId?: string;
  creditsSpent: number;
  numberOfCopies: number;
  occurredAt: Date;
  attributionId?: string;
  analyticsContext?: ClientAnalyticsContext;
  analyticsConsent?: AnalyticsConsent;
  primaryIntent?: string;
  landingSlug?: string;
}

export function printOrderRequestedOutboxEntry(
  input: PrintOrderRequestedAnalyticsInput,
): NewAnalyticsOutboxEntry | undefined {
  const consent = input.analyticsContext?.consent || input.analyticsConsent;
  if (consent?.analyticsStorage !== 'granted') return undefined;
  return {
    dedupeKey: `print_order_requested:${input.printRequestId}`,
    eventName: 'print_order_requested',
    authorId: input.authorId,
    attributionId: input.attributionId,
    clientId: input.analyticsContext?.clientId,
    userId: input.userId,
    sessionId: input.analyticsContext?.sessionId,
    consent,
    pageLocation: input.analyticsContext?.pageLocation,
    pageReferrer: input.analyticsContext?.pageReferrer,
    engagementTimeMsec: input.analyticsContext?.engagementTimeMsec,
    params: {
      item_id: analyticsReference(input.storyId),
      action_type: 'print_order',
      print_request_ref: analyticsReference(input.printRequestId),
      credits_spent: input.creditsSpent,
      number_of_copies: input.numberOfCopies,
      ...(input.primaryIntent ? { primary_intent: input.primaryIntent } : {}),
      ...(input.landingSlug ? { landing_slug: input.landingSlug } : {}),
    },
    occurredAt: input.occurredAt,
  };
}

const requestedEventName = (actionType: ProductGenerationAction) =>
  actionType === 'self_print' ? 'self_print_requested' : 'audiobook_generation_requested';

const failedEventName = (actionType: ProductGenerationAction) =>
  actionType === 'self_print' ? 'self_print_failed' : 'audiobook_generation_failed';

const referenceParams = (request: ProductGenerationRequest) =>
  request.actionType === 'self_print'
    ? { workflow_ref: analyticsReference(request.runId) }
    : { run_ref: analyticsReference(request.runId) };

const eventParams = (request: ProductGenerationRequest): Record<string, unknown> => ({
  item_id: analyticsReference(request.storyId),
  action_type: request.actionType,
  credits_spent: request.creditsSpent,
  ...referenceParams(request),
  ...(request.primaryIntent ? { primary_intent: request.primaryIntent } : {}),
  ...(request.landingSlug ? { landing_slug: request.landingSlug } : {}),
});

export async function startProductGeneration(
  input: StartProductGenerationInput,
): Promise<StartProductGenerationResult> {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 255) {
    throw new Error('Invalid idempotency key');
  }
  if (!Number.isInteger(input.creditsSpent) || input.creditsSpent <= 0) {
    throw new Error('Invalid product generation credit cost');
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.authorId}))`);

    const [existingByKey] = await tx
      .select()
      .from(productGenerationRequests)
      .where(eq(productGenerationRequests.idempotencyKey, input.idempotencyKey));
    if (existingByKey) {
      if (
        existingByKey.authorId !== input.authorId ||
        existingByKey.storyId !== input.storyId ||
        existingByKey.actionType !== input.actionType
      ) {
        throw new Error('Idempotency key is already in use');
      }
      const [balance] = await tx
        .select({ totalCredits: authorCreditBalances.totalCredits })
        .from(authorCreditBalances)
        .where(eq(authorCreditBalances.authorId, input.authorId));
      return {
        request: existingByKey,
        remainingCredits: balance?.totalCredits ?? 0,
        duplicate: true,
      };
    }

    const [activeRequest] = await tx
      .select()
      .from(productGenerationRequests)
      .where(
        and(
          eq(productGenerationRequests.authorId, input.authorId),
          eq(productGenerationRequests.storyId, input.storyId),
          eq(productGenerationRequests.actionType, input.actionType),
          inArray(productGenerationRequests.status, ['pending', 'queued', 'running']),
        ),
      );
    if (activeRequest) {
      const [balance] = await tx
        .select({ totalCredits: authorCreditBalances.totalCredits })
        .from(authorCreditBalances)
        .where(eq(authorCreditBalances.authorId, input.authorId));
      return {
        request: activeRequest,
        remainingCredits: balance?.totalCredits ?? 0,
        duplicate: true,
      };
    }

    const [balance] = await tx
      .select({ totalCredits: authorCreditBalances.totalCredits })
      .from(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, input.authorId));
    const currentBalance = balance?.totalCredits ?? 0;
    if (currentBalance < input.creditsSpent) {
      throw new InsufficientProductCreditsError(currentBalance);
    }

    const runId = randomUUID();
    await tx.insert(creditLedger).values({
      authorId: input.authorId,
      amount: -input.creditsSpent,
      creditEventType: input.creditEventType,
      storyId: input.storyId,
      idempotencyKey: `product_generation:${runId}`,
    });
    await tx
      .update(authorCreditBalances)
      .set({
        totalCredits: sql`${authorCreditBalances.totalCredits} - ${input.creditsSpent}`,
        lastUpdated: new Date(),
      })
      .where(eq(authorCreditBalances.authorId, input.authorId));

    const analyticsConsent = input.analyticsContext?.consent || input.analyticsConsent;
    const [created] = await tx
      .insert(productGenerationRequests)
      .values({
        runId,
        actionType: input.actionType,
        storyId: input.storyId,
        authorId: input.authorId,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        creditsSpent: input.creditsSpent,
        attributionId: input.attributionId,
        clientId: input.analyticsContext?.clientId,
        sessionId: input.analyticsContext?.sessionId,
        consent: analyticsConsent,
        primaryIntent: input.primaryIntent,
        landingSlug: input.landingSlug,
        pageLocation: input.analyticsContext?.pageLocation,
        pageReferrer: input.analyticsContext?.pageReferrer,
        engagementTimeMsec: input.analyticsContext?.engagementTimeMsec,
      })
      .returning();
    if (!created) throw new Error('Failed to create product generation request');

    return {
      request: created,
      remainingCredits: currentBalance - input.creditsSpent,
      duplicate: false,
    };
  });
}

export async function markProductGenerationQueued(
  runId: string,
  queueReference?: string,
): Promise<ProductGenerationRequest> {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(productGenerationRequests)
      .where(eq(productGenerationRequests.runId, runId));
    if (!request) throw new Error('Product generation request not found');
    if (request.status !== 'pending') return request;

    const queuedAt = new Date();
    const [queued] = await tx
      .update(productGenerationRequests)
      .set({ status: 'queued', queueReference, queuedAt, updatedAt: queuedAt })
      .where(
        and(
          eq(productGenerationRequests.runId, runId),
          eq(productGenerationRequests.status, 'pending'),
        ),
      )
      .returning();
    const effective = queued || request;

    if (effective.consent?.analyticsStorage === 'granted') {
      await tx
        .insert(analyticsOutbox)
        .values({
          dedupeKey: `${requestedEventName(effective.actionType)}:${effective.runId}`,
          eventName: requestedEventName(effective.actionType),
          authorId: effective.authorId,
          attributionId: effective.attributionId,
          clientId: effective.clientId,
          userId: effective.userId,
          sessionId: effective.sessionId,
          consent: effective.consent,
          pageLocation: effective.pageLocation,
          pageReferrer: effective.pageReferrer,
          engagementTimeMsec: effective.engagementTimeMsec,
          params: eventParams(effective),
          occurredAt: queuedAt,
        })
        .onConflictDoNothing({ target: analyticsOutbox.dedupeKey });
    }

    return effective;
  });
}

export async function compensateProductGeneration(
  runId: string,
  failureStage: string,
  failureCode: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(productGenerationRequests)
      .where(eq(productGenerationRequests.runId, runId));
    if (!request || request.compensatedAt || request.status !== 'pending') return;

    const terminalAt = new Date();
    const [refund] = await tx
      .insert(creditLedger)
      .values({
        authorId: request.authorId,
        amount: request.creditsSpent,
        creditEventType: 'refund',
        storyId: request.storyId,
        idempotencyKey: `product_generation_refund:${request.runId}`,
      })
      .onConflictDoNothing({ target: creditLedger.idempotencyKey })
      .returning();
    if (refund) {
      await tx
        .update(authorCreditBalances)
        .set({
          totalCredits: sql`${authorCreditBalances.totalCredits} + ${request.creditsSpent}`,
          lastUpdated: terminalAt,
        })
        .where(eq(authorCreditBalances.authorId, request.authorId));
    }

    await tx
      .update(productGenerationRequests)
      .set({
        status: 'failed',
        terminalAt,
        compensatedAt: terminalAt,
        failureStage,
        failureCode,
        updatedAt: terminalAt,
      })
      .where(eq(productGenerationRequests.runId, request.runId));

    if (request.consent?.analyticsStorage === 'granted') {
      await tx
        .insert(analyticsOutbox)
        .values({
          dedupeKey: `${failedEventName(request.actionType)}:${request.runId}`,
          eventName: failedEventName(request.actionType),
          authorId: request.authorId,
          attributionId: request.attributionId,
          clientId: request.clientId,
          userId: request.userId,
          sessionId: request.sessionId,
          consent: request.consent,
          pageLocation: request.pageLocation,
          pageReferrer: request.pageReferrer,
          engagementTimeMsec: request.engagementTimeMsec,
          params: {
            ...eventParams(request),
            duration_seconds: 0,
            failure_stage: failureStage,
            failure_code: failureCode,
          },
          occurredAt: terminalAt,
        })
        .onConflictDoNothing({ target: analyticsOutbox.dedupeKey });
    }
  });
}
