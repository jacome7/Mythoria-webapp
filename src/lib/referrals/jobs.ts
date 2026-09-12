import { referralMonthPeriod } from './calendar';
import { referralLogger } from './logger';
import { and, eq, lte, or, isNull, sql } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { paymentOrders, fiscalDocuments, authors } from '@/db/schema';
import {
  referralCommissions,
  referralCommissionEvents,
  referralSnapshots,
  referralReconciliations,
  referralOutbox,
  referralMemberships,
  referralOwners,
  referralSettlements,
} from '@/db/schema/referrals';
import {
  accrueOrderCommission,
  createSettlement,
  matureCommissions,
  referralService,
} from '@/db/services/referrals';
import { getStripeClient, paymentService } from '@/db/services/payment';
import { retryablePaymentEvents } from './inbox';
import { commissionCents, REFERRAL_POLICY, ReferralError } from './policy';
import { notificationClient } from '@/lib/notifications/client';

export async function reconcileReferrals(from: Date, to: Date) {
  const stripe = getStripeClient();
  const report = {
    period_start: from.toISOString(),
    period_end: to.toISOString(),
    stripe_completed_count: 0,
    local_completed_count: 0,
    orders_missing_commission: 0,
    duplicate_provider_events: 0,
    commission_amount_mismatches: 0,
    unresolved_refunds: 0,
    unresolved_disputes: 0,
    settlement_mismatches: 0,
    fiscal_mismatches: 0,
    provider_errors: 0,
    provider_orders_missing_locally: 0,
    blocked_over_48_hours: 0,
    owners_with_negative_balance: 0,
    reconciliation_scope:
      'All completed referral snapshots; independent Stripe discovery in the stated creation window',
  };
  try {
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: Math.floor(from.getTime() / 1000), lt: Math.ceil(to.getTime() / 1000) },
      limit: 100,
    })) {
      if (session.payment_status !== 'paid' || !session.metadata?.mythoriaOrderId) continue;
      report.stripe_completed_count++;
      const [local] = await db
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.providerOrderId, session.id));
      if (!local || local.status !== 'completed') report.provider_orders_missing_locally++;
    }
  } catch {
    report.provider_errors++;
  }
  const orders = await db
    .select({ order: paymentOrders, snapshot: referralSnapshots })
    .from(paymentOrders)
    .innerJoin(referralSnapshots, eq(referralSnapshots.paymentOrderId, paymentOrders.orderId))
    .where(eq(paymentOrders.status, 'completed'));
  for (const { order, snapshot } of orders) {
    report.local_completed_count++;
    try {
      if (!order.providerOrderId) {
        report.provider_errors++;
        continue;
      }
      const session = await stripe.checkout.sessions.retrieve(order.providerOrderId, {
        expand: ['payment_intent.latest_charge'],
      });
      if (session.payment_status !== 'paid') {
        report.commission_amount_mismatches++;
        continue;
      }
      const [c] = await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.paymentOrderId, order.orderId));
      if (!c) {
        report.orders_missing_commission++;
        continue;
      }
      if (session.amount_total === null || session.currency?.toUpperCase() !== 'EUR') {
        report.provider_errors++;
        continue;
      }
      if (c.originalCommissionCents === null) {
        await db.transaction(async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${`owner:${c.referralOwnerId}`},0))`,
          );
          const amount = commissionCents(session.amount_total!, snapshot.commissionRateBps);
          const [valued] = await tx
            .update(referralCommissions)
            .set({
              grossAmountCents: session.amount_total,
              commissionBasisCents: session.amount_total,
              originalCommissionCents: amount,
              netCommissionCents: amount,
              status: 'pending',
              reviewReason: null,
              reconciledAt: null,
            })
            .where(
              and(
                eq(referralCommissions.commissionId, c.commissionId),
                isNull(referralCommissions.originalCommissionCents),
              ),
            )
            .returning();
          if (valued)
            await tx
              .insert(referralCommissionEvents)
              .values({
                commissionId: c.commissionId,
                eventType: 'accrued',
                signedAmountCents: amount,
                idempotencyKey: `commission:accrued:${order.orderId}`,
                actorType: 'system',
                occurredAt: order.completedAt || order.updatedAt,
              })
              .onConflictDoNothing();
        });
      } else if (
        c.commissionBasisCents !== session.amount_total ||
        c.commissionRateBps !== snapshot.commissionRateBps ||
        c.originalCommissionCents !==
          commissionCents(session.amount_total, snapshot.commissionRateBps)
      ) {
        report.commission_amount_mismatches++;
        continue;
      }
      const sums = await db.execute(
        sql`select coalesce(sum(signed_amount_cents),0)::bigint as total from referral_commission_events where commission_id=${c.commissionId}::uuid`,
      );
      if (
        Number(sums.rows[0]?.total) !==
        (c.originalCommissionCents === null
          ? commissionCents(session.amount_total, snapshot.commissionRateBps)
          : c.netCommissionCents)
      ) {
        report.commission_amount_mismatches++;
        continue;
      }
      const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
      const charge = intent?.latest_charge;
      if (charge)
        await paymentService.reconcileReferralCharge(
          typeof charge === 'string' ? charge : charge.id,
          `reconcile:${order.orderId}:${to.toISOString()}`,
        );
      const [fiscal] = await db
        .select()
        .from(fiscalDocuments)
        .where(eq(fiscalDocuments.orderId, order.orderId));
      if (!fiscal || fiscal.status !== 'issued') {
        report.fiscal_mismatches++;
        continue;
      }
      await db
        .update(referralCommissions)
        .set({ reconciledAt: new Date() })
        .where(eq(referralCommissions.commissionId, c.commissionId));
      const [current] = await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.commissionId, c.commissionId));
      if (current?.disputeOpen) report.unresolved_disputes++;
    } catch {
      report.provider_errors++;
    }
  }
  const mismatches = await db.execute(
    sql`select count(*)::int as count from referral_settlements s where s.status<>'cancelled' and (s.net_payment_cents<>(select coalesce(sum(i.signed_amount_cents),0) from referral_settlement_items i where i.settlement_id=s.settlement_id and i.released_at is null) or (s.status='paid' and (s.external_payment_reference is null or s.paid_at is null)))`,
  );
  report.settlement_mismatches = Number(mismatches.rows[0]?.count || 0);
  const failures = await db.execute(
    sql`select count(*) filter(where event_type like '%refund%')::int as refunds, count(*) filter(where event_type like '%dispute%')::int as disputes from payment_provider_events where processing_status<>'processed'`,
  );
  report.unresolved_refunds = Number(failures.rows[0]?.refunds || 0);
  report.unresolved_disputes += Number(failures.rows[0]?.disputes || 0);
  const duplicates = await db.execute(
    sql`select count(*)::int as count from (select payment_order_id from referral_commissions group by payment_order_id having count(*)>1) d`,
  );
  report.duplicate_provider_events = Number(duplicates.rows[0]?.count || 0);
  const alerts = await db.execute(
    sql`select (select count(*)::int from referral_commissions where status='blocked' and created_at<now()-interval '48 hours') as blocked, (select count(*)::int from (select c.referral_owner_id from referral_commission_events e join referral_commissions c using(commission_id) where c.mode='live' and not exists(select 1 from referral_settlement_items i where i.commission_event_id=e.commission_event_id and i.released_at is null) group by c.referral_owner_id having sum(e.signed_amount_cents)<0) b) as negative`,
  );
  report.blocked_over_48_hours = Number(alerts.rows[0]?.blocked || 0);
  report.owners_with_negative_balance = Number(alerts.rows[0]?.negative || 0);
  if (report.blocked_over_48_hours || report.owners_with_negative_balance)
    referralLogger.error('financial_review_required', {
      event: 'financial_review_required',
      blocked: report.blocked_over_48_hours,
      negativeBalances: report.owners_with_negative_balance,
    });
  const clean =
    report.orders_missing_commission +
      report.commission_amount_mismatches +
      report.settlement_mismatches +
      report.fiscal_mismatches +
      report.provider_orders_missing_locally +
      report.unresolved_refunds +
      report.unresolved_disputes +
      report.duplicate_provider_events +
      report.provider_errors ===
    0;
  await db
    .insert(referralReconciliations)
    .values({ periodStart: from, periodEnd: to, report, clean });
  if (!clean)
    referralLogger.error('reconciliation_mismatch', {
      event: 'reconciliation_mismatch',
      errorCode: 'reconciliation_mismatch',
      ...report,
    });
  return report;
}

export async function drainReferralOutbox() {
  const rows = await db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(referralOutbox)
      .where(
        and(
          or(
            eq(referralOutbox.status, 'pending'),
            eq(referralOutbox.status, 'retry'),
            eq(referralOutbox.status, 'processing'),
          ),
          lte(referralOutbox.nextAttemptAt, new Date()),
          or(isNull(referralOutbox.leaseUntil), lte(referralOutbox.leaseUntil, new Date())),
        ),
      )
      .limit(30)
      .for('update', { skipLocked: true });
    for (const row of pending)
      await tx
        .update(referralOutbox)
        .set({
          status: 'processing',
          leaseUntil: new Date(Date.now() + 300000),
          attempts: row.attempts + 1,
        })
        .where(eq(referralOutbox.outboxId, row.outboxId));
    return pending;
  });
  let processed = 0;
  for (const row of rows)
    try {
      if (row.kind === 'account-deletion') {
        try {
          await (await clerkClient()).users.deleteUser(String(row.payload.clerkUserId));
        } catch (error) {
          if (!(error && typeof error === 'object' && 'status' in error && error.status === 404))
            throw error;
        }
      } else if (
        row.kind === 'payment-credit-notification' ||
        row.kind === 'payment-fiscal-document'
      ) {
        const [order] = await db
          .select()
          .from(paymentOrders)
          .where(eq(paymentOrders.orderId, String(row.payload.orderId)));
        if (!order || order.status !== 'completed') throw new Error('payment_not_completed');
        if (row.kind === 'payment-fiscal-document') {
          const { fiscalDocumentService } = await import('@/db/services/fiscal-documents');
          const document = await fiscalDocumentService.issueForCompletedStripeOrder(order);
          if (!document || document.status !== 'issued')
            throw new Error('fiscal_document_not_issued');
        } else {
          const [author] = await db
            .select()
            .from(authors)
            .where(eq(authors.authorId, order.authorId));
          if (author && !author.accountClosedAt) {
            const bundle = order.creditBundle as { credits: number };
            const response = await notificationClient.sendCreditsAddedNotification({
              email: author.email,
              name: author.displayName,
              credits: bundle.credits,
              preferredLocale: author.preferredLocale,
              authorId: author.authorId,
              source: order.provider,
              entityId: order.orderId,
            });
            if (!response.success) throw new Error('notification_failed');
          }
        }
      } else {
        let ownerId: string;
        let memberId: string | undefined;
        let settlement: typeof referralSettlements.$inferSelect | undefined;
        if (row.kind === 'referral-invitation') {
          memberId = String(row.payload.membershipId);
          const [member] = await db
            .select()
            .from(referralMemberships)
            .where(eq(referralMemberships.membershipId, memberId));
          if (!member) throw new Error('missing_member');
          ownerId = member.referralOwnerId;
        } else {
          [settlement] = await db
            .select()
            .from(referralSettlements)
            .where(eq(referralSettlements.settlementId, String(row.payload.settlementId)));
          if (!settlement) throw new Error('missing_settlement');
          ownerId = settlement.referralOwnerId;
        }
        const [owner] = await db
          .select()
          .from(referralOwners)
          .where(eq(referralOwners.referralOwnerId, ownerId));
        const members = await db
          .select()
          .from(referralMemberships)
          .where(
            and(
              eq(referralMemberships.referralOwnerId, ownerId),
              memberId
                ? eq(referralMemberships.membershipId, memberId)
                : eq(referralMemberships.status, 'active'),
            ),
          );
        for (const member of members) {
          if (
            member.status === 'suspended' ||
            owner.status !== 'active' ||
            settlement?.status === 'cancelled'
          )
            continue;
          const response = await notificationClient.sendTemplatedEmail({
            templateId: row.kind,
            recipients: [{ email: member.emailNormalized, language: owner.preferredLocale }],
            entityId: `${row.outboxId}:${member.membershipId}`,
            variables: {
              name: owner.displayName,
              portalUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt'}/${owner.preferredLocale}/referrals`,
              amount: settlement
                ? new Intl.NumberFormat(owner.preferredLocale, {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(settlement.netPaymentCents / 100)
                : '',
              periodEnd: settlement?.periodEnd.toISOString().slice(0, 10) || '',
            },
          });
          if (!response.success) throw new Error('notification_failed');
        }
      }
      await db
        .update(referralOutbox)
        .set({
          status: 'completed',
          completedAt: new Date(),
          leaseUntil: null,
          ...(row.kind === 'account-deletion' ? { payload: {} } : {}),
        })
        .where(eq(referralOutbox.outboxId, row.outboxId));
      processed++;
    } catch {
      await db
        .update(referralOutbox)
        .set({
          status: 'retry',
          leaseUntil: null,
          nextAttemptAt: new Date(
            Date.now() + Math.min(1440, 2 ** Math.min(row.attempts + 1, 10)) * 60000,
          ),
        })
        .where(eq(referralOutbox.outboxId, row.outboxId));
      referralLogger.error('outbox_retry', { errorCode: 'delivery_failed' });
    }
  return { processed, total: rows.length };
}
export async function retryReferralPayments() {
  const events = await retryablePaymentEvents();
  let processed = 0;
  for (const event of events)
    try {
      const result = await paymentService.processStripeWebhook(
        await getStripeClient().events.retrieve(event.providerEventId),
      );
      if (result.success) processed++;
    } catch {
      referralLogger.error('payment_retry_failed', {
        event: 'payment_retry_failed',
        errorCode: 'provider_unavailable',
      });
    }
  return { processed, total: events.length };
}
export async function closeReferralMonth(now = new Date()) {
  const { start, end } = referralMonthPeriod(now);
  const owners = await referralService.listOwners();
  let created = 0;
  for (const { owner } of owners)
    try {
      await createSettlement(owner.referralOwnerId, start, end, {
        type: 'system',
        id: 'referral-monthly-close',
        permissions: ['referrals:view', 'referrals:settle'],
      });
      created++;
    } catch (error) {
      if (!(
        error instanceof ReferralError &&
        ['below_payment_minimum', 'held_paid_exposure'].includes(error.code)
      ))
        throw error;
    }
  return { created, periodStart: start, periodEnd: end };
}
export { matureCommissions, accrueOrderCommission };
