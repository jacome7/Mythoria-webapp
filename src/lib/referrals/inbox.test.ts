/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type Stripe from 'stripe';
import { paymentProviderEvents } from '@/db/schema/referrals';
import { paymentService } from '@/db/services/payment';
import { retryablePaymentEvents } from './inbox';

let testDb: ReturnType<typeof drizzle>;
jest.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const connection = process.env.STRIPE_INBOX_TEST_DATABASE_URL;
const suite = connection ? describe : describe.skip;

suite('Stripe webhook inbox', () => {
  const schema = `stripe_inbox_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool;
  let schemaCreated = false;

  beforeAll(async () => {
    const url = new URL(connection!);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname !== '127.0.0.1' ||
      url.pathname !== '/mythoria_stripe_inbox_test' ||
      !url.port ||
      url.search ||
      url.hash
    ) {
      throw new Error('Stripe inbox tests require the disposable test database on loopback');
    }
    pool = new Pool({
      connectionString: url.href,
      connectionTimeoutMillis: 3000,
      options: `-c search_path=${schema}`,
    });
    await pool.query(`CREATE SCHEMA ${schema}`);
    schemaCreated = true;
    testDb = drizzle(pool);
    const migration = readFileSync('drizzle/0039_referral_platform_v1.sql', 'utf8');
    for (const sql of migration.split('--> statement-breakpoint')) {
      if (sql.includes('"payment_provider_events"')) await pool.query(sql);
    }
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      if (schemaCreated) await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await pool?.end();
    }
  });

  it.each([
    ['late failure after current success', false, true, true],
    ['late success after current failure', true, false, true],
    ['stale failure while current attempt is processing', false, true, false],
    ['stale success while current attempt is processing', true, true, false],
  ])(
    'preserves inbox state for %s',
    async (_scenario, staleSuccess, currentSuccess, currentFirst) => {
      const event = {
        id: `evt_${randomUUID()}`,
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_fixture' } },
      } as Stripe.Event;
      const staleStarted = Promise.withResolvers<void>();
      const currentStarted = Promise.withResolvers<void>();
      const staleResult = Promise.withResolvers<{ success: boolean; message: string }>();
      const currentResult = Promise.withResolvers<{ success: boolean; message: string }>();
      const dispatch = jest
        .spyOn(paymentService, 'dispatchStripeWebhook')
        .mockRejectedValue(new Error('Unexpected fixture dispatch'))
        .mockImplementationOnce(() => {
          staleStarted.resolve();
          return staleResult.promise;
        })
        .mockImplementationOnce(() => {
          currentStarted.resolve();
          return currentResult.promise;
        });
      const lookup = eq(paymentProviderEvents.providerEventId, event.id);
      const readEvent = async () => {
        const [row] = await testDb.select().from(paymentProviderEvents).where(lookup);
        return row;
      };

      const stale = paymentService.processStripeWebhook(event);
      await Promise.race([staleStarted.promise, stale]);
      expect(await readEvent()).toMatchObject({ attempts: 1, processingStatus: 'processing' });
      expect(await paymentService.processStripeWebhook(event)).toMatchObject({ success: false });
      expect(dispatch).toHaveBeenCalledTimes(1);

      await testDb
        .update(paymentProviderEvents)
        .set({ leaseUntil: new Date(0) })
        .where(lookup);
      const current = paymentService.processStripeWebhook(event);
      await Promise.race([currentStarted.promise, current]);
      const active = await readEvent();
      expect(active).toMatchObject({
        attempts: 2,
        processingStatus: 'processing',
        processedAt: null,
        leaseUntil: expect.any(Date),
        lastError: null,
      });

      const finishStale = async () => {
        staleResult.resolve({ success: staleSuccess, message: 'Attempt one finished' });
        expect(await stale).toMatchObject({ success: false });
      };
      if (!currentFirst) {
        await finishStale();
        expect(await readEvent()).toEqual(active);
      }

      const currentResponse = { success: currentSuccess, message: 'Attempt two finished' };
      currentResult.resolve(currentResponse);
      expect(await current).toEqual(currentResponse);
      const completed = await readEvent();
      expect(completed).toMatchObject({
        attempts: 2,
        processingStatus: currentSuccess ? 'processed' : 'failed',
        processedAt: currentSuccess ? expect.any(Date) : null,
        leaseUntil: null,
        lastError: currentSuccess ? null : 'processing_failed',
      });
      if (currentFirst) {
        await finishStale();
        expect(await readEvent()).toEqual(completed);
      }
      expect(dispatch).toHaveBeenCalledTimes(2);

      const retryable = (await retryablePaymentEvents()).find(
        (row) => row.providerEventId === event.id,
      );
      let processed = completed;
      if (currentSuccess) {
        expect(retryable).toBeUndefined();
      } else {
        expect(retryable).toEqual(completed);
        const retryResponse = { success: true, message: 'Attempt three finished' };
        dispatch.mockResolvedValueOnce(retryResponse);
        expect(await paymentService.processStripeWebhook(event)).toEqual(retryResponse);
        processed = await readEvent();
        expect(processed).toMatchObject({
          attempts: 3,
          processingStatus: 'processed',
          processedAt: expect.any(Date),
          leaseUntil: null,
          lastError: null,
        });
      }

      expect(await paymentService.processStripeWebhook(event)).toEqual({
        success: true,
        message: 'Already processed',
      });
      expect(await readEvent()).toEqual(processed);
      expect(dispatch).toHaveBeenCalledTimes(currentSuccess ? 2 : 3);
    },
  );
});
