import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsAttributions,
  analyticsOutbox,
  creationDraftOpens,
  creationObservations,
  qualifiedShareOpens,
  stories,
} from '@/db/schema';
import { readAnalyticsConsentCookie } from '@/lib/analytics/consent-server';
import { analyticsPrivacyPaused } from '@/lib/analytics/destinations';
import type { ReferralTransaction } from '@/db/services/referrals';
import type { NextRequest } from 'next/server';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import type { CreationObservation } from './creation';
import { analyticsReference } from '@/lib/analytics/reference';

export function growthMeasurementEnabled(): boolean {
  return !analyticsPrivacyPaused() && process.env.GROWTH_MEASUREMENT_V2_ENABLED === 'true';
}

export function requestAnalyticsReceipt(request: NextRequest): string | undefined {
  if (!growthMeasurementEnabled()) return;
  if (!readAnalyticsConsentCookie(request.cookies.get(CONSENT_COOKIE_NAME)?.value)) return;
  const value = request.cookies.get('mythoria_attribution')?.value;
  if (value && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) return value;
}

export async function activeReceipt(tx: ReferralTransaction, receiptId: string) {
  const [receipt] = await tx
    .select()
    .from(analyticsAttributions)
    .where(
      and(
        eq(analyticsAttributions.attributionId, receiptId),
        isNull(analyticsAttributions.revokedAt),
        gt(analyticsAttributions.expiresAt, new Date()),
      ),
    )
    .for('share');
  return receipt;
}

export function growthOutboxContext(receipt: typeof analyticsAttributions.$inferSelect) {
  return {
    attributionId: receipt.attributionId,
    clientId: receipt.clientId,
    sessionId: receipt.sessionId,
    consent: receipt.consent,
    engagementTimeMsec: receipt.engagementTimeMsec,
  };
}

export async function saveCreationObservation(
  receiptId: string,
  outlineId: string,
  storyId: string,
  authorId: string,
  snapshot: CreationObservation,
) {
  await db.transaction(async (tx) => {
    const receipt = await activeReceipt(tx, receiptId);
    if (!receipt || (receipt.authorId && receipt.authorId !== authorId)) return;
    const [inserted] = await tx
      .insert(creationObservations)
      .values({ outlineId, storyId, receiptId, snapshot })
      .onConflictDoNothing()
      .returning({ acceptedAt: creationObservations.acceptedAt });
    if (!inserted) return;
    const outlineRef = analyticsReference(outlineId);
    const context = { ...growthOutboxContext(receipt), authorId, occurredAt: inserted.acceptedAt };
    await tx
      .insert(analyticsOutbox)
      .values([
        {
          ...context,
          eventName: 'creation_outline_accepted',
          dedupeKey: `growth:outline:${outlineId}`,
          params: {
            schema_version: 2,
            outline_ref: outlineRef,
            option: snapshot.firstOption,
            creation_route: snapshot.creationRoute,
            entry_kind: snapshot.entryKind,
            template_answer_count: snapshot.templateAnswerCount,
          },
        },
        ...snapshot.inputKinds.map((kind) => ({
          ...context,
          eventName: 'creation_input_retained',
          dedupeKey: `growth:input:${outlineId}:${kind}`,
          params: { schema_version: 2, outline_ref: outlineRef, input_kind: kind },
        })),
      ])
      .onConflictDoNothing();
  });
}

export async function revokeGrowthMeasurement(receiptId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(qualifiedShareOpens).where(eq(qualifiedShareOpens.receiptId, receiptId));
    await tx.delete(creationObservations).where(eq(creationObservations.receiptId, receiptId));
    await tx.delete(creationDraftOpens).where(eq(creationDraftOpens.receiptId, receiptId));
  });
}

export async function purgeRevokedGrowthMeasurement() {
  await db.transaction(async (tx) => {
    const revoked = tx
      .select({ id: analyticsAttributions.attributionId })
      .from(analyticsAttributions)
      .where(sql`${analyticsAttributions.revokedAt} is not null`);
    await tx
      .delete(qualifiedShareOpens)
      .where(sql`${qualifiedShareOpens.receiptId} in (${revoked})`);
    await tx
      .delete(creationObservations)
      .where(sql`${creationObservations.receiptId} in (${revoked})`);
    await tx.delete(creationDraftOpens).where(sql`${creationDraftOpens.receiptId} in (${revoked})`);
  });
}

export async function linkGrowthRecipient(receiptId: string, authorId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`share-recipient:${authorId}`}))`);
    if (!(await activeReceipt(tx, receiptId))) return;
    const opens = await tx
      .select({
        id: qualifiedShareOpens.openId,
        storyId: qualifiedShareOpens.storyId,
        owner: stories.authorId,
      })
      .from(qualifiedShareOpens)
      .innerJoin(stories, eq(stories.storyId, qualifiedShareOpens.storyId))
      .where(
        and(eq(qualifiedShareOpens.receiptId, receiptId), isNull(qualifiedShareOpens.authorId)),
      )
      .orderBy(asc(qualifiedShareOpens.openedAt));
    for (const open of opens) {
      const [existing] = await tx
        .select({ id: qualifiedShareOpens.openId })
        .from(qualifiedShareOpens)
        .where(
          and(
            eq(qualifiedShareOpens.authorId, authorId),
            eq(qualifiedShareOpens.storyId, open.storyId),
          ),
        )
        .limit(1);
      if (existing || open.owner === authorId) {
        await tx
          .update(analyticsOutbox)
          .set({
            skippedAt: new Date(),
            suppressionReason: 'recipient_reclassified',
          })
          .where(
            and(
              eq(analyticsOutbox.dedupeKey, `growth:qualified_open:${open.id}`),
              isNull(analyticsOutbox.deliveredAt),
              isNull(analyticsOutbox.skippedAt),
            ),
          );
        await tx.delete(qualifiedShareOpens).where(eq(qualifiedShareOpens.openId, open.id));
      } else {
        await tx
          .update(qualifiedShareOpens)
          .set({ authorId })
          .where(eq(qualifiedShareOpens.openId, open.id));
        await tx
          .update(analyticsOutbox)
          .set({
            params: sql`jsonb_set(${analyticsOutbox.params}, '{reader_class}', '"account"')`,
          })
          .where(
            and(
              eq(analyticsOutbox.dedupeKey, `growth:qualified_open:${open.id}`),
              isNull(analyticsOutbox.deliveredAt),
              isNull(analyticsOutbox.skippedAt),
            ),
          );
      }
    }
  });
}

function effectiveAmount(table: 'candidate' | 'earlier') {
  const alias = sql.identifier(table);
  return sql`case when jsonb_typeof(${alias}.metadata #> '{stripe,amountTotal}') = 'number'
    then (${alias}.metadata #>> '{stripe,amountTotal}')::numeric else ${alias}.amount end`;
}

function settledLiveOrder(table: 'candidate' | 'earlier') {
  const alias = sql.identifier(table);
  return sql`(${alias}.completed_at is not null or ${alias}.status = 'completed')
    and (${effectiveAmount(table)}) > 0
    and (${alias}.metadata #>> '{stripe,livemode}') is distinct from 'false'
    and not exists (
      select 1 from payment_events evidence
      where evidence.order_id = ${alias}.order_id and evidence.event_type = 'webhook_received'
        and evidence.data #>> '{session,livemode}' = 'false'
    )`;
}

async function insertFirstSharePayments(
  executor: ReferralTransaction | typeof db,
  orderId?: string,
) {
  const result = await executor.execute(sql`
    insert into share_first_payments (order_id, author_id, story_id, amount_cents, currency, paid_at)
    select candidate.order_id, candidate.author_id, share.story_id,
      ${effectiveAmount('candidate')}, candidate.currency, candidate.completed_at
    from payment_orders candidate
    cross join lateral (
      select recipient.story_id from qualified_share_opens recipient
      join analytics_attributions receipt on receipt.attribution_id = recipient.receipt_id
      where recipient.author_id = candidate.author_id and receipt.revoked_at is null
        and recipient.opened_at >= candidate.completed_at - interval '720 hours'
        and recipient.opened_at < candidate.completed_at
      order by recipient.opened_at desc, recipient.open_id desc limit 1 for share of receipt
    ) share
    where ${orderId ? sql`candidate.order_id = ${orderId}` : sql`candidate.completed_at >= now() - interval '30 days'`}
      and candidate.completed_at is not null and ${settledLiveOrder('candidate')}
      and not exists (select 1 from share_first_payments prior where prior.author_id = candidate.author_id)
      and not exists (
        select 1 from payment_orders earlier where earlier.author_id = candidate.author_id
          and (coalesce(earlier.completed_at, earlier.created_at), earlier.order_id) <
            (candidate.completed_at, candidate.order_id)
          and ${settledLiveOrder('earlier')}
      )
    order by candidate.completed_at, candidate.order_id limit 25
    on conflict do nothing
  `);
  return result.rowCount ?? 0;
}

export async function snapshotShareFirstPayment(tx: ReferralTransaction, orderId: string) {
  if (growthMeasurementEnabled()) await insertFirstSharePayments(tx, orderId);
}

/** Repairs completion/link races and transient failures without mutating frozen orders. */
export async function reconcileShareFirstPayments() {
  return growthMeasurementEnabled() ? insertFirstSharePayments(db) : 0;
}
