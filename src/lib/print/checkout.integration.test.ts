/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { LULU_SKUS } from '@/lib/lulu/products';
import {
  addresses,
  authorCreditBalances,
  authors,
  creditLedger,
  pricing,
  printFulfillments,
  printProviders,
  stories,
} from '@/db/schema';

let mockDatabase: ReturnType<typeof drizzle>;
const mockSubmit = jest.fn();
const mockRenderOrderProof = jest.fn();
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
    notification: { engineUrl: 'https://notifications.test', apiKey: 'notification-key' },
  }),
}));
jest.mock('./proof', () => ({
  assetFile: jest.fn(),
  renderOrderProof: (...args: unknown[]) => mockRenderOrderProof(...args),
  signedProofLink: jest.fn(async () => 'https://storage.test/signed'),
}));
jest.mock('@/lib/lulu/client', () => ({
  quoteLuluOrder: jest.fn(async () => ({ shippingLevel: 'EXPRESS', totalEur: 20 })),
  getLuluJobCosts: jest.fn(async () => ({ currency: 'EUR', total: 20, fees: [] })),
  submitLuluJob: (...args: unknown[]) => mockSubmit(...args),
}));

import { startPrintCheckout, setPrintSettings } from './checkout';
import {
  finalizeManualPrint,
  hasPaidOrderForStory,
  processPrintProof,
  reserveManualPrint,
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
      LULU_PAPERBACK_POD_PACKAGE_ID: LULU_SKUS.paperback,
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
          postalCode: '00000',
          phone: '+351210000000',
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
        .set({ totalCredits: form.totalCost * 2 + 20 })
        .where(eq(authorCreditBalances.authorId, author.authorId));
      const actor = 'operator@example.test';
      await setPrintSettings({ defaultProvider: 'none', maxEurPerCopy: 40 }, actor);

      const tickets = new Map<string, string>();
      const proofEmails: unknown[] = [];
      jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
        if (String(url) === 'https://notifications.test/email/print-order-proof') {
          proofEmails.push(JSON.parse(String(init?.body)));
          return new Response(null, { status: proofEmails.length === 1 ? 202 : 200 });
        }
        const { orderDetails } = JSON.parse(String(init?.body)) as {
          orderDetails: { fulfillmentVersion: number; printRequestId: string };
        };
        expect(String(url)).toBe('https://admin.test/api/tickets/paid-print');
        expect(orderDetails.fulfillmentVersion).toBe(1);
        const ticket = tickets.get(orderDetails.printRequestId) ?? randomUUID();
        tickets.set(orderDetails.printRequestId, ticket);
        return Response.json({
          id: ticket,
          metadata: { printRequestId: orderDetails.printRequestId },
        });
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
      await expect(hasPaidOrderForStory(story.storyId)).resolves.toBe(true);
      await expect(hasPaidOrderForStory(story.storyId, new Date(0))).resolves.toBe(false);
      await expect(hasPaidOrderForStory(story.storyId, request.requestedAt)).resolves.toBe(true);
      await expect(hasPaidOrderForStory(randomUUID())).resolves.toBe(false);

      const asset = { bucket: 'b', object: 'o', generation: '1', size: 1, sha256: 'a'.repeat(64) };
      const manual = await startPrintCheckout({ ...form, intentId: randomUUID() }, author);
      const cover = { ...asset, object: 'cover', generation: '2', sha256: 'b'.repeat(64) };
      mockRenderOrderProof.mockResolvedValue({
        interior: asset,
        cover,
        pageCount: 48,
        qaPassed: true,
        qaCriticalCount: 0,
        issues: ['image_below_300_ppi'],
      });
      const firstProofAttempt = await processPrintProof(manual.request.id);
      expect(firstProofAttempt.fulfillment).toMatchObject({
        status: 'pending',
        proofSentAt: null,
      });
      const sent = await processPrintProof(manual.request.id);
      expect(sent.fulfillment).toMatchObject({
        status: 'proof_ready',
        proofSentAt: expect.any(Date),
        proof: { issues: ['image_below_300_ppi'] },
      });
      expect(mockRenderOrderProof).toHaveBeenCalledTimes(1);
      expect(proofEmails).toHaveLength(2);
      expect(proofEmails[1]).toEqual(proofEmails[0]);
      expect(proofEmails[1]).toMatchObject({
        printRequestId: manual.request.id,
        proofVersion: 1,
        interiorGeneration: '1',
        coverGeneration: '2',
        interiorSha256: asset.sha256,
        coverSha256: cover.sha256,
      });
      expect(mockSubmit).not.toHaveBeenCalled();

      const release = { partnerId: randomUUID(), proofVersion: 1, checkedInbox: true as const };
      await expect(
        reserveManualPrint(sent, { ...release, proofVersion: 2 }, actor),
      ).rejects.toMatchObject({ code: 'manual_print_not_ready' });
      const dispatches = await Promise.allSettled([
        reserveManualPrint(sent, release, actor),
        reserveManualPrint(sent, release, actor),
      ]);
      const dispatched = dispatches.filter((entry) => entry.status === 'fulfilled');
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].value.proofFiles).toEqual({
        interior: { generation: asset.generation, sha256: asset.sha256 },
        cover: { generation: cover.generation, sha256: cover.sha256 },
      });
      const manualOrder = await withPrintTicket(manual.request.id, manual.fulfillment.ticketId!);
      const finalized = await finalizeManualPrint(
        manualOrder,
        dispatched[0].value.reservationId,
        'sent',
      );
      expect(finalized.fulfillment.status).toBe('manual_sent');
      expect(mockSubmit).not.toHaveBeenCalled();

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
            podPackageId: LULU_SKUS.paperback,
            shippingLevel: 'EXPRESS',
            totalEur: 20,
            perCopyEur: 20,
          },
          updatedAt: new Date(),
        })
        .where(eq(printFulfillments.printRequestId, request.id));
      mockSubmit.mockResolvedValue({
        id: '100',
        status: 'UNPAID',
        externalId: request.id,
        tracking: [],
        lines: [{ external_id: request.id + '-1' }],
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
        vendor: { id: '100' },
      });
    } finally {
      jest.restoreAllMocks();
    }
  }, 30_000);
});
