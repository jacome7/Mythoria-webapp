import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsAttributions,
  analyticsOutbox,
  authors,
  creationDraftOpens,
  creationObservations,
  paymentEvents,
  paymentOrders,
  qualifiedShareOpens,
  shareFirstPayments,
  stories,
} from '@/db/schema';
import { buildCreationObservation } from '@/lib/growth/creation';
import {
  linkGrowthRecipient,
  reconcileShareFirstPayments,
  revokeGrowthMeasurement,
  saveCreationObservation,
  snapshotShareFirstPayment,
} from '@/lib/growth/measurement-server';

async function verifyGrowth() {
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.match(process.env.DB_NAME || '', /^mythoria_growth_\w+_test$/);
  assert.equal(process.env.DATABASE_URL, undefined);
  assert.equal(process.env.GROWTH_MEASUREMENT_V2_ENABLED, 'true');
  const [sender1, sender2, newcomer, existingBuyer, early, expired, lateLink] = await db
    .insert(authors)
    .values(
      Array.from({ length: 7 }, () => ({
        clerkUserId: `fixture_${randomUUID()}`,
        email: `${randomUUID()}@fixture.invalid`,
        displayName: 'Fixture',
      })),
    )
    .returning();
  const [story1, story2] = await db
    .insert(stories)
    .values([
      { title: 'First fixture', authorId: sender1.authorId },
      { title: 'Second fixture', authorId: sender2.authorId },
    ])
    .returning();
  const [oneBrowser, anotherBrowser, selfBrowser, priorBrowser, earlyBrowser, expiredBrowser] =
    await db
      .insert(analyticsAttributions)
      .values(
        Array.from({ length: 6 }, () => ({
          clientId: `fp.${randomUUID()}`,
          consent: {
            analyticsStorage: 'granted' as const,
            adUserData: 'denied' as const,
            adPersonalization: 'denied' as const,
          },
          expiresAt: new Date(Date.now() + 60_000),
        })),
      )
      .returning();
  const openedAt = new Date(Date.now() - 1_000);
  const openedEarlier = new Date(openedAt.getTime() - 1_000);
  const open = (storyId: string, receiptId: string, at: Date, authorId?: string) =>
    db
      .insert(qualifiedShareOpens)
      .values({ storyId, receiptId, openedAt: at, authorId, method: 'copy_link', scope: 'public' })
      .onConflictDoNothing();
  await Promise.all([
    open(story1.storyId, oneBrowser.attributionId, openedEarlier),
    open(story1.storyId, oneBrowser.attributionId, openedEarlier),
    open(story2.storyId, oneBrowser.attributionId, openedAt),
    open(story1.storyId, anotherBrowser.attributionId, openedAt),
    open(story2.storyId, selfBrowser.attributionId, openedAt),
    open(story2.storyId, priorBrowser.attributionId, openedAt, existingBuyer.authorId),
    open(story2.storyId, earlyBrowser.attributionId, openedAt, early.authorId),
    open(
      story2.storyId,
      expiredBrowser.attributionId,
      new Date(openedAt.getTime() - 31 * 86_400_000),
      expired.authorId,
    ),
  ]);
  await linkGrowthRecipient(oneBrowser.attributionId, newcomer.authorId);
  await linkGrowthRecipient(selfBrowser.attributionId, sender2.authorId);
  assert.equal((await db.select().from(qualifiedShareOpens)).length, 6);

  const order = async (
    authorId: string,
    at: Date,
    amount: number,
    stripe?: { amountTotal: number; livemode: boolean },
  ) =>
    db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(paymentOrders)
        .values({
          authorId,
          amount,
          currency: 'eur',
          provider: 'stripe',
          status: 'completed',
          completedAt: at,
          metadata: stripe ? { stripe } : undefined,
          creditBundle: { credits: amount / 100, price: amount / 100 },
        })
        .returning();
      await snapshotShareFirstPayment(tx, payment.orderId);
      await snapshotShareFirstPayment(tx, payment.orderId);
      return payment;
    });
  await order(existingBuyer.authorId, new Date(openedEarlier.getTime() - 1), 1_000);
  await order(existingBuyer.authorId, new Date(), 1_500);
  await order(early.authorId, openedEarlier, 1_000);
  await order(expired.authorId, new Date(), 1_000);
  await order(newcomer.authorId, openedEarlier, 500, { amountTotal: 0, livemode: true });
  await order(newcomer.authorId, openedEarlier, 500, { amountTotal: 500, livemode: false });
  const first = await order(newcomer.authorId, new Date(), 1_700);
  await order(newcomer.authorId, new Date(), 900);
  const [attributed, ...other] = await db.select().from(shareFirstPayments);
  assert.equal(other.length, 0);
  assert.equal(attributed.orderId, first.orderId);
  assert.equal(attributed.storyId, story2.storyId);
  assert.equal(attributed.amountCents, 1_700);
  const refund = {
    provider: 'stripe',
    charge: {
      refunds: {
        data: [
          {
            id: 're_fixture',
            status: 'succeeded',
            amount: 500,
            currency: 'eur',
            created: Math.floor(Date.now() / 1000),
          },
        ],
      },
    },
  };
  await db.insert(paymentEvents).values([
    { orderId: first.orderId, eventType: 'refund_completed', data: refund },
    { orderId: first.orderId, eventType: 'refund_completed', data: refund },
  ]);

  const snapshot = buildCreationObservation({
    firstOption: 'photo',
    entryKind: 'wizard',
    text: true,
    photo: true,
    audio: false,
    document: false,
    guide: false,
  });
  const outlineId = randomUUID();
  await Promise.all([
    saveCreationObservation(
      oneBrowser.attributionId,
      outlineId,
      story1.storyId,
      sender1.authorId,
      snapshot,
    ),
    saveCreationObservation(
      oneBrowser.attributionId,
      outlineId,
      story1.storyId,
      sender1.authorId,
      snapshot,
    ),
  ]);
  assert.equal((await db.select().from(creationObservations)).length, 1);
  assert.equal((await db.select().from(analyticsOutbox)).length, 3);
  await db
    .update(analyticsAttributions)
    .set({ revokedAt: new Date() })
    .where(eq(analyticsAttributions.attributionId, oneBrowser.attributionId));
  await revokeGrowthMeasurement(oneBrowser.attributionId);
  await saveCreationObservation(
    oneBrowser.attributionId,
    randomUUID(),
    story1.storyId,
    sender1.authorId,
    snapshot,
  );
  assert.equal((await db.select().from(creationObservations)).length, 0);
  assert.equal((await db.select().from(shareFirstPayments)).length, 1);
  const delayed = await order(lateLink.authorId, new Date(), 900);
  await linkGrowthRecipient(anotherBrowser.attributionId, lateLink.authorId);
  assert.equal(await reconcileShareFirstPayments(), 1);
  assert.equal(await reconcileShareFirstPayments(), 0);
  const [repaired] = await db
    .select()
    .from(shareFirstPayments)
    .where(eq(shareFirstPayments.orderId, delayed.orderId));
  assert.equal(repaired.storyId, story1.storyId);

  const abandoned = {
    draftRef: randomUUID(),
    receiptId: anotherBrowser.attributionId,
    option: 'document',
    entryKind: 'wizard',
  };
  await db.insert(creationDraftOpens).values(abandoned);
  await db
    .insert(creationDraftOpens)
    .values({ ...abandoned, option: 'text' })
    .onConflictDoNothing();
  assert.equal((await db.select().from(creationDraftOpens))[0].option, 'document');
  console.info('Growth v2 fixture passed');
}

verifyGrowth()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
