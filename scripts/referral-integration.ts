/** Isolated PostgreSQL integration suite. Never loads dotenv or accepts remote DBs. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main() {
  const url = new URL(process.env.REFERRAL_TEST_DATABASE_URL || '');
  assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Test database must be loopback');
  assert(url.pathname.startsWith('/referral_test'), 'Test database must have referral_test prefix');
  assert(url.port === '55439', 'Use the isolated referral PostgreSQL cluster on port 55439');
  process.env.DATABASE_URL = url.toString();
  process.env.DB_PASSWORD = url.password;
  Object.assign(process.env, { NODE_ENV: 'development' });
  process.env.REFERRAL_PROGRAM_ENABLED = 'true';
  process.env.REFERRAL_COMMISSION_ENABLED = 'true';
  process.env.REFERRAL_MODE = 'shadow';
  const { db } = await import('../src/db');
  const { sql, eq } = await import('drizzle-orm');
  const { authors, paymentOrders, stories } = await import('../src/db/schema');
  const tables = await import('../src/db/schema/referrals');
  const {
    referralService,
    captureOrderReferral,
    accrueOrderCommission,
    adjustProviderCommission,
    matureCommissions,
    createSettlement,
    markSettlementPaid,
    manualCommissionAdjustment,
    reviewCommission,
  } = await import('../src/db/services/referrals');
  const actor = {
    type: 'admin_ui' as const,
    id: 'local-integration',
    permissions: [
      'referrals:view',
      'referrals:manage',
      'referrals:review',
      'referrals:settle',
    ] as const,
  };
  const admin = { ...actor, permissions: [...actor.permissions] };
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const owner = await referralService.createOwner(
    {
      displayName: 'Fixture',
      contactEmail: 'fixture@example.invalid',
      code: 'TEST_' + suffix,
      memberEmails: ['partner@example.invalid'],
    },
    admin,
  );
  const second = await referralService.createOwner(
    {
      displayName: 'Other',
      contactEmail: 'other@example.invalid',
      code: 'OTHER_' + suffix,
      memberEmails: ['other@example.invalid'],
    },
    admin,
  );
  const [author] = await db
    .insert(authors)
    .values({
      clerkUserId: randomUUID(),
      email: `${suffix}@example.invalid`,
      displayName: 'Fixture',
      preferredLocale: 'en-US',
    })
    .returning();
  const code = 'TEST_' + suffix;
  const visit = await referralService.capture(code, randomUUID(), 'en-US');
  await referralService.assign(author.authorId, code, false, visit.referralVisitId);
  await assert.rejects(
    referralService.updateOwner(owner.referralOwnerId, { code: 'RENAMED_' + suffix }, admin),
  );
  await assert.rejects(
    referralService.createOwner(
      {
        displayName: 'Duplicate',
        contactEmail: 'duplicate@example.invalid',
        code,
        memberEmails: ['new@example.invalid'],
      },
      admin,
    ),
  );
  const older = new Date(Date.now() - 40 * 86400000);
  const makeOrder = async (amount: number, mode: 'shadow' | 'live' = 'live') => {
    process.env.REFERRAL_MODE = mode;
    process.env.REFERRAL_PILOT_OWNER_IDS = owner.referralOwnerId;
    const [order] = await db
      .insert(paymentOrders)
      .values({
        authorId: author.authorId,
        amount,
        currency: 'eur',
        provider: 'stripe',
        creditBundle: { credits: 100, price: amount },
      })
      .returning();
    await db.transaction(async (tx) => {
      await captureOrderReferral(tx, order);
    });
    return order;
  };
  const order = await makeOrder(40000);
  await referralService.assign(author.authorId, 'OTHER_' + suffix, true);
  await Promise.all(
    Array.from({ length: 8 }, () =>
      db.transaction((tx) => accrueOrderCommission(tx, order.orderId, older, 40000, 'eur')),
    ),
  );
  const [commission] = await db
    .select()
    .from(tables.referralCommissions)
    .where(eq(tables.referralCommissions.paymentOrderId, order.orderId));
  assert.equal(commission.originalCommissionCents, 4000);
  assert.equal(commission.referralOwnerId, owner.referralOwnerId);
  await assert.rejects(
    db.execute(
      sql`update referral_commission_events set signed_amount_cents=1 where commission_id=${commission.commissionId}::uuid`,
    ),
  );
  await assert.rejects(
    db.execute(sql`delete from payment_orders where order_id=${order.orderId}::uuid`),
  );
  await assert.rejects(
    db.execute(
      sql`update payment_order_referral_snapshots set commission_rate_bps=9999 where payment_order_id=${order.orderId}::uuid`,
    ),
  );
  await assert.rejects(
    db.execute(
      sql`insert into referral_terms_versions(referral_owner_id,commission_rate_bps,effective_from,program_policy_version,created_by_actor_type,created_by_actor_id) values(${owner.referralOwnerId}::uuid,1500,now(),'test','system','fixture')`,
    ),
  );
  await matureCommissions();
  const start = new Date(Date.now() - 60 * 86400000),
    end = new Date();
  const settlements = await Promise.all(
    Array.from({ length: 5 }, () => createSettlement(owner.referralOwnerId, start, end, admin)),
  );
  assert.equal(new Set(settlements.map((s) => s.settlementId)).size, 1);
  const settlement = settlements[0];
  assert.equal(settlement.netPaymentCents, 4000);
  const { referralStatement } = await import('../src/db/services/referral-reporting');
  const privateStatement = await referralStatement(owner.referralOwnerId, settlement.settlementId);
  assert.equal(
    privateStatement.items.reduce((sum, item) => sum + Number(item.signed_amount_cents), 0),
    4000,
  );
  await assert.rejects(
    referralStatement(second.referralOwnerId, settlement.settlementId),
    /not_found/,
  );
  // WSL and Windows clocks can differ slightly; wait for the persisted creation time.
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, settlement.createdAt.getTime() - Date.now() + 100)),
  );
  const paidAt = new Date();
  await markSettlementPaid(settlement.settlementId, 4000, 'fixture-bank', paidAt, admin);
  await markSettlementPaid(settlement.settlementId, 4000, 'fixture-bank', paidAt, admin);
  await assert.rejects(
    markSettlementPaid(settlement.settlementId, 4000, 'different-bank', paidAt, admin),
  );
  const refund = {
    orderId: order.orderId,
    eventId: 'evt_' + suffix,
    objectId: 'ch_' + suffix,
    refundedGross: 10000,
    lostDisputeGross: 0,
    disputeOpen: false,
  };
  await Promise.all(Array.from({ length: 5 }, () => adjustProviderCommission(refund)));
  const [reversed] = await db
    .select()
    .from(tables.referralCommissions)
    .where(eq(tables.referralCommissions.commissionId, commission.commissionId));
  assert.equal(reversed.netCommissionCents, 3000);
  assert.equal(reversed.reversedCents, 1000);
  assert.equal(reversed.status, 'paid');
  await assert.rejects(
    createSettlement(owner.referralOwnerId, start, new Date(), admin),
    /held_paid_exposure/,
  );
  // Simulate a completed independent provider/ledger/fiscal reconciliation.
  await db
    .update(tables.referralCommissions)
    .set({ reconciledAt: new Date() })
    .where(eq(tables.referralCommissions.commissionId, commission.commissionId));
  await assert.rejects(
    createSettlement(owner.referralOwnerId, start, new Date(), admin),
    /below_payment_minimum/,
  );
  const key = randomUUID();
  await manualCommissionAdjustment(commission.commissionId, 500, 'Fixture correction', key, admin);
  await manualCommissionAdjustment(commission.commissionId, 500, 'Fixture correction', key, admin);
  await assert.rejects(
    manualCommissionAdjustment(commission.commissionId, 600, 'Fixture correction', key, admin),
  );
  await referralService.assign(author.authorId, code, true);
  const pending = await makeOrder(50000);
  await assert.rejects(
    adjustProviderCommission({ ...refund, orderId: pending.orderId, eventId: 'early_' + suffix }),
    /commission_not_accrued/,
  );
  await db.transaction((tx) => accrueOrderCommission(tx, pending.orderId, older, null, 'eur'));
  const [blocked] = await db
    .select()
    .from(tables.referralCommissions)
    .where(eq(tables.referralCommissions.paymentOrderId, pending.orderId));
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.originalCommissionCents, null);
  const [assignment] = await db
    .select()
    .from(tables.referralAssignments)
    .where(sql`author_id=${author.authorId}::uuid and ended_at is null`);
  const [story] = await db
    .insert(stories)
    .values({
      authorId: author.authorId,
      title: 'Private fixture',
      referralOwnerId: owner.referralOwnerId,
      referralAssignmentId: assignment.assignmentId,
      referralCodeSnapshot: code,
    })
    .returning();
  await db
    .update(stories)
    .set({ publishedAt: new Date() })
    .where(eq(stories.storyId, story.storyId));
  await db.execute(
    sql`select record_referral_story_event(${story.storyId}::uuid,'story_generated',now())`,
  );
  await db.execute(
    sql`select record_referral_story_event(${story.storyId}::uuid,'story_generated',now())`,
  );
  const events = await db
    .select()
    .from(tables.referralFunnelEvents)
    .where(sql`dedupe_key like ${'%:' + story.storyId}`);
  assert.equal(events.length, 3);
  await assert.rejects(
    db
      .update(stories)
      .set({ referralCodeSnapshot: 'FORGED' })
      .where(eq(stories.storyId, story.storyId)),
  );
  const extra = await makeOrder(60000);
  await db.transaction((tx) => accrueOrderCommission(tx, extra.orderId, older, 60000, 'eur'));
  const shadow = await makeOrder(90000, 'shadow');
  await db.transaction((tx) => accrueOrderCommission(tx, shadow.orderId, older, 90000, 'eur'));
  await matureCommissions();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const cutoff = new Date();
  const carried = await createSettlement(owner.referralOwnerId, start, cutoff, admin);
  assert.equal(
    carried.netPaymentCents,
    5500,
    'Paid refund debt carries forward; shadow accrual never pays',
  );
  await adjustProviderCommission({ ...refund, orderId: extra.orderId, eventId: 'late_' + suffix });
  const [cancelled] = await db
    .select()
    .from(tables.referralSettlements)
    .where(eq(tables.referralSettlements.settlementId, carried.settlementId));
  assert.equal(cancelled.status, 'cancelled');
  await db
    .update(tables.referralCommissions)
    .set({ reconciledAt: new Date() })
    .where(eq(tables.referralCommissions.paymentOrderId, extra.orderId));
  const corrected = await createSettlement(owner.referralOwnerId, start, cutoff, admin);
  assert.equal(
    corrected.netPaymentCents,
    4500,
    'A late refund reduces the replacement statement despite its earlier cutoff',
  );
  const cancelledOrder = await makeOrder(1000);
  await db.transaction((tx) =>
    accrueOrderCommission(tx, cancelledOrder.orderId, older, 1000, 'eur'),
  );
  const [cancelledCommission] = await db
    .select()
    .from(tables.referralCommissions)
    .where(eq(tables.referralCommissions.paymentOrderId, cancelledOrder.orderId));
  await reviewCommission(cancelledCommission.commissionId, 'cancel', 'Fixture cancellation', admin);
  await assert.rejects(
    manualCommissionAdjustment(
      cancelledCommission.commissionId,
      100,
      'Invalid revival',
      randomUUID(),
      admin,
    ),
    /commission_cancelled/,
  );
  await referralService.setStatus(owner.referralOwnerId, 'suspended', 'Fixture suspension', admin);
  const noSnapshot = await makeOrder(1000);
  const snapshots = await db
    .select()
    .from(tables.referralSnapshots)
    .where(eq(tables.referralSnapshots.paymentOrderId, noSnapshot.orderId));
  assert.equal(snapshots.length, 0);
  await assert.rejects(db.delete(authors).where(eq(authors.authorId, author.authorId)));
  assert(second.referralOwnerId);
  console.info(
    'Referral integration passed: concurrency, immutable snapshots/ledger, prospective changes, settlement/payment idempotency, refund carryover, blocked totals, funnel dedupe, suspension and retention.',
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
