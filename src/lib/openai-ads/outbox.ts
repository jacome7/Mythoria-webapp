/**
 * Durable server-side outbox for OpenAI (ChatGPT Ads) conversions. Server-only.
 *
 * Rows are written inside the business transaction (`enqueueAdConversion`), fanned out from
 * SGW-written analytics rows (`fanOutAdConversions`) and delivered to the Conversions API by the
 * scheduled analytics drain (`deliverAdConversions`), on the same claim/backoff pattern as the
 * GA4 analytics outbox. Hashed PII, IP, user agent, `oppref` and `obref` are only sent when
 * advertising consent was granted; `ad_context` is cleared once a row is delivered.
 * `scrubPaymentOrderAdContext` removes the checkout-time copy (`payment_orders.metadata.ads`).
 */
import { createHash, randomUUID } from 'crypto';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  adConversionOutbox,
  analyticsAttributions,
  analyticsOutbox,
  authors,
  type AdConversionOutboxEntry,
} from '@/db/schema';
import { ANALYTICS_BASE_URL, sanitizeAnalyticsPageUrl } from '@/lib/analytics/page-context';
import {
  adEventId,
  conversionDedupeName,
  conversions,
  validateConversion,
  type OpenAiConversion,
  type OpenAiCustomEventName,
  type OpenAiEventType,
} from './events';
import { hashForOpenAi } from './hashing.server';
import { sanitizeAdContext, type AdContext } from './types';
import {
  isOpenAiCapiConfigured,
  sendOpenAiEvents,
  type OpenAiCapiEvent,
  type OpenAiCapiResult,
  type OpenAiCapiUser,
} from './capi';

export const AD_CONVERSION_DESTINATION = 'openai';

const MAX_DELIVERY_ATTEMPTS = 8;
const BATCH_SIZE = 100;
const FAN_OUT_LIMIT = 100;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const ABANDONED_CLAIM_MS = 5 * MINUTE_MS;
/** OpenAI rejects events older than 7 days; keep a safety margin for the request itself. */
const MAX_EVENT_AGE_MS = 7 * DAY_MS - 10 * MINUTE_MS;
const FAN_OUT_WINDOW_MS = 6 * DAY_MS;
/** How long a row without request context waits for an attribution row to appear. */
const CONTEXT_GRACE_MS = 2 * HOUR_MS;
const CONTEXT_RETRY_MS = 15 * MINUTE_MS;
/** Retry delay for credential errors (401/403); they do not consume delivery attempts. */
const AUTH_RETRY_MS = 15 * MINUTE_MS;
const OPPREF_WINDOW_MS = 30 * DAY_MS;
const ATTRIBUTION_LOOKAHEAD_MS = HOUR_MS;
const LAST_ERROR_MAX_LENGTH = 2000;
/**
 * Wall-clock budget for one-by-one batch isolation, measured from the start of the drain. Rows
 * not reached in time are released (without consuming an attempt) well before their claims could
 * be treated as abandoned (`ABANDONED_CLAIM_MS`) and picked up by a concurrent drain.
 */
const ISOLATION_BUDGET_MS = 2 * MINUTE_MS;
const PAYMENT_AD_CONTEXT_SCRUB_LIMIT = 500;

const STORY_COMPLETED_EVENT = 'story_generation_completed';
const STORY_COMPLETED_PREFIX = `${STORY_COMPLETED_EVENT}:`;

export type AdConversionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type AdConversionExecutor = AdConversionTransaction | typeof db;

export interface EnqueueAdConversionInput {
  conversion: OpenAiConversion;
  authorId?: string | null;
  adContext?: AdContext | null;
  occurredAt?: Date;
  sourceOutboxId?: string | null;
  availableAt?: Date;
}

const retryAt = (attempts: number): Date => {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts));
  return new Date(Date.now() + delayMinutes * MINUTE_MS);
};

const eventReference = (eventId: string): string =>
  createHash('sha256').update(eventId).digest('hex').slice(0, 12);

/**
 * Error text that is safe to log. Drizzle's query errors embed the SQL parameters (which include
 * the ad context: IP address, user agent, click reference), so only the driver cause is kept.
 */
export function safeAdErrorMessage(error: unknown): string {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.startsWith('Failed query') ? 'query failed' : message.slice(0, 300);
}

function logAdOutcome(
  entry: { eventId: string; eventType: string; dedupeName: string },
  outcome: string,
  details: Record<string, unknown> = {},
): void {
  console.info('[AdConversionOutbox]', {
    eventType: entry.eventType,
    dedupeName: entry.dedupeName,
    eventRef: eventReference(entry.eventId),
    outcome,
    ...details,
  });
}

function insertAdConversionRow(
  executor: AdConversionExecutor,
  values: typeof adConversionOutbox.$inferInsert,
) {
  return executor
    .insert(adConversionOutbox)
    .values(values)
    .onConflictDoNothing({
      target: [
        adConversionOutbox.destination,
        adConversionOutbox.dedupeName,
        adConversionOutbox.eventId,
      ],
    })
    .returning({ outboxId: adConversionOutbox.outboxId });
}

/**
 * Enqueues one conversion for the Conversions API. Safe to call inside a business transaction:
 * invalid conversions are logged and dropped, and the insert runs in a savepoint (nested
 * transaction) so a failure cannot abort the caller's transaction. Never throws.
 *
 * @returns `true` when a new row was inserted, `false` when it was a duplicate or was dropped.
 */
export async function enqueueAdConversion(
  executor: AdConversionExecutor,
  input: EnqueueAdConversionInput,
): Promise<boolean> {
  const conversion = input?.conversion;
  let errors: string[];
  try {
    errors = validateConversion(conversion);
  } catch {
    errors = ['conversion could not be validated'];
  }
  if (errors.length > 0) {
    console.warn('[AdConversionOutbox]', {
      outcome: 'enqueue_rejected',
      eventType: typeof conversion?.eventType === 'string' ? conversion.eventType : undefined,
      eventRef:
        typeof conversion?.eventId === 'string' ? eventReference(conversion.eventId) : undefined,
      errors,
    });
    return false;
  }

  const dedupeName = conversionDedupeName(conversion);
  const values: typeof adConversionOutbox.$inferInsert = {
    destination: AD_CONVERSION_DESTINATION,
    eventId: conversion.eventId,
    eventType: conversion.eventType,
    customEventName: conversion.customEventName ?? null,
    dedupeName,
    sourceOutboxId: input.sourceOutboxId ?? null,
    authorId: input.authorId ?? null,
    data: conversion.data,
    adContext: input.adContext ? (sanitizeAdContext(input.adContext) ?? null) : null,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...(input.availableAt ? { availableAt: input.availableAt } : {}),
  };

  try {
    const transactional = executor as {
      transaction?: AdConversionTransaction['transaction'];
    };
    const inserted =
      typeof transactional.transaction === 'function'
        ? await transactional.transaction((savepoint) => insertAdConversionRow(savepoint, values))
        : await insertAdConversionRow(executor, values);
    const created = inserted.length > 0;
    logAdOutcome(
      { eventId: conversion.eventId, eventType: conversion.eventType, dedupeName },
      created ? 'enqueued' : 'duplicate',
    );
    return created;
  } catch (error) {
    console.error('[AdConversionOutbox]', {
      outcome: 'enqueue_failed',
      eventType: conversion.eventType,
      dedupeName,
      eventRef: eventReference(conversion.eventId),
      error: safeAdErrorMessage(error),
    });
    return false;
  }
}

/**
 * Turns SGW-written `story_generation_completed` analytics rows into `story_generated`
 * conversions. Context is copied from the run's `lead_created` row when it still has one.
 */
export async function fanOutAdConversions(): Promise<{ created: number }> {
  const since = new Date(Date.now() - FAN_OUT_WINDOW_MS);
  const runIdFromKey = sql`substr(${analyticsOutbox.dedupeKey}, ${STORY_COMPLETED_PREFIX.length + 1})`;
  const sources = await db
    .select({
      outboxId: analyticsOutbox.outboxId,
      dedupeKey: analyticsOutbox.dedupeKey,
      authorId: analyticsOutbox.authorId,
      occurredAt: analyticsOutbox.occurredAt,
    })
    .from(analyticsOutbox)
    .leftJoin(
      adConversionOutbox,
      or(
        eq(adConversionOutbox.sourceOutboxId, analyticsOutbox.outboxId),
        and(
          eq(adConversionOutbox.destination, AD_CONVERSION_DESTINATION),
          eq(adConversionOutbox.dedupeName, 'story_generated'),
          eq(adConversionOutbox.eventId, sql`'story_generated_' || ${runIdFromKey}`),
        ),
      ),
    )
    .where(
      and(
        eq(analyticsOutbox.eventName, STORY_COMPLETED_EVENT),
        like(analyticsOutbox.dedupeKey, `${STORY_COMPLETED_PREFIX}%`),
        gte(analyticsOutbox.createdAt, since),
        isNull(adConversionOutbox.outboxId),
      ),
    )
    .orderBy(asc(analyticsOutbox.createdAt))
    .limit(FAN_OUT_LIMIT);

  const candidates = sources
    .map((source) => ({
      source,
      runId: source.dedupeKey.startsWith(STORY_COMPLETED_PREFIX)
        ? source.dedupeKey.slice(STORY_COMPLETED_PREFIX.length).trim()
        : '',
    }))
    .filter((candidate) => candidate.runId.length > 0);
  if (candidates.length === 0) return { created: 0 };

  const leadRows = await db
    .select({ eventId: adConversionOutbox.eventId, adContext: adConversionOutbox.adContext })
    .from(adConversionOutbox)
    .where(
      and(
        eq(adConversionOutbox.destination, AD_CONVERSION_DESTINATION),
        eq(adConversionOutbox.dedupeName, 'lead_created'),
        inArray(
          adConversionOutbox.eventId,
          candidates.map((candidate) => adEventId.storyLead(candidate.runId)),
        ),
      ),
    );
  const leadContexts = new Map(leadRows.map((row) => [row.eventId, row.adContext]));

  let created = 0;
  for (const { source, runId } of candidates) {
    const inserted = await enqueueAdConversion(db, {
      conversion: conversions.storyGenerated(runId),
      authorId: source.authorId,
      adContext: leadContexts.get(adEventId.storyLead(runId)) ?? null,
      occurredAt: source.occurredAt,
      sourceOutboxId: source.outboxId,
    });
    if (inserted) created += 1;
  }
  return { created };
}

type ContextResolution = { kind: 'ready'; context: AdContext } | { kind: 'defer' };

function deniedContext(now: Date): AdContext {
  return { adConsent: 'denied', sourceUrl: ANALYTICS_BASE_URL, capturedAt: now.toISOString() };
}

async function resolveDeliveryContext(
  entry: AdConversionOutboxEntry,
  now: Date,
): Promise<ContextResolution> {
  // Advertising context must have been captured with the event; a later grant cannot
  // create consent for an earlier conversion.
  const stored = entry.adContext ? sanitizeAdContext(entry.adContext) : undefined;
  if (stored) return { kind: 'ready', context: stored };
  if (!entry.authorId) return { kind: 'ready', context: deniedContext(now) };

  const occurredMs = entry.occurredAt.getTime();
  const [attribution] = await db
    .select()
    .from(analyticsAttributions)
    .where(
      and(
        eq(analyticsAttributions.authorId, entry.authorId),
        isNull(analyticsAttributions.revokedAt),
        lte(analyticsAttributions.createdAt, entry.occurredAt),
        or(
          gt(analyticsAttributions.expiresAt, entry.occurredAt),
          and(
            isNotNull(analyticsAttributions.opprefCapturedAt),
            gte(analyticsAttributions.opprefCapturedAt, new Date(occurredMs - OPPREF_WINDOW_MS)),
          ),
        ),
      ),
    )
    .orderBy(desc(analyticsAttributions.createdAt))
    .limit(1);

  if (!attribution) {
    if (now.getTime() < occurredMs + CONTEXT_GRACE_MS) return { kind: 'defer' };
    return { kind: 'ready', context: deniedContext(now) };
  }

  const granted = attribution.consent?.adUserData === 'granted';
  const sourceUrl =
    (attribution.latestPath
      ? sanitizeAnalyticsPageUrl(`${ANALYTICS_BASE_URL}${attribution.latestPath}`)
      : undefined) ?? ANALYTICS_BASE_URL;
  const opprefCapturedMs = attribution.opprefCapturedAt?.getTime();
  const opprefFresh =
    opprefCapturedMs !== undefined &&
    opprefCapturedMs >= occurredMs - OPPREF_WINDOW_MS &&
    opprefCapturedMs <= occurredMs + ATTRIBUTION_LOOKAHEAD_MS;
  const context = sanitizeAdContext({
    adConsent: granted ? 'granted' : 'denied',
    sourceUrl,
    capturedAt: now.toISOString(),
    ...(granted && opprefFresh && attribution.oppref ? { oppref: attribution.oppref } : {}),
    ...(granted && attribution.obref ? { obref: attribution.obref } : {}),
  });
  return { kind: 'ready', context: context ?? deniedContext(now) };
}

const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;

function hashedList(
  kind: Parameters<typeof hashForOpenAi>[0],
  value: string | null | undefined,
): string[] | undefined {
  const hashed = hashForOpenAi(kind, value);
  return hashed ? [hashed] : undefined;
}

function splitDisplayName(displayName: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return {
    firstName: parts[0],
    ...(parts.length > 1 ? { lastName: parts[parts.length - 1] } : {}),
  };
}

async function buildCapiUser(
  entry: AdConversionOutboxEntry,
  context: AdContext,
): Promise<OpenAiCapiUser | undefined> {
  if (context.adConsent !== 'granted') return undefined;
  const user: OpenAiCapiUser = {};

  if (entry.authorId) {
    const [author] = await db
      .select({
        email: authors.email,
        mobilePhone: authors.mobilePhone,
        displayName: authors.displayName,
        countryOfOrigin: authors.countryOfOrigin,
        clerkUserId: authors.clerkUserId,
        accountClosedAt: authors.accountClosedAt,
      })
      .from(authors)
      .where(eq(authors.authorId, entry.authorId))
      .limit(1);
    if (author && !author.accountClosedAt) {
      const { firstName, lastName } = splitDisplayName(author.displayName);
      const emails = hashedList('email', author.email);
      const phones = hashedList('phone', author.mobilePhone);
      const firstNames = hashedList('name', firstName);
      const lastNames = hashedList('name', lastName);
      const externalIds = hashedList('external_id', author.clerkUserId);
      if (emails) user.emails_sha256 = emails;
      if (phones) user.phone_numbers_sha256 = phones;
      if (firstNames) user.first_names_sha256 = firstNames;
      if (lastNames) user.last_names_sha256 = lastNames;
      if (externalIds) user.external_ids_sha256 = externalIds;
      if (author.countryOfOrigin && COUNTRY_PATTERN.test(author.countryOfOrigin.trim())) {
        user.countries = [author.countryOfOrigin.trim().toUpperCase()];
      }
    }
  }

  if (context.obref) user.obref = context.obref;
  if (context.ipAddress) user.ip_address = context.ipAddress;
  if (context.userAgent) user.user_agent = context.userAgent;
  return Object.keys(user).length > 0 ? user : undefined;
}

function buildCapiEvent(
  entry: AdConversionOutboxEntry,
  context: AdContext,
  user: OpenAiCapiUser | undefined,
  now: Date,
): OpenAiCapiEvent {
  const granted = context.adConsent === 'granted';
  return {
    id: entry.eventId,
    type: entry.eventType as OpenAiEventType,
    ...(entry.customEventName
      ? { custom_event_name: entry.customEventName as OpenAiCustomEventName }
      : {}),
    timestamp_ms: Math.min(entry.occurredAt.getTime(), now.getTime()),
    action_source: 'web',
    source_url: context.sourceUrl,
    ...(granted && context.oppref ? { oppref: context.oppref } : {}),
    ...(granted && user ? { user } : {}),
    ...(granted ? {} : { opt_out: true }),
    data: entry.data,
  };
}

interface PreparedEvent {
  entry: AdConversionOutboxEntry;
  claimToken: string;
  event: OpenAiCapiEvent;
}

type DeliveryOutcome = 'delivered' | 'failed';

function claimWhereFor(outboxId: string, claimToken: string) {
  return and(
    eq(adConversionOutbox.outboxId, outboxId),
    eq(adConversionOutbox.claimToken, claimToken),
  );
}

async function applyResult(
  prepared: PreparedEvent,
  result: OpenAiCapiResult,
  isolated: boolean,
): Promise<DeliveryOutcome> {
  const { entry, claimToken } = prepared;
  const claimWhere = claimWhereFor(entry.outboxId, claimToken);
  const attempts = entry.attempts + 1;

  if (result.ok) {
    await db
      .update(adConversionOutbox)
      .set({
        deliveredAt: new Date(),
        attempts,
        claimToken: null,
        claimedAt: null,
        lastError: null,
        adContext: null,
      })
      .where(claimWhere);
    logAdOutcome(entry, 'delivered', { attempts, isolated });
    return 'delivered';
  }

  if (result.status === 401 || result.status === 403) {
    // Credential problems are not the event's fault: wait without consuming an attempt.
    await db
      .update(adConversionOutbox)
      .set({
        availableAt: new Date(Date.now() + AUTH_RETRY_MS),
        claimToken: null,
        claimedAt: null,
        lastError: result.error.slice(0, LAST_ERROR_MAX_LENGTH),
      })
      .where(claimWhere);
    logAdOutcome(entry, 'failed', { status: result.status, reason: 'credentials_rejected' });
    return 'failed';
  }

  const permanent = !result.retryable;
  const exhausted = permanent || attempts >= MAX_DELIVERY_ATTEMPTS;
  await db
    .update(adConversionOutbox)
    .set({
      attempts,
      availableAt: retryAt(attempts),
      claimToken: null,
      claimedAt: null,
      lastError: result.error.slice(0, LAST_ERROR_MAX_LENGTH),
      // A row that will never be sent must not keep a raw IP / user agent either.
      ...(exhausted ? { skippedAt: new Date(), adContext: null } : {}),
    })
    .where(claimWhere);
  logAdOutcome(entry, exhausted ? 'failed_permanently' : 'failed', {
    attempts,
    status: result.status,
    retryable: result.retryable,
    isolated,
  });
  return 'failed';
}

/**
 * Hands claimed rows back to the queue untouched (same attempts and availability) so the next
 * drain retries them. Used when batch isolation runs out of its time budget.
 */
async function releaseClaims(items: PreparedEvent[]): Promise<number> {
  for (const { entry, claimToken } of items) {
    await db
      .update(adConversionOutbox)
      .set({ claimToken: null, claimedAt: null })
      .where(claimWhereFor(entry.outboxId, claimToken));
  }
  if (items.length > 0) {
    console.info('[AdConversionOutbox]', {
      outcome: 'isolation_budget_exhausted',
      released: items.length,
    });
  }
  return items.length;
}

/** A batch rejection that one bad event can cause (and that isolation can resolve). */
function isBatchRejection(result: OpenAiCapiResult): boolean {
  return (
    !result.ok &&
    !result.retryable &&
    result.status !== undefined &&
    result.status !== 401 &&
    result.status !== 403
  );
}

export async function deliverAdConversions(): Promise<{
  delivered: number;
  failed: number;
  skipped: number;
  deferred: number;
}> {
  const counts = { delivered: 0, failed: 0, skipped: 0, deferred: 0 };
  const drainStartedMs = Date.now();
  if (!isOpenAiCapiConfigured()) {
    // Without credentials rows stay pending, but never past the delivery window: expiring them
    // here keeps a raw IP / user agent from being retained while the key is missing.
    const expired = await db
      .update(adConversionOutbox)
      .set({ skippedAt: new Date(), lastError: 'expired_7d', adContext: null })
      .where(
        and(
          isNull(adConversionOutbox.deliveredAt),
          isNull(adConversionOutbox.skippedAt),
          lt(adConversionOutbox.occurredAt, new Date(Date.now() - MAX_EVENT_AGE_MS)),
        ),
      )
      .returning({ outboxId: adConversionOutbox.outboxId });
    counts.skipped = expired.length;
    return counts;
  }

  const now = new Date();
  const abandonedBefore = new Date(now.getTime() - ABANDONED_CLAIM_MS);
  const pendingConditions = (at: Date) => [
    isNull(adConversionOutbox.deliveredAt),
    isNull(adConversionOutbox.skippedAt),
    lte(adConversionOutbox.availableAt, at),
    lt(adConversionOutbox.attempts, MAX_DELIVERY_ATTEMPTS),
    or(isNull(adConversionOutbox.claimedAt), lte(adConversionOutbox.claimedAt, abandonedBefore)),
  ];

  const entries = await db
    .select()
    .from(adConversionOutbox)
    .where(and(...pendingConditions(now)))
    .orderBy(asc(adConversionOutbox.occurredAt))
    .limit(BATCH_SIZE);

  const prepared: PreparedEvent[] = [];
  for (const entry of entries) {
    const claimTime = new Date();
    const claimToken = randomUUID();
    const [claimed] = await db
      .update(adConversionOutbox)
      .set({ claimToken, claimedAt: claimTime })
      .where(and(eq(adConversionOutbox.outboxId, entry.outboxId), ...pendingConditions(claimTime)))
      .returning();
    if (!claimed) continue;
    const claimWhere = claimWhereFor(claimed.outboxId, claimToken);

    if (claimed.occurredAt.getTime() < Date.now() - MAX_EVENT_AGE_MS) {
      await db
        .update(adConversionOutbox)
        .set({
          skippedAt: new Date(),
          claimToken: null,
          claimedAt: null,
          lastError: 'expired_7d',
          adContext: null,
        })
        .where(claimWhere);
      logAdOutcome(claimed, 'skipped', { reason: 'expired_7d' });
      counts.skipped += 1;
      continue;
    }

    const resolution = await resolveDeliveryContext(claimed, new Date());
    if (resolution.kind === 'defer') {
      await db
        .update(adConversionOutbox)
        .set({
          availableAt: new Date(Date.now() + CONTEXT_RETRY_MS),
          claimToken: null,
          claimedAt: null,
          lastError: 'awaiting_ad_context',
        })
        .where(claimWhere);
      logAdOutcome(claimed, 'deferred_context');
      counts.deferred += 1;
      continue;
    }

    if (resolution.context.adConsent !== 'granted') {
      await db
        .update(adConversionOutbox)
        .set({
          skippedAt: new Date(),
          claimToken: null,
          claimedAt: null,
          lastError: 'advertising_consent_missing',
          adContext: null,
        })
        .where(claimWhere);
      counts.skipped += 1;
      continue;
    }

    const user = await buildCapiUser(claimed, resolution.context);
    prepared.push({
      entry: claimed,
      claimToken,
      event: buildCapiEvent(claimed, resolution.context, user, new Date()),
    });
    logAdOutcome(claimed, 'claimed', {
      attempts: claimed.attempts,
      adConsent: resolution.context.adConsent,
    });
  }

  if (prepared.length === 0) return counts;

  const tally = (outcome: DeliveryOutcome) => {
    counts[outcome] += 1;
  };

  const batchResult = await sendOpenAiEvents(prepared.map((item) => item.event));
  if (prepared.length > 1 && isBatchRejection(batchResult)) {
    // One invalid event fails the whole batch: resend each event alone to isolate it.
    console.info('[AdConversionOutbox]', {
      outcome: 'batch_rejected_isolating',
      status: batchResult.ok ? undefined : batchResult.status,
      events: prepared.length,
    });
    for (const [index, item] of prepared.entries()) {
      if (Date.now() - drainStartedMs > ISOLATION_BUDGET_MS) {
        counts.deferred += await releaseClaims(prepared.slice(index));
        break;
      }
      const result = await sendOpenAiEvents([item.event]);
      tally(await applyResult(item, result, true));
    }
    return counts;
  }

  for (const item of prepared) {
    tally(await applyResult(item, batchResult, false));
  }
  return counts;
}

/**
 * Privacy scrub for the checkout-time ad context (raw IP, user agent, `oppref`) that
 * `createOrder` stores as `payment_orders.metadata.ads` so the webhook can build `order_created`.
 *
 * `completeOrder` copies that context into `ad_conversion_outbox` in the same transaction that
 * sets `status = 'completed'`, so it is safe to drop once an order is completed. It is also
 * dropped for orders that can never complete (`expired`, `cancelled`) and for any order older
 * than 7 days (past the Conversions API window, and Stripe Checkout Sessions expire within 24h).
 * `failed` is deliberately not treated as terminal: after `payment_intent.payment_failed` the
 * customer can retry in the same Checkout Session and the order may still complete.
 *
 * Only the `ads` key is removed (atomically, so concurrent metadata writes are kept) and
 * `updated_at` is left untouched. Rows locked by a payment worker are skipped and retried on the
 * next drain. Bounded per run.
 */
export async function scrubPaymentOrderAdContext(): Promise<{ scrubbed: number }> {
  const result = await db.execute(sql`
    UPDATE payment_orders
    SET metadata = metadata - 'ads'
    WHERE order_id IN (
      SELECT order_id
      FROM payment_orders
      WHERE jsonb_typeof(metadata) = 'object'
        AND metadata ? 'ads'
        AND (
          status IN ('completed', 'cancelled', 'expired')
          OR created_at < now() - interval '7 days'
        )
      LIMIT ${PAYMENT_AD_CONTEXT_SCRUB_LIMIT}
      FOR UPDATE SKIP LOCKED
    )
    AND metadata ? 'ads'
  `);
  const scrubbed = result.rowCount ?? 0;
  if (scrubbed > 0) {
    console.info('[AdConversionOutbox]', { outcome: 'payment_ad_context_scrubbed', scrubbed });
  }
  return { scrubbed };
}
