/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  authorCreditBalances,
  authors,
  creditLedger,
  stories,
  storyGenerationRequests,
} from '@/db/schema';
import { draftPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { compensateGeneration } from './outbox';

let mockDatabase: ReturnType<typeof drizzle>;
jest.mock('@/db', () => ({
  get db() {
    return mockDatabase;
  },
}));
jest.mock('@/lib/pubsub', () => ({ publishStoryRequest: jest.fn() }));

const target = process.env.PRINT_TEST_DATABASE_URL;
(target ? describe : describe.skip)(
  'generation delivery compensation in isolated PostgreSQL',
  () => {
    let pool: Pool;
    beforeAll(() => {
      const url = new URL(target!);
      if (
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
        !/^\/print_test(?:_[a-z0-9_]+)?$/i.test(url.pathname) ||
        !url.port ||
        url.port === '5432'
      ) {
        throw new Error('Use the isolated loopback print test database on a non-default port.');
      }
      pool = new Pool({ connectionString: url.href, max: 5 });
      mockDatabase = drizzle(pool);
    });
    afterAll(async () => {
      await pool?.end();
    });

    async function fixture(premium: boolean) {
      const runId = randomUUID();
      const claimedAt = new Date();
      const [author] = await mockDatabase
        .insert(authors)
        .values({
          clerkUserId: randomUUID(),
          displayName: 'Outbox test',
          email: randomUUID() + '@example.test',
        })
        .returning();
      const [story] = await mockDatabase
        .insert(stories)
        .values({
          title: 'Outbox fixture',
          authorId: author.authorId,
          status: 'writing',
          storyGenerationStatus: 'queued',
          features: {
            ebook: true,
            ...(premium && {
              premiumBook: {
                ...draftPremiumBookMarker,
                state: 'queued',
                revision: runId,
                ownerId: author.authorId,
                audience: 'children_3-6',
              },
            }),
          },
        })
        .returning();
      await mockDatabase
        .insert(authorCreditBalances)
        .values({ authorId: author.authorId, totalCredits: 7 });
      await mockDatabase.insert(storyGenerationRequests).values({
        runId,
        authorId: author.authorId,
        storyId: story.storyId,
        idempotencyKey: randomUUID(),
        status: 'publishing',
        publishAttempts: 7,
        creditsSpent: 3,
        updatedAt: claimedAt,
      });
      return {
        runId,
        story,
        failure: { claimedAt, attempts: 8, message: 'Broker acknowledgement timed out' },
      };
    }

    async function readState({ runId, story }: Awaited<ReturnType<typeof fixture>>) {
      const [request] = await mockDatabase
        .select()
        .from(storyGenerationRequests)
        .where(eq(storyGenerationRequests.runId, runId));
      const [book] = await mockDatabase
        .select()
        .from(stories)
        .where(eq(stories.storyId, story.storyId));
      const [balance] = await mockDatabase
        .select()
        .from(authorCreditBalances)
        .where(eq(authorCreditBalances.authorId, story.authorId));
      const refunds = await mockDatabase
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.storyId, story.storyId));
      return {
        request,
        book,
        balance: balance.totalCredits,
        refunds: refunds.map((row) => row.amount),
      };
    }

    it.each([true, false])(
      'refunds one unclaimed exhausted delivery on concurrent attempts (premium=%s)',
      async (premium) => {
        const job = await fixture(premium);
        await Promise.all([
          compensateGeneration(job.runId, job.failure),
          compensateGeneration(job.runId, job.failure),
        ]);
        expect(await readState(job)).toMatchObject({
          request: { status: 'delivery_failed', compensatedAt: expect.any(Date) },
          balance: 10,
          refunds: [3],
          book: {
            status: 'draft',
            features: premium
              ? { ebook: true, premiumBook: draftPremiumBookMarker }
              : { ebook: true },
          },
        });
      },
    );

    it('repairs a delivery failure recorded before its refund and never compensates it twice', async () => {
      const job = await fixture(true);
      await mockDatabase
        .update(storyGenerationRequests)
        .set({ status: 'delivery_failed', publishAttempts: 8 })
        .where(eq(storyGenerationRequests.runId, job.runId));
      await compensateGeneration(job.runId);
      await compensateGeneration(job.runId);
      expect(await readState(job)).toMatchObject({
        request: { status: 'delivery_failed', compensatedAt: expect.any(Date) },
        balance: 10,
        refunds: [3],
      });
    });

    it('preserves a premium run when the worker owns the story before the final broker error', async () => {
      const job = await fixture(true);
      let pending!: Promise<void>;
      await mockDatabase.transaction(async (tx) => {
        await tx
          .update(stories)
          .set({ storyGenerationStatus: 'running' })
          .where(eq(stories.storyId, job.story.storyId));
        pending = compensateGeneration(job.runId, job.failure);
      });
      await pending;
      expect(await readState(job)).toMatchObject({
        request: { status: 'published', compensatedAt: null },
        book: { status: 'writing', storyGenerationStatus: 'running' },
        balance: 7,
        refunds: [],
      });
    });

    it('ignores a superseded publisher and preserves a terminal standard book', async () => {
      const job = await fixture(false);
      const stale = { ...job.failure, claimedAt: new Date(job.failure.claimedAt.getTime() - 5000) };
      await compensateGeneration(job.runId, stale);
      expect(await readState(job)).toMatchObject({
        request: { status: 'publishing' },
        book: { status: 'writing' },
        balance: 7,
        refunds: [],
      });
      await mockDatabase
        .update(stories)
        .set({ status: 'published', storyGenerationStatus: 'completed' })
        .where(eq(stories.storyId, job.story.storyId));
      await mockDatabase
        .update(storyGenerationRequests)
        .set({ status: 'completed', terminalAt: new Date() })
        .where(eq(storyGenerationRequests.runId, job.runId));
      await compensateGeneration(job.runId, job.failure);
      expect(await readState(job)).toMatchObject({
        request: { status: 'completed', compensatedAt: null },
        book: { status: 'published', storyGenerationStatus: 'completed' },
        balance: 7,
        refunds: [],
      });
    });
  },
);
