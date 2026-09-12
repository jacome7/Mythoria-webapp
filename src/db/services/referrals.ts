import { randomUUID } from 'node:crypto';
import { and, eq, isNull, lte, gt, or, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import { authors, paymentOrders, promotionCodes } from '@/db/schema';
import {
  referralOwners,
  referralCodes,
  referralTerms,
  referralMemberships,
  referralVisits,
  referralAssignments,
  referralSnapshots,
  referralCustomers,
  referralCommissions,
  referralCommissionEvents,
  referralSettlements,
  referralSettlementItems,
  referralAuditEvents,
  referralOutbox,
  referralFunnelEvents,
} from '@/db/schema/referrals';
import {
  commissionCents,
  cumulativeReversalCents,
  modeForOwner,
  ownerInputSchema,
  referralCodeSchema,
  ReferralError,
  REFERRAL_POLICY,
  requireReferralPermission,
  type ReferralActor,
} from '@/lib/referrals/policy';

export type ReferralTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = ReferralTransaction | typeof db;
const system: ReferralActor = {
  type: 'system',
  id: 'referral-jobs',
  permissions: ['referrals:view', 'referrals:review', 'referrals:settle'],
};
export async function referralLock(tx: ReferralTransaction, key: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
}
async function audit(
  tx: ReferralTransaction,
  actor: ReferralActor,
  entityId: string,
  action: string,
  reason?: string,
) {
  await tx
    .insert(referralAuditEvents)
    .values({ entityId, action, actorType: actor.type, actorId: actor.id, reason });
}
async function enqueue(
  tx: ReferralTransaction,
  kind: string,
  dedupeKey: string,
  payload: Record<string, unknown>,
) {
  await tx.insert(referralOutbox).values({ kind, dedupeKey, payload }).onConflictDoNothing();
}
async function customerReference(tx: ReferralTransaction, authorId: string, ownerId: string) {
  const [reference] = await tx
    .insert(referralCustomers)
    .values({ authorId, referralOwnerId: ownerId })
    .onConflictDoUpdate({
      target: [referralCustomers.referralOwnerId, referralCustomers.authorId],
      set: { authorId },
    })
    .returning();
  return reference.customerReference;
}
export async function getActiveReferral(authorId: string, executor: Executor = db) {
  const [row] = await executor
    .select({ assignment: referralAssignments, code: referralCodes, owner: referralOwners })
    .from(referralAssignments)
    .innerJoin(referralCodes, eq(referralCodes.referralCodeId, referralAssignments.referralCodeId))
    .innerJoin(referralOwners, eq(referralOwners.referralOwnerId, referralCodes.referralOwnerId))
    .where(and(eq(referralAssignments.authorId, authorId), isNull(referralAssignments.endedAt)))
    .limit(1);
  return row ?? null;
}
async function eligibleCode(code: string, tx: Executor) {
  const now = new Date();
  const [row] = await tx
    .select({ code: referralCodes, owner: referralOwners })
    .from(referralCodes)
    .innerJoin(referralOwners, eq(referralCodes.referralOwnerId, referralOwners.referralOwnerId))
    .where(
      and(
        eq(referralCodes.code, code),
        eq(referralCodes.active, true),
        eq(referralOwners.status, 'active'),
        or(isNull(referralCodes.validFrom), lte(referralCodes.validFrom, now)),
        or(isNull(referralCodes.validUntil), gt(referralCodes.validUntil, now)),
      ),
    )
    .limit(1);
  if (!row) throw new ReferralError('invalid_or_inactive_code');
  return row;
}
async function assertCustomerEligible(tx: Executor, authorId: string) {
  const [author] = await tx.select().from(authors).where(eq(authors.authorId, authorId));
  if (!author) throw new ReferralError('auth_required', 401);
  const [member] = await tx
    .select({ id: referralMemberships.membershipId })
    .from(referralMemberships)
    .where(
      and(
        eq(referralMemberships.status, 'active'),
        or(
          eq(referralMemberships.clerkUserId, author.clerkUserId),
          eq(referralMemberships.emailNormalized, author.email.trim().toLowerCase()),
        ),
      ),
    )
    .limit(1);
  if (member) throw new ReferralError('self_referral_not_allowed');
  return author;
}
export const referralService = {
  async createOwner(input: unknown, actor: ReferralActor) {
    requireReferralPermission(actor, 'referrals:manage');
    const data = ownerInputSchema.parse(input);
    return db.transaction(async (tx) => {
      await referralLock(tx, `code:${data.code}`);
      const [promo] = await tx
        .select({ code: promotionCodes.code })
        .from(promotionCodes)
        .where(sql`upper(trim(${promotionCodes.code})) = ${data.code}`)
        .limit(1);
      const [existing] = await tx
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.code, data.code));
      if (promo || existing) throw new ReferralError('code_unavailable', 409);
      const [owner] = await tx
        .insert(referralOwners)
        .values({
          displayName: data.displayName,
          legalName: data.legalName,
          contactEmailNormalized: data.contactEmail,
          countryCode: data.countryCode,
          preferredLocale: data.preferredLocale,
          createdByActorType: actor.type,
          createdByActorId: actor.id,
        })
        .returning();
      await tx
        .insert(referralCodes)
        .values({ referralOwnerId: owner.referralOwnerId, code: data.code });
      await tx.insert(referralTerms).values({
        referralOwnerId: owner.referralOwnerId,
        commissionRateBps: data.commissionRateBps,
        effectiveFrom: sql`now()`,
        programPolicyVersion: REFERRAL_POLICY.version,
        createdByActorType: actor.type,
        createdByActorId: actor.id,
      });
      for (const email of new Set(data.memberEmails)) {
        const [member] = await tx
          .insert(referralMemberships)
          .values({ referralOwnerId: owner.referralOwnerId, emailNormalized: email })
          .returning();
        await enqueue(tx, 'referral-invitation', `invite:${member.membershipId}:initial`, {
          membershipId: member.membershipId,
        });
      }
      await audit(tx, actor, owner.referralOwnerId, 'owner_created');
      return owner;
    });
  },
  async listOwners() {
    return db
      .select({
        owner: referralOwners,
        code: referralCodes,
        // Independent aggregates avoid multiplying totals across visits and purchases.
        visits:
          sql<number>`(select count(*) from referral_visits v join referral_codes c using(referral_code_id) where c.referral_owner_id = ${referralOwners.referralOwnerId})`.mapWith(
            Number,
          ),
        registrations:
          sql<number>`(select count(*) from referral_funnel_events f where f.referral_owner_id = ${referralOwners.referralOwnerId} and f.event_type = 'registration')`.mapWith(
            Number,
          ),
        revenueCents:
          sql<number>`(select coalesce(sum(c.gross_amount_cents), 0) from referral_commissions c where c.referral_owner_id = ${referralOwners.referralOwnerId} and c.mode = 'live')`.mapWith(
            Number,
          ),
      })
      .from(referralOwners)
      .innerJoin(referralCodes, eq(referralCodes.referralOwnerId, referralOwners.referralOwnerId))
      .orderBy(desc(referralOwners.createdAt));
  },
  async getOwner(id: string) {
    const [owner] = await db
      .select()
      .from(referralOwners)
      .where(eq(referralOwners.referralOwnerId, id));
    if (!owner) throw new ReferralError('not_found', 404);
    const [code] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.referralOwnerId, id));
    const terms = await db
      .select()
      .from(referralTerms)
      .where(eq(referralTerms.referralOwnerId, id))
      .orderBy(desc(referralTerms.effectiveFrom));
    const members = await db
      .select()
      .from(referralMemberships)
      .where(eq(referralMemberships.referralOwnerId, id));
    return { owner, code, terms, members };
  },
  async setStatus(
    id: string,
    status: 'active' | 'suspended' | 'closed',
    reason: string,
    actor: ReferralActor,
  ) {
    requireReferralPermission(actor, 'referrals:manage');
    return db.transaction(async (tx) => {
      await referralLock(tx, `owner:${id}`);
      const [owner] = await tx
        .select()
        .from(referralOwners)
        .where(eq(referralOwners.referralOwnerId, id))
        .for('update');
      if (!owner) throw new ReferralError('not_found', 404);
      if (owner.status === 'closed' && status !== 'closed')
        throw new ReferralError('owner_closed', 409);
      const [updated] = await tx
        .update(referralOwners)
        .set({
          status,
          suspendedAt: status === 'suspended' ? new Date() : null,
          closedAt: status === 'closed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(referralOwners.referralOwnerId, id))
        .returning();
      await audit(tx, actor, id, `owner_${status}`, reason);
      return updated;
    });
  },
  async updateOwner(
    id: string,
    data: {
      displayName?: string;
      legalName?: string;
      contactEmailNormalized?: string;
      preferredLocale?: string;
      countryCode?: string;
      code?: string;
      codeActive?: boolean;
    },
    actor: ReferralActor,
  ) {
    requireReferralPermission(actor, 'referrals:manage');
    return db.transaction(async (tx) => {
      await referralLock(tx, `owner:${id}`);
      const { code, codeActive, ...profile } = data;
      const [owner] = await tx
        .update(referralOwners)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(referralOwners.referralOwnerId, id))
        .returning();
      if (!owner) throw new ReferralError('not_found', 404);
      if (code !== undefined || codeActive !== undefined) {
        const [current] = await tx
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.referralOwnerId, id))
          .for('update');
        if (code && current.firstVisitedAt && code !== current.code)
          throw new ReferralError('code_already_used', 409);
        if (code) {
          const normalized = referralCodeSchema.parse(code);
          await referralLock(tx, `code:${normalized}`);
          const [promo] = await tx
            .select({ id: promotionCodes.code })
            .from(promotionCodes)
            .where(sql`upper(trim(${promotionCodes.code})) = ${normalized}`)
            .limit(1);
          if (promo) throw new ReferralError('code_unavailable', 409);
        }
        await tx
          .update(referralCodes)
          .set({
            ...(code ? { code: referralCodeSchema.parse(code) } : {}),
            ...(codeActive !== undefined ? { active: codeActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(referralCodes.referralOwnerId, id));
      }
      await audit(tx, actor, id, 'owner_updated');
      return owner;
    });
  },
  async setRate(
    id: string,
    rate: number,
    effectiveFrom: Date,
    reason: string,
    actor: ReferralActor,
  ) {
    requireReferralPermission(actor, 'referrals:manage');
    commissionCents(0, rate);
    if (effectiveFrom < new Date()) throw new ReferralError('rate_must_be_future');
    return db.transaction(async (tx) => {
      await referralLock(tx, `owner:${id}`);
      const [latest] = await tx
        .select()
        .from(referralTerms)
        .where(eq(referralTerms.referralOwnerId, id))
        .orderBy(desc(referralTerms.effectiveFrom))
        .limit(1);
      if (!latest) throw new ReferralError('not_found', 404);
      if (latest.effectiveFrom >= effectiveFrom) throw new ReferralError('terms_overlap', 409);
      await tx
        .update(referralTerms)
        .set({ effectiveUntil: effectiveFrom })
        .where(eq(referralTerms.termsVersionId, latest.termsVersionId));
      const [terms] = await tx
        .insert(referralTerms)
        .values({
          referralOwnerId: id,
          commissionRateBps: rate,
          effectiveFrom,
          reason,
          createdByActorId: actor.id,
          createdByActorType: actor.type,
          programPolicyVersion: REFERRAL_POLICY.version,
        })
        .returning();
      await audit(tx, actor, id, 'rate_scheduled', reason);
      return terms;
    });
  },
  async inviteMember(
    id: string,
    email: string,
    role: 'owner' | 'viewer',
    actor: ReferralActor,
    requestId: string,
  ) {
    requireReferralPermission(actor, 'referrals:manage');
    return db.transaction(async (tx) => {
      const [member] = await tx
        .insert(referralMemberships)
        .values({ referralOwnerId: id, emailNormalized: email.trim().toLowerCase(), role })
        .onConflictDoUpdate({
          target: [referralMemberships.referralOwnerId, referralMemberships.emailNormalized],
          set: { invitedAt: new Date() },
        })
        .returning();
      await enqueue(tx, 'referral-invitation', `invite:${member.membershipId}:${requestId}`, {
        membershipId: member.membershipId,
      });
      await audit(tx, actor, id, 'member_invited');
      return member;
    });
  },
  async capture(code: string, visitorId: string, locale: string, requestId: string = randomUUID()) {
    return db.transaction(async (tx) => {
      const valid = await eligibleCode(referralCodeSchema.parse(code), tx);
      await referralLock(tx, `owner:${valid.owner.referralOwnerId}`);
      await eligibleCode(valid.code.code, tx);
      const [existingVisit] = await tx
        .select()
        .from(referralVisits)
        .where(eq(referralVisits.referralVisitId, requestId));
      if (existingVisit) {
        if (existingVisit.referralCodeId !== valid.code.referralCodeId)
          throw new ReferralError('idempotency_conflict', 409);
        return existingVisit;
      }
      const [visit] = await tx
        .insert(referralVisits)
        .values({
          referralVisitId: requestId,
          anonymousVisitorId: visitorId,
          referralCodeId: valid.code.referralCodeId,
          locale,
          landingPath: `/${locale}`,
          expiresAt: new Date(Date.now() + REFERRAL_POLICY.attributionDays * 86400000),
        })
        .returning();
      await tx
        .update(referralCodes)
        .set({ firstVisitedAt: sql`coalesce(${referralCodes.firstVisitedAt}, now())` })
        .where(eq(referralCodes.referralCodeId, valid.code.referralCodeId));
      return visit;
    });
  },
  async assign(authorId: string, code: string, confirmed: boolean, visitId?: string) {
    return db.transaction(async (tx) => {
      await referralLock(tx, `customer:${authorId}`);
      const author = await assertCustomerEligible(tx, authorId);
      const current = await getActiveReferral(authorId, tx);
      if (current && visitId) return current.assignment;
      if (!confirmed && !visitId) throw new ReferralError('confirmation_required');
      const valid = await eligibleCode(referralCodeSchema.parse(code), tx);
      await referralLock(tx, `owner:${valid.owner.referralOwnerId}`);
      await eligibleCode(valid.code.code, tx);
      if (current?.code.referralCodeId === valid.code.referralCodeId) return current.assignment;
      if (visitId) {
        const [visit] = await tx
          .select()
          .from(referralVisits)
          .where(
            and(
              eq(referralVisits.referralVisitId, visitId),
              eq(referralVisits.referralCodeId, valid.code.referralCodeId),
              gt(referralVisits.expiresAt, new Date()),
              or(
                isNull(referralVisits.linkedAuthorId),
                eq(referralVisits.linkedAuthorId, authorId),
              ),
            ),
          )
          .for('update');
        if (!visit) throw new ReferralError('invalid_or_inactive_code');
      }
      if (current)
        await tx
          .update(referralAssignments)
          .set({ endedAt: new Date(), endedReason: 'changed' })
          .where(eq(referralAssignments.assignmentId, current.assignment.assignmentId));
      const [assignment] = await tx
        .insert(referralAssignments)
        .values({
          authorId,
          referralCodeId: valid.code.referralCodeId,
          source: visitId ? 'url' : 'manual',
          sourceVisitId: visitId,
          changedByActorType: 'customer',
          changedByActorId: authorId,
        })
        .returning();
      const reference = await customerReference(tx, authorId, valid.owner.referralOwnerId);
      if (visitId) {
        await tx
          .update(referralVisits)
          .set({ linkedAuthorId: authorId, linkedAt: new Date() })
          .where(eq(referralVisits.referralVisitId, visitId));
        await tx
          .insert(referralFunnelEvents)
          .values({
            referralOwnerId: valid.owner.referralOwnerId,
            assignmentId: assignment.assignmentId,
            customerReference: reference,
            eventType: 'registration',
            dedupeKey: `registration:${authorId}`,
            locale: author.preferredLocale,
            country: author.countryOfOrigin,
            newAccount: Date.now() - author.createdAt.getTime() < 300000,
          })
          .onConflictDoNothing();
      }
      await audit(
        tx,
        { type: 'customer', id: authorId, permissions: [] },
        assignment.assignmentId,
        current ? 'code_changed' : 'code_linked',
      );
      return assignment;
    });
  },
  async link(authorId: string, visitId: string, visitorId: string) {
    const [row] = await db
      .select({ code: referralCodes.code })
      .from(referralVisits)
      .innerJoin(referralCodes, eq(referralCodes.referralCodeId, referralVisits.referralCodeId))
      .where(
        and(
          eq(referralVisits.referralVisitId, visitId),
          eq(referralVisits.anonymousVisitorId, visitorId),
          gt(referralVisits.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.assign(authorId, row.code, false, visitId);
  },
};

export async function captureOrderReferral(
  tx: ReferralTransaction,
  order: { orderId: string; authorId: string; createdAt: Date },
) {
  await referralLock(tx, `customer:${order.authorId}`);
  const active = await getActiveReferral(order.authorId, tx);
  if (!active) return;
  await referralLock(tx, `owner:${active.owner.referralOwnerId}`);
  const [owner] = await tx
    .select()
    .from(referralOwners)
    .where(eq(referralOwners.referralOwnerId, active.owner.referralOwnerId));
  const mode = modeForOwner(active.owner.referralOwnerId);
  if (owner?.status !== 'active' || !mode) return;
  if (
    !active.code.active ||
    (active.code.validFrom && active.code.validFrom > new Date()) ||
    (active.code.validUntil && active.code.validUntil <= new Date())
  )
    return;
  let author;
  try {
    author = await assertCustomerEligible(tx, order.authorId);
  } catch (error) {
    if (error instanceof ReferralError && error.code === 'self_referral_not_allowed') return;
    throw error;
  }
  const [terms] = await tx
    .select()
    .from(referralTerms)
    .where(
      and(
        eq(referralTerms.referralOwnerId, owner.referralOwnerId),
        lte(referralTerms.effectiveFrom, order.createdAt),
        or(isNull(referralTerms.effectiveUntil), gt(referralTerms.effectiveUntil, order.createdAt)),
      ),
    )
    .limit(1);
  if (!terms) throw new ReferralError('missing_referral_terms', 409);
  const [prior] = await tx
    .select({ id: paymentOrders.orderId })
    .from(paymentOrders)
    .where(and(eq(paymentOrders.authorId, order.authorId), eq(paymentOrders.status, 'completed')))
    .limit(1);
  await tx
    .insert(referralSnapshots)
    .values({
      paymentOrderId: order.orderId,
      assignmentId: active.assignment.assignmentId,
      referralCodeId: active.code.referralCodeId,
      referralOwnerId: owner.referralOwnerId,
      termsVersionId: terms.termsVersionId,
      codeSnapshot: active.code.code,
      commissionRateBps: terms.commissionRateBps,
      attributionStartedAt: active.assignment.activatedAt,
      mode,
      customerReference: await customerReference(tx, order.authorId, owner.referralOwnerId),
      purchaseKind: prior ? 'repeat' : 'first',
      locale: author.preferredLocale,
      country: author.countryOfOrigin,
    })
    .onConflictDoNothing();
}

export async function accrueOrderCommission(
  tx: ReferralTransaction,
  orderId: string,
  completedAt: Date,
  amountTotal: number | null,
  currency: string,
) {
  const [snapshot] = await tx
    .select()
    .from(referralSnapshots)
    .where(eq(referralSnapshots.paymentOrderId, orderId));
  if (!snapshot) return;
  const [order] = await tx.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId));
  await referralLock(tx, `customer:${order.authorId}`);
  await referralLock(tx, `owner:${snapshot.referralOwnerId}`);
  const [priorPurchase] = await tx
    .select({ id: paymentOrders.orderId })
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.authorId, order.authorId),
        eq(paymentOrders.status, 'completed'),
        sql`${paymentOrders.orderId} <> ${orderId}::uuid`,
      ),
    )
    .limit(1);
  const valid =
    currency.toUpperCase() === 'EUR' &&
    amountTotal !== null &&
    Number.isSafeInteger(amountTotal) &&
    amountTotal >= 0;
  const amount = valid ? commissionCents(amountTotal!, snapshot.commissionRateBps) : null;
  const [commission] = await tx
    .insert(referralCommissions)
    .values({
      paymentOrderId: orderId,
      referralOwnerId: snapshot.referralOwnerId,
      customerAuthorId: order.authorId,
      customerReference: snapshot.customerReference,
      mode: snapshot.mode,
      purchaseKind: priorPurchase ? 'repeat' : 'first',
      grossAmountCents: valid ? amountTotal : null,
      commissionBasisCents: valid ? amountTotal : null,
      commissionRateBps: snapshot.commissionRateBps,
      originalCommissionCents: amount,
      netCommissionCents: amount ?? 0,
      status: valid ? 'pending' : 'blocked',
      reviewReason: valid ? null : 'missing_final_stripe_amount',
      holdUntil: new Date(completedAt.getTime() + REFERRAL_POLICY.holdDays * 86400000),
      reconciledAt: valid ? new Date() : null,
    })
    .onConflictDoNothing()
    .returning();
  if (!commission) return;
  if (amount !== null)
    await tx.insert(referralCommissionEvents).values({
      commissionId: commission.commissionId,
      eventType: 'accrued',
      signedAmountCents: amount,
      idempotencyKey: `commission:accrued:${orderId}`,
      actorType: 'stripe',
      occurredAt: completedAt,
    });
}

async function invalidateSettlements(tx: ReferralTransaction, ownerId: string, reason: string) {
  const pending = await tx
    .update(referralSettlements)
    .set({ status: 'cancelled', cancelledReason: reason })
    .where(
      and(
        eq(referralSettlements.referralOwnerId, ownerId),
        eq(referralSettlements.status, 'payable'),
      ),
    )
    .returning();
  for (const settlement of pending) {
    await tx
      .update(referralSettlementItems)
      .set({ releasedAt: new Date() })
      .where(eq(referralSettlementItems.settlementId, settlement.settlementId));
    await audit(tx, system, settlement.settlementId, 'settlement_invalidated', reason);
  }
  await tx
    .update(referralCommissions)
    .set({ status: 'approved', payableAt: null })
    .where(
      and(
        eq(referralCommissions.referralOwnerId, ownerId),
        eq(referralCommissions.status, 'payable'),
      ),
    );
}
export async function adjustProviderCommission(input: {
  orderId: string;
  eventId: string;
  objectId: string;
  refundedGross: number;
  lostDisputeGross: number;
  disputeOpen: boolean;
}) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.paymentOrderId, input.orderId));
    if (!initial) {
      const [snapshot] = await tx
        .select()
        .from(referralSnapshots)
        .where(eq(referralSnapshots.paymentOrderId, input.orderId));
      if (snapshot) throw new ReferralError('commission_not_accrued', 409);
      return;
    }
    await referralLock(tx, `owner:${initial.referralOwnerId}`);
    const [c] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.commissionId, initial.commissionId))
      .for('update');
    if (c.originalCommissionCents === null || c.grossAmountCents === null)
      throw new ReferralError('commission_not_valued', 409);
    const [already] = await tx
      .select()
      .from(referralCommissionEvents)
      .where(
        eq(referralCommissionEvents.idempotencyKey, `provider:${input.eventId}:${c.commissionId}`),
      );
    if (already) return;
    // A dispute covers the unrefunded charge exposure; cap the combined loss at the charge.
    const refunded = Math.max(c.refundedGrossCents, input.refundedGross);
    const exposure = Math.min(c.grossAmountCents, refunded + input.lostDisputeGross);
    const target = cumulativeReversalCents(c.originalCommissionCents, c.grossAmountCents, exposure);
    const delta = c.status === 'cancelled' ? 0 : c.reversedCents - target;
    const nextStatus =
      c.status === 'cancelled'
        ? 'cancelled'
        : c.paidAt
          ? 'paid'
          : target === c.originalCommissionCents && target > 0
            ? 'reversed'
            : c.approvedAt
              ? 'approved'
              : 'pending';
    await tx.insert(referralCommissionEvents).values({
      commissionId: c.commissionId,
      eventType:
        delta > 0
          ? 'dispute_reinstatement'
          : delta < 0
            ? input.lostDisputeGross
              ? 'dispute_reversal'
              : 'refund_reversal'
            : input.disputeOpen
              ? 'dispute_hold'
              : 'dispute_reinstatement',
      signedAmountCents: delta,
      idempotencyKey: `provider:${input.eventId}:${c.commissionId}`,
      providerEventId: input.eventId,
      providerObjectId: input.objectId,
      actorType: 'stripe',
      previousStatus: c.status,
      newStatus: nextStatus,
    });
    await tx
      .update(referralCommissions)
      .set({
        refundedGrossCents: refunded,
        disputedGrossCents: input.lostDisputeGross,
        reversedCents: target,
        disputeOpen: input.disputeOpen,
        netCommissionCents: sql`${referralCommissions.netCommissionCents} + ${delta}`,
        status: nextStatus,
        reconciledAt: null,
      })
      .where(eq(referralCommissions.commissionId, c.commissionId));
    if (delta || input.disputeOpen !== c.disputeOpen)
      await invalidateSettlements(tx, c.referralOwnerId, 'provider_adjustment');
  });
}

export async function reviewCommission(
  id: string,
  action: 'hold' | 'release' | 'cancel',
  reason: string,
  actor: ReferralActor,
) {
  requireReferralPermission(actor, 'referrals:review');
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.commissionId, id));
    if (!initial) throw new ReferralError('not_found', 404);
    await referralLock(tx, `owner:${initial.referralOwnerId}`);
    const [c] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.commissionId, id))
      .for('update');
    if (action === 'cancel' && (c.paidAt || c.status === 'cancelled'))
      throw new ReferralError('use_adjustment', 409);
    const delta = action === 'cancel' ? -c.netCommissionCents : 0;
    await tx.insert(referralCommissionEvents).values({
      commissionId: id,
      eventType: action === 'cancel' ? 'cancelled' : 'review',
      signedAmountCents: delta,
      idempotencyKey: `review:${randomUUID()}`,
      actorType: actor.type,
      actorId: actor.id,
      reason,
    });
    await tx
      .update(referralCommissions)
      .set({
        reviewReason: action === 'release' ? null : reason,
        ...(action === 'cancel' ? { status: 'cancelled', netCommissionCents: 0 } : {}),
      })
      .where(eq(referralCommissions.commissionId, id));
    await invalidateSettlements(tx, c.referralOwnerId, 'commission_review');
    await audit(tx, actor, id, `commission_${action}`, reason);
  });
}
export async function manualCommissionAdjustment(
  id: string,
  amount: number,
  reason: string,
  key: string,
  actor: ReferralActor,
) {
  requireReferralPermission(actor, 'referrals:review');
  return db.transaction(async (tx) => {
    const [c] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.commissionId, id));
    if (!c || c.originalCommissionCents === null)
      throw new ReferralError('commission_not_valued', 409);
    await referralLock(tx, `owner:${c.referralOwnerId}`);
    const [existing] = await tx
      .select()
      .from(referralCommissionEvents)
      .where(eq(referralCommissionEvents.idempotencyKey, `adjust:${key}`));
    if (existing) {
      if (
        existing.commissionId !== id ||
        existing.signedAmountCents !== amount ||
        existing.reason !== reason
      )
        throw new ReferralError('idempotency_conflict', 409);
      return existing;
    }
    const [current] = await tx
      .select({ status: referralCommissions.status })
      .from(referralCommissions)
      .where(eq(referralCommissions.commissionId, id));
    if (current.status === 'cancelled') throw new ReferralError('commission_cancelled', 409);
    const [event] = await tx
      .insert(referralCommissionEvents)
      .values({
        commissionId: id,
        eventType: 'manual_adjustment',
        signedAmountCents: amount,
        idempotencyKey: `adjust:${key}`,
        actorType: actor.type,
        actorId: actor.id,
        reason,
      })
      .returning();
    await tx
      .update(referralCommissions)
      .set({ netCommissionCents: sql`${referralCommissions.netCommissionCents} + ${amount}` })
      .where(eq(referralCommissions.commissionId, id));
    await invalidateSettlements(tx, c.referralOwnerId, 'manual_adjustment');
    await audit(tx, actor, id, 'commission_adjusted', reason);
    return event;
  });
}

export async function matureCommissions(now = new Date()) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.status, 'pending'),
          lte(referralCommissions.holdUntil, now),
          isNull(referralCommissions.reviewReason),
          eq(referralCommissions.disputeOpen, false),
          sql`${referralCommissions.reconciledAt} >= ${now}::timestamptz - interval '48 hours'`,
        ),
      )
      .for('update', { skipLocked: true });
    for (const c of rows) {
      await tx
        .update(referralCommissions)
        .set({ status: 'approved', approvedAt: now })
        .where(eq(referralCommissions.commissionId, c.commissionId));
      await tx
        .insert(referralCommissionEvents)
        .values({
          commissionId: c.commissionId,
          eventType: 'approved',
          signedAmountCents: 0,
          idempotencyKey: `approved:${c.commissionId}`,
          actorType: 'system',
          occurredAt: now,
        })
        .onConflictDoNothing();
    }
    return rows.length;
  });
}

// Reporting/locking SQL deliberately lives in this service, not in route handlers.
async function settlementCandidates(tx: Executor, ownerId: string, cutoff: Date) {
  const result = await tx.execute<{
    commission_event_id: string;
    commission_id: string;
    signed_amount_cents: number;
  }>(sql`
    select e.commission_event_id, e.commission_id, e.signed_amount_cents
    from referral_commission_events e join referral_commissions c using (commission_id)
    where c.referral_owner_id = ${ownerId}::uuid and c.mode = 'live'
      and c.status in ('approved','payable','paid','reversed')
      and c.hold_until <= ${cutoff} and (e.occurred_at <= ${cutoff} or e.signed_amount_cents < 0)
      and c.review_reason is null and not c.dispute_open
      and c.reconciled_at >= now() - interval '48 hours'
      and e.signed_amount_cents <> 0
      and not exists (select 1 from referral_settlement_items i where i.commission_event_id=e.commission_event_id and i.released_at is null)
    order by e.occurred_at, e.commission_event_id`);
  return result.rows;
}
export async function previewSettlement(ownerId: string, cutoff: Date) {
  const rows = await settlementCandidates(db, ownerId, cutoff);
  const netPaymentCents = rows.reduce((sum, row) => sum + row.signed_amount_cents, 0);
  const [held] = await db
    .select({ id: referralCommissions.commissionId })
    .from(referralCommissions)
    .where(
      and(
        eq(referralCommissions.referralOwnerId, ownerId),
        eq(referralCommissions.mode, 'live'),
        sql`${referralCommissions.paidAt} is not null`,
        or(
          eq(referralCommissions.disputeOpen, true),
          sql`${referralCommissions.reviewReason} is not null`,
          sql`${referralCommissions.reconciledAt} is null or ${referralCommissions.reconciledAt} < now() - interval '48 hours'`,
        ),
      ),
    )
    .limit(1);
  return {
    items: rows,
    netPaymentCents,
    eligible: netPaymentCents >= REFERRAL_POLICY.minimumPaymentCents && !held,
    heldPaidExposure: !!held,
  };
}
export async function createSettlement(
  ownerId: string,
  periodStart: Date,
  periodEnd: Date,
  actor: ReferralActor,
) {
  requireReferralPermission(actor, 'referrals:settle');
  if (periodEnd > new Date() || periodStart >= periodEnd) throw new ReferralError('invalid_period');
  return db.transaction(async (tx) => {
    await referralLock(tx, `owner:${ownerId}`);
    const [existing] = await tx
      .select()
      .from(referralSettlements)
      .where(
        and(
          eq(referralSettlements.referralOwnerId, ownerId),
          eq(referralSettlements.periodEnd, periodEnd),
          sql`${referralSettlements.status} <> 'cancelled'`,
        ),
      );
    if (existing) return existing;
    const [held] = await tx
      .select({ id: referralCommissions.commissionId })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referralOwnerId, ownerId),
          eq(referralCommissions.mode, 'live'),
          sql`${referralCommissions.paidAt} is not null`,
          or(
            eq(referralCommissions.disputeOpen, true),
            sql`${referralCommissions.reviewReason} is not null`,
            sql`${referralCommissions.reconciledAt} is null or ${referralCommissions.reconciledAt} < now() - interval '48 hours'`,
          ),
        ),
      )
      .limit(1);
    if (held) throw new ReferralError('held_paid_exposure', 409);
    const rows = await settlementCandidates(tx, ownerId, periodEnd);
    const gross = rows.reduce((sum, row) => sum + Math.max(0, row.signed_amount_cents), 0);
    const adjustments = rows.reduce((sum, row) => sum + Math.min(0, row.signed_amount_cents), 0);
    if (gross + adjustments < REFERRAL_POLICY.minimumPaymentCents)
      throw new ReferralError('below_payment_minimum', 409);
    const [settlement] = await tx
      .insert(referralSettlements)
      .values({
        referralOwnerId: ownerId,
        periodStart,
        periodEnd,
        grossCommissionCents: gross,
        adjustmentsCents: adjustments,
        netPaymentCents: gross + adjustments,
        createdBy: actor.id,
      })
      .returning();
    for (const row of rows) {
      await tx.insert(referralSettlementItems).values({
        settlementId: settlement.settlementId,
        commissionEventId: row.commission_event_id,
        signedAmountCents: row.signed_amount_cents,
      });
      await tx
        .update(referralCommissions)
        .set({ status: 'payable', payableAt: new Date() })
        .where(
          and(
            eq(referralCommissions.commissionId, row.commission_id),
            isNull(referralCommissions.paidAt),
          ),
        );
      await tx
        .insert(referralCommissionEvents)
        .values({
          commissionId: row.commission_id,
          eventType: 'became_payable',
          signedAmountCents: 0,
          idempotencyKey: `payable:${settlement.settlementId}:${row.commission_id}`,
          settlementId: settlement.settlementId,
          actorType: actor.type,
          actorId: actor.id,
        })
        .onConflictDoNothing();
    }
    await audit(tx, actor, settlement.settlementId, 'settlement_created');
    await enqueue(tx, 'referral-statement', `statement:${settlement.settlementId}`, {
      settlementId: settlement.settlementId,
    });
    return settlement;
  });
}
export async function markSettlementPaid(
  id: string,
  amount: number,
  reference: string,
  paidAt: Date,
  actor: ReferralActor,
) {
  requireReferralPermission(actor, 'referrals:settle');
  if (paidAt > new Date()) throw new ReferralError('payment_date_in_future');
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(referralSettlements)
      .where(eq(referralSettlements.settlementId, id));
    if (!initial) throw new ReferralError('not_found', 404);
    await referralLock(tx, `owner:${initial.referralOwnerId}`);
    const [s] = await tx
      .select()
      .from(referralSettlements)
      .where(eq(referralSettlements.settlementId, id))
      .for('update');
    if (s.status === 'paid') {
      if (
        s.netPaymentCents !== amount ||
        s.externalPaymentReference !== reference ||
        s.paidAt?.getTime() !== paidAt.getTime()
      )
        throw new ReferralError('idempotency_conflict', 409);
      return s;
    }
    if (s.status !== 'payable' || amount !== s.netPaymentCents || paidAt < s.createdAt)
      throw new ReferralError('invalid_settlement_payment', 409);
    const invalid = await tx.execute(
      sql`select count(*)::int as count from referral_settlement_items i join referral_commission_events e using(commission_event_id) join referral_commissions c using(commission_id) where i.settlement_id=${id}::uuid and i.released_at is null and (c.dispute_open or c.review_reason is not null or c.reconciled_at is null or c.reconciled_at < now() - interval '48 hours')`,
    );
    if (Number(invalid.rows[0]?.count))
      throw new ReferralError('settlement_requires_reconciliation', 409);
    const items = await tx.execute<{ commission_id: string }>(
      sql`select distinct e.commission_id from referral_settlement_items i join referral_commission_events e using (commission_event_id) where i.settlement_id=${id}::uuid and i.released_at is null`,
    );
    for (const item of items.rows) {
      await tx
        .update(referralCommissions)
        .set({ status: 'paid', paidAt })
        .where(eq(referralCommissions.commissionId, item.commission_id));
      await tx.insert(referralCommissionEvents).values({
        commissionId: item.commission_id,
        eventType: 'paid',
        signedAmountCents: 0,
        idempotencyKey: `paid:${id}:${item.commission_id}`,
        settlementId: id,
        actorType: actor.type,
        actorId: actor.id,
        occurredAt: paidAt,
      });
    }
    const [updated] = await tx
      .update(referralSettlements)
      .set({ status: 'paid', paidAt, externalPaymentReference: reference })
      .where(eq(referralSettlements.settlementId, id))
      .returning();
    await audit(tx, actor, id, 'settlement_paid', reference);
    await enqueue(tx, 'referral-payment-confirmation', `paid:${id}`, { settlementId: id });
    return updated;
  });
}
