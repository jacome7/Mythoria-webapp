import { and, eq, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  referralCodes,
  referralOwners,
  referralTerms,
  referralSettlements,
} from '@/db/schema/referrals';
import { referralFilterSchema, REFERRAL_POLICY, ReferralError } from '@/lib/referrals/policy';
import { z } from 'zod';

export async function referralStatement(ownerId: string, statementId: string) {
  z.uuid().parse(statementId);
  const [statement] = await db
    .select({
      id: referralSettlements.settlementId,
      periodStart: referralSettlements.periodStart,
      periodEnd: referralSettlements.periodEnd,
      netPaymentCents: referralSettlements.netPaymentCents,
      status: referralSettlements.status,
      paidAt: referralSettlements.paidAt,
      externalPaymentReference: referralSettlements.externalPaymentReference,
    })
    .from(referralSettlements)
    .where(
      and(
        eq(referralSettlements.referralOwnerId, ownerId),
        eq(referralSettlements.settlementId, statementId),
      ),
    );
  if (!statement) throw new ReferralError('not_found', 404);
  const items = await db.execute(
    sql`select e.occurred_at,c.customer_reference,i.signed_amount_cents from referral_settlement_items i join referral_commission_events e using(commission_event_id) join referral_commissions c using(commission_id) where i.settlement_id=${statementId}::uuid and c.referral_owner_id=${ownerId}::uuid order by e.occurred_at,e.commission_event_id`,
  );
  return { statement, items: items.rows };
}

export async function referralSummary(ownerId: string, input: unknown) {
  const filter = referralFilterSchema.parse(input);
  const from = filter.from ? new Date(filter.from) : new Date(0);
  const to = filter.to ? new Date(filter.to) : new Date();
  const [owner] = await db
    .select({
      displayName: referralOwners.displayName,
      code: referralCodes.code,
      active: referralCodes.active,
    })
    .from(referralOwners)
    .innerJoin(referralCodes, eq(referralOwners.referralOwnerId, referralCodes.referralOwnerId))
    .where(eq(referralOwners.referralOwnerId, ownerId));
  if (!owner) throw new ReferralError('not_found', 404);
  const [terms] = await db
    .select({ rate: referralTerms.commissionRateBps })
    .from(referralTerms)
    .where(
      and(
        eq(referralTerms.referralOwnerId, ownerId),
        sql`${referralTerms.effectiveFrom} <= now() and (${referralTerms.effectiveUntil} is null or ${referralTerms.effectiveUntil} > now())`,
      ),
    )
    .limit(1);
  const visits = await db.execute(
    sql`select count(*)::int as visits, count(distinct anonymous_visitor_id)::int as visitors from referral_visits v join referral_codes c using(referral_code_id) where c.referral_owner_id=${ownerId}::uuid and v.visited_at >= ${from} and v.visited_at < ${to} ${filter.locale ? sql`and v.locale=${filter.locale}` : sql``}`,
  );
  const funnel = await db.execute(
    sql`select event_type, count(*)::int as count, count(distinct customer_reference)::int as customers, count(*) filter(where new_account)::int as new_accounts from referral_funnel_events where referral_owner_id=${ownerId}::uuid and occurred_at >= ${from} and occurred_at < ${to} ${filter.locale ? sql`and locale=${filter.locale}` : sql``} ${filter.country ? sql`and country=${filter.country}` : sql``} group by event_type`,
  );
  const financial = await db.execute(
    sql`select c.status, count(*)::int as purchases, count(distinct c.customer_reference)::int as customers, coalesce(sum(c.gross_amount_cents),0)::bigint as revenue, coalesce(sum(c.net_commission_cents),0)::bigint as commission, coalesce(sum(c.reversed_cents),0)::bigint as reversals, count(*) filter(where c.purchase_kind='first')::int as first_purchases, count(*) filter(where c.purchase_kind='repeat')::int as repeat_purchases from referral_commissions c join payment_order_referral_snapshots s using(payment_order_id) where c.referral_owner_id=${ownerId}::uuid and c.mode='live' and c.created_at >= ${from} and c.created_at < ${to} ${filter.locale ? sql`and s.locale=${filter.locale}` : sql``} ${filter.country ? sql`and s.country=${filter.country}` : sql``} ${filter.purchase ? sql`and c.purchase_kind=${filter.purchase}` : sql``} ${filter.status ? sql`and c.status=${filter.status}` : sql``} group by c.status`,
  );
  const paid = await db.execute(
    sql`select coalesce(sum(net_payment_cents),0)::bigint as paid from referral_settlements where referral_owner_id=${ownerId}::uuid and status='paid' and paid_at>=${from} and paid_at<${to}`,
  );
  return {
    owner,
    commissionRateBps: terms?.rate ?? REFERRAL_POLICY.defaultRateBps,
    policy: REFERRAL_POLICY,
    visits: visits.rows[0],
    funnel: funnel.rows,
    financial: financial.rows,
    payments: paid.rows[0],
  };
}
export async function referralTransactions(ownerId: string | null, input: unknown, admin = false) {
  const filter = referralFilterSchema.parse(input);
  const result = await db.execute(
    sql`select c.commission_id as id, c.customer_reference, c.created_at, c.gross_amount_cents, c.commission_rate_bps, c.original_commission_cents, c.net_commission_cents, c.status, c.dispute_open, (c.review_reason is not null) as under_review, c.reversed_cents, c.hold_until, c.purchase_kind, count(*) over()::int as total ${admin ? sql`,c.referral_owner_id,c.payment_order_id,c.review_reason,c.mode` : sql``} from referral_commissions c join payment_order_referral_snapshots s using(payment_order_id) where ${ownerId ? sql`c.referral_owner_id=${ownerId}::uuid` : sql`true`} ${admin ? sql`` : sql`and c.mode='live'`} ${filter.from ? sql`and c.created_at>=${new Date(filter.from)}` : sql``} ${filter.to ? sql`and c.created_at<${new Date(filter.to)}` : sql``} ${filter.status ? sql`and c.status=${filter.status}` : sql``} ${filter.purchase ? sql`and c.purchase_kind=${filter.purchase}` : sql``} ${filter.locale ? sql`and s.locale=${filter.locale}` : sql``} ${filter.country ? sql`and s.country=${filter.country}` : sql``} order by c.created_at desc,c.commission_id limit ${filter.limit} offset ${(filter.page - 1) * filter.limit}`,
  );
  return {
    items: result.rows,
    page: filter.page,
    limit: filter.limit,
    total: Number(result.rows[0]?.total || 0),
  };
}
export async function referralSettlementHistory(
  ownerId: string | null,
  input: unknown,
  admin = false,
) {
  const filter = referralFilterSchema.parse(input);
  const rows = await db
    .select({
      id: referralSettlements.settlementId,
      ...(admin ? { referralOwnerId: referralSettlements.referralOwnerId } : {}),
      periodStart: referralSettlements.periodStart,
      periodEnd: referralSettlements.periodEnd,
      grossCommissionCents: referralSettlements.grossCommissionCents,
      adjustmentsCents: referralSettlements.adjustmentsCents,
      netPaymentCents: referralSettlements.netPaymentCents,
      status: referralSettlements.status,
      paidAt: referralSettlements.paidAt,
    })
    .from(referralSettlements)
    .where(
      and(
        ownerId ? eq(referralSettlements.referralOwnerId, ownerId) : undefined,
        filter.from ? sql`${referralSettlements.periodEnd} >= ${new Date(filter.from)}` : undefined,
        filter.to ? sql`${referralSettlements.periodEnd} < ${new Date(filter.to)}` : undefined,
      ),
    )
    .orderBy(desc(referralSettlements.periodEnd))
    .limit(filter.limit)
    .offset((filter.page - 1) * filter.limit);
  return { items: rows, page: filter.page };
}
export async function referralConversionHistory(ownerId: string, input: unknown) {
  const filter = referralFilterSchema.parse(input);
  const result = await db.execute(
    sql`select customer_reference, event_type, occurred_at from referral_funnel_events where referral_owner_id=${ownerId}::uuid ${filter.from ? sql`and occurred_at>=${new Date(filter.from)}` : sql``} ${filter.to ? sql`and occurred_at<${new Date(filter.to)}` : sql``} ${filter.locale ? sql`and locale=${filter.locale}` : sql``} ${filter.country ? sql`and country=${filter.country}` : sql``} order by occurred_at desc limit ${filter.limit} offset ${(filter.page - 1) * filter.limit}`,
  );
  return { items: result.rows, page: filter.page };
}
