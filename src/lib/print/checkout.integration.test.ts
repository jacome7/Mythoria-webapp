/** @jest-environment node */
import { randomInt, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  addresses,
  authorCreditBalances,
  authors,
  creditLedger,
  pricing,
  printFulfillmentCosts,
  printFulfillments,
  printProviders,
  printRequests,
  stories,
} from '@/db/schema';

let mockDatabase: ReturnType<typeof drizzle>;
const mockSubmit = jest.fn();
const mockGetLuluJob = jest.fn();
const mockGetLuluJobCosts = jest.fn();
const target = process.env.PRINT_TEST_DATABASE_URL;

jest.mock('@/db', () => ({
  get db() {
    return mockDatabase;
  },
}));
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({
    admin: { apiUrl: 'https://admin.test', apiKey: 'admin-key' },
    storyGeneration: { apiKey: 'sgw-key' },
    notification: { apiKey: 'notification-key' },
  }),
}));
jest.mock('./proof', () => ({
  signedProofLink: jest.fn(async () => 'https://storage.test/signed'),
}));
jest.mock('@/lib/lulu/client', () => ({
  quoteLuluOrder: jest.fn(async () => ({ shippingLevel: 'EXPRESS', totalEur: 20 })),
  getLuluJob: (...args: unknown[]) => mockGetLuluJob(...args),
  getLuluJobCosts: (...args: unknown[]) => mockGetLuluJobCosts(...args),
  submitLuluJob: (...args: unknown[]) => mockSubmit(...args),
}));

import { startPrintCheckout, setPrintSettings } from './checkout';
import {
  pollLuluCosts,
  reconcilePrintOrder,
  submitPrintOrder,
  withPrintTicket,
} from './fulfillment';

(target ? describe : describe.skip)('paid print checkout in isolated PostgreSQL', () => {
  let pool: Pool;
  beforeAll(() => {
    const url = new URL(target!);
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      !/^\/print_test(?:_[a-z0-9_]+)?$/i.test(url.pathname) ||
      !url.port ||
      url.port === '5432'
    ) {
      throw new Error(
        'Use an isolated loopback database named print_test on an explicit non-default port.',
      );
    }
    pool = new Pool({ connectionString: url.toString(), max: 8 });
    mockDatabase = drizzle(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('creates a single paid ticket-backed order and submits the current proof only once during concurrent calls', async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      PRINT_PROOF_BUCKET: 'private-proof',
      PRINT_INTERNAL_AUDIENCE: 'https://webapp.test',
      PRINT_ADMIN_SERVICE_ACCOUNT: 'admin@example.test',
      PRINT_SCHEDULER_SERVICE_ACCOUNT: 'scheduler@example.test',
      LULU_PRINT_ENVIRONMENT: 'production',
    });
    try {
      const [author] = await mockDatabase
        .insert(authors)
        .values({
          clerkUserId: randomUUID(),
          email: randomUUID() + '@example.test',
          displayName: 'Integration Test',
        })
        .returning();
      const [story] = await mockDatabase
        .insert(stories)
        .values({
          title: 'Fixture',
          authorId: author.authorId,
          status: 'published',
          chapterCount: 4,
        })
        .returning();
      const [address] = await mockDatabase
        .insert(addresses)
        .values({
          authorId: author.authorId,
          type: 'delivery',
          line1: 'Example 1',
          city: 'Test',
          country: 'ZZ',
        })
        .returning();
      await mockDatabase.insert(printProviders).values({
        name: 'Fixture',
        companyName: 'Fixture',
        emailAddress: 'print@example.test',
        phoneNumber: '1',
        address: 'Example 1',
        postalCode: '00000',
        city: 'Test',
        country: 'ZZ',
        prices: {},
        availableCountries: ['ZZ'],
      });
      await mockDatabase
        .insert(authorCreditBalances)
        .values({ authorId: author.authorId, totalCredits: 20 });
      await mockDatabase
        .insert(pricing)
        .values([
          { serviceCode: 'printedSoftCover', credits: 10 },
          { serviceCode: 'shippingCost', credits: 0 },
        ])
        .onConflictDoNothing();
      const activePricing = await mockDatabase.select().from(pricing);
      const form = {
        storyId: story.storyId,
        shippingId: address.addressId,
        intentId: randomUUID(),
        totalCost:
          (activePricing.find((x) => x.serviceCode === 'printedSoftCover' && x.isActive)?.credits ??
            0) +
          (activePricing.find((x) => x.serviceCode === 'shippingCost' && x.isActive)?.credits ?? 0),
        numberOfCopies: 1,
        printingOption: { serviceCode: 'printedSoftCover' as const },
      };
      await mockDatabase
        .update(authorCreditBalances)
        .set({ totalCredits: form.totalCost + 20 })
        .where(eq(authorCreditBalances.authorId, author.authorId));
      const actor = 'operator@example.test';
      await setPrintSettings({ defaultProvider: 'none', maxEurPerCopy: 40 }, actor);

      const tickets = new Map<string, string>();
      jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
        const { orderDetails } = JSON.parse(String(init?.body)) as {
          orderDetails: { printRequestId: string };
        };
        const ticket = tickets.get(orderDetails.printRequestId) ?? randomUUID();
        tickets.set(orderDetails.printRequestId, ticket);
        return Response.json({ id: ticket });
      });
      const checkouts = await Promise.all([
        startPrintCheckout(form, author),
        startPrintCheckout(form, author),
        startPrintCheckout(form, author),
      ]);
      const { request, fulfillment } = checkouts[0];
      expect(new Set(checkouts.map(({ request }) => request.id))).toEqual(new Set([request.id]));
      expect(new Set(checkouts.map(({ fulfillment }) => fulfillment.ticketId))).toEqual(
        new Set([fulfillment.ticketId]),
      );
      expect(tickets.size).toBe(1);
      expect(checkouts.filter((entry) => !entry.duplicate)).toHaveLength(1);
      const entries = await mockDatabase
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.authorId, author.authorId),
            eq(creditLedger.creditEventType, 'printOrder'),
          ),
        );
      expect(entries.map(({ amount }) => amount)).toEqual([-form.totalCost]);

      const asset = { bucket: 'b', object: 'o', generation: '1', size: 1, sha256: 'a'.repeat(64) };
      const confirmationId = randomUUID();
      await mockDatabase
        .update(printFulfillments)
        .set({
          provider: 'lulu',
          status: 'proof_ready',
          proofSentAt: new Date(),
          proof: {
            interior: asset,
            cover: asset,
            pageCount: 48,
            qaPassed: true,
            qaCriticalCount: 0,
          },
          quote: {
            confirmationId,
            podPackageId: 'sku',
            shippingLevel: 'EXPRESS',
            totalEur: 20,
            perCopyEur: 20,
          },
          updatedAt: new Date(),
        })
        .where(eq(printFulfillments.printRequestId, request.id));
      const jobId = String(randomInt(1e12));
      const createdAt = '2026-11-22T12:30:00.000Z';
      mockSubmit.mockResolvedValue({
        id: jobId,
        status: 'UNPAID',
        externalId: request.id,
        tracking: [],
        lines: [{ external_id: request.id + '-1' }],
        createdAt,
        costs: { currency: 'EUR', amountExclTax: '12.345', total: 20, fees: [] },
      });
      const first = await withPrintTicket(request.id, fulfillment.ticketId!);
      const second = await withPrintTicket(request.id, fulfillment.ticketId!);
      const approval = { confirmationId, confirmedTotalEur: 20 };
      const approvals = await Promise.allSettled([
        submitPrintOrder(first, approval, actor),
        submitPrintOrder(second, approval, actor),
      ]);
      expect(approvals.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      const submitted = await withPrintTicket(request.id, fulfillment.ticketId!);
      expect(submitted.fulfillment).toMatchObject({
        status: 'submitted',
        approvedBy: actor,
        quote: { totalEur: 20 },
        vendor: { id: jobId, environment: 'production', createdAt, costs: { total: 20 } },
      });
      const [eurCost] = await mockDatabase
        .select()
        .from(printFulfillmentCosts)
        .where(eq(printFulfillmentCosts.printRequestId, request.id));
      expect(eurCost).toMatchObject({
        luluJobId: jobId,
        jobCreatedAt: new Date(createdAt),
        currency: 'EUR',
        amountExclTax: '12.345',
        amountEur: '12.35',
        fxRate: '1',
        fxRateDate: '2026-11-22',
      });

      const legacyRequestId = randomUUID();
      const legacyJobId = String(randomInt(1e12));
      const legacyTicketId = randomUUID();
      const legacyVendor = {
        id: legacyJobId,
        status: 'SHIPPED',
        externalId: legacyRequestId,
        tracking: [],
        lines: [{ external_id: legacyRequestId + '-1' }],
      };
      await mockDatabase
        .insert(printRequests)
        .values({ ...request, id: legacyRequestId, status: 'delivered' });
      await mockDatabase.insert(printFulfillments).values({
        ...submitted.fulfillment,
        printRequestId: legacyRequestId,
        ticketId: legacyTicketId,
        intentId: randomUUID(),
        vendor: legacyVendor,
      });
      mockGetLuluJob.mockResolvedValueOnce({ ...legacyVendor, id: '987654321', createdAt });
      const legacy = await withPrintTicket(legacyRequestId, legacyTicketId);
      await reconcilePrintOrder(legacy);
      expect((await withPrintTicket(legacyRequestId, legacyTicketId)).fulfillment.vendor).toEqual(
        legacyVendor,
      );

      mockGetLuluJob.mockResolvedValue({ ...legacyVendor, status: 'DELIVERED', createdAt });
      mockGetLuluJobCosts.mockRejectedValueOnce(new Error('Supplier cost unavailable'));
      await pollLuluCosts();
      const deferred = await withPrintTicket(legacyRequestId, legacyTicketId);
      expect(deferred.fulfillment.vendor).toMatchObject({ environment: 'production', createdAt });
      expect(deferred.fulfillment.nextLuluCostCheckAt?.getTime()).toBeGreaterThan(Date.now());
      await expect(
        mockDatabase
          .select()
          .from(printFulfillmentCosts)
          .where(eq(printFulfillmentCosts.printRequestId, legacyRequestId)),
      ).resolves.toEqual([]);

      mockGetLuluJobCosts.mockResolvedValue({ currency: 'USD', amountExclTax: '24.51', fees: [] });
      jest
        .mocked(fetch)
        .mockResolvedValue(
          new Response('KEY,TIME_PERIOD,OBS_VALUE\nEXR.D.USD.EUR.SP00.A,2026-11-20,1.50\n'),
        );
      await mockDatabase
        .update(printFulfillments)
        .set({ nextLuluCostCheckAt: new Date(0) })
        .where(eq(printFulfillments.printRequestId, legacyRequestId));
      await pollLuluCosts();
      const [usdCost] = await mockDatabase
        .select()
        .from(printFulfillmentCosts)
        .where(eq(printFulfillmentCosts.printRequestId, legacyRequestId));
      expect(usdCost).toMatchObject({
        luluJobId: legacyJobId,
        amountExclTax: '24.51',
        currency: 'USD',
        amountEur: '16.34',
        fxRateDate: '2026-11-20',
        fxRate: '1.50',
      });

      const sandboxId = randomUUID();
      const sandboxTicketId = randomUUID();
      const sandboxJob = {
        id: String(randomInt(1e12)),
        status: 'UNPAID',
        externalId: sandboxId,
        tracking: [],
        lines: [{ external_id: sandboxId + '-1' }],
      };
      await mockDatabase.insert(printRequests).values({ ...request, id: sandboxId });
      await mockDatabase.insert(printFulfillments).values({
        ...submitted.fulfillment,
        printRequestId: sandboxId,
        ticketId: sandboxTicketId,
        intentId: randomUUID(),
        vendor: sandboxJob,
      });
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      mockGetLuluJob.mockResolvedValueOnce({
        ...sandboxJob,
        createdAt,
        costs: { currency: 'EUR', amountExclTax: '3.00', total: 4, fees: [] },
      });
      const sandbox = await reconcilePrintOrder(await withPrintTicket(sandboxId, sandboxTicketId));
      expect(sandbox.fulfillment.vendor).toMatchObject({ environment: 'sandbox', createdAt });
      await expect(
        mockDatabase
          .select()
          .from(printFulfillmentCosts)
          .where(eq(printFulfillmentCosts.printRequestId, sandboxId)),
      ).resolves.toEqual([]);
    } finally {
      jest.restoreAllMocks();
    }
  }, 30_000);
});
