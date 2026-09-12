/** Explicit Stripe sandbox integration; rejects live Stripe keys and nonlocal databases. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import Stripe from 'stripe';

async function main() {
  config({ path: '.env.local', quiet: true });
  assert(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'), 'Stripe sandbox key required');
  const url = new URL(process.env.REFERRAL_TEST_DATABASE_URL || '');
  assert(
    ['127.0.0.1', 'localhost'].includes(url.hostname) &&
      url.port === '55439' &&
      url.pathname.startsWith('/referral_test'),
    'Isolated referral database required',
  );
  Object.assign(process.env, {
    DATABASE_URL: url.toString(),
    DB_PASSWORD: url.password,
    NODE_ENV: 'development',
    REFERRAL_PROGRAM_ENABLED: 'true',
    REFERRAL_COMMISSION_ENABLED: 'true',
    REFERRAL_MODE: 'shadow',
  });
  const { db } = await import('../src/db');
  const { authors, paymentOrders, creditLedger } = await import('../src/db/schema');
  const { referralCommissions } = await import('../src/db/schema/referrals');
  const { referralService, captureOrderReferral } = await import('../src/db/services/referrals');
  const { eq } = await import('drizzle-orm');
  const { notificationClient } = await import('../src/lib/notifications/client');
  const { fiscalDocumentService } = await import('../src/db/services/fiscal-documents');
  const { paymentService, getStripeClient } = await import('../src/db/services/payment');
  notificationClient.sendCreditsAddedNotification = async () => ({ success: true });
  fiscalDocumentService.issueForCompletedStripeOrder = async () => null;
  fiscalDocumentService.recordFiscalEventForOrder = async () => undefined;
  const stripe = getStripeClient();
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const actor = {
    type: 'admin_ui' as const,
    id: 'stripe-sandbox-fixture',
    permissions: ['referrals:view', 'referrals:manage'] as Array<
      'referrals:view' | 'referrals:manage'
    >,
  };
  await referralService.createOwner(
    {
      displayName: 'Sandbox fixture',
      contactEmail: 'sandbox@example.invalid',
      code: 'STRIPE_' + suffix,
      memberEmails: ['sandbox@example.invalid'],
    },
    actor,
  );
  const [author] = await db
    .insert(authors)
    .values({
      clerkUserId: randomUUID(),
      displayName: 'Sandbox fixture',
      email: `${suffix}@example.invalid`,
      preferredLocale: 'en-US',
    })
    .returning();
  await referralService.assign(author.authorId, 'STRIPE_' + suffix, true);
  const [order] = await db
    .insert(paymentOrders)
    .values({
      authorId: author.authorId,
      amount: 4000,
      currency: 'eur',
      provider: 'stripe',
      creditBundle: { credits: 100, price: 4000 },
    })
    .returning();
  await db.transaction((tx) => captureOrderReferral(tx, order));
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: 4000,
          product_data: { name: 'Referral sandbox fixture' },
        },
        quantity: 1,
      },
    ],
    success_url: 'https://example.invalid/success',
    cancel_url: 'https://example.invalid/cancel',
    metadata: { mythoriaOrderId: order.orderId },
  });
  assert.equal(checkout.amount_total, 4000);
  const intent = await stripe.paymentIntents.create({
    amount: 4000,
    currency: 'eur',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { mythoriaOrderId: order.orderId },
  });
  assert.equal(intent.status, 'succeeded');
  await db
    .update(paymentOrders)
    .set({
      providerOrderId: checkout.id,
      providerPublicId: intent.id,
      metadata: {
        stripe: {
          checkoutSessionId: checkout.id,
          paymentIntentId: intent.id,
          amountTotal: checkout.amount_total,
        },
      },
    })
    .where(eq(paymentOrders.orderId, order.orderId));
  const signingSecret = 'sandbox-signature-fixture';
  const event = (type: string, object: unknown, id: string) => {
    const payload = JSON.stringify({
      id,
      object: 'event',
      type,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    return stripe.webhooks.constructEvent(payload, signature, signingSecret);
  };
  const succeeded = event('payment_intent.succeeded', intent, 'evt_fixture_' + suffix);
  assert.equal((await paymentService.processStripeWebhook(succeeded)).success, true);
  assert.equal((await paymentService.processStripeWebhook(succeeded)).success, true);
  // A separately paid intent must not complete an unpaid hosted Checkout Session.
  assert.equal(
    (await db.select().from(creditLedger).where(eq(creditLedger.purchaseId, order.orderId))).length,
    0,
  );
  // Exercise the domain transaction separately. This is a fixture, not hosted Checkout E2E.
  const [fixtureOrder] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.orderId, order.orderId));
  await Promise.all([
    paymentService.completeOrder(fixtureOrder, { source: 'stripe' }),
    paymentService.completeOrder(fixtureOrder, { source: 'stripe' }),
  ]);
  const [commission] = await db
    .select()
    .from(referralCommissions)
    .where(eq(referralCommissions.paymentOrderId, order.orderId));
  assert.equal(commission.originalCommissionCents, 400);
  assert.equal(
    (await db.select().from(creditLedger).where(eq(creditLedger.purchaseId, order.orderId))).length,
    1,
  );
  await stripe.refunds.create({ payment_intent: intent.id, amount: 1000 });
  const chargeId =
    typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge!.id;
  const charge = await stripe.charges.retrieve(chargeId);
  const refunded = event('charge.refunded', charge, 'evt_refund_fixture_' + suffix);
  assert.equal((await paymentService.processStripeWebhook(refunded)).success, true);
  assert.equal((await paymentService.processStripeWebhook(refunded)).success, true);
  const [partial] = await db
    .select()
    .from(referralCommissions)
    .where(eq(referralCommissions.paymentOrderId, order.orderId));
  assert.equal(partial.netCommissionCents, 300);
  await stripe.refunds.create({ payment_intent: intent.id, amount: 3000 });
  await paymentService.reconcileReferralCharge(chargeId, 'full_refund_fixture_' + suffix);
  const [full] = await db
    .select()
    .from(referralCommissions)
    .where(eq(referralCommissions.paymentOrderId, order.orderId));
  assert.equal(full.netCommissionCents, 0);
  await stripe.checkout.sessions.expire(checkout.id);
  console.info(
    'Stripe sandbox passed: unpaid Checkout safety, successful separate test PaymentIntent, signed local webhook replay, fixture domain completion with exactly-once credits/commission, partial/full provider refunds. Hosted Checkout completion and external delivery remain separate tests.',
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Sandbox test failed');
    process.exit(1);
  });
