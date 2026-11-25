/** @jest-environment node */
import { randomInt, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getLuluCoverDimensions, quoteLuluOrder, validateLuluFile } from '@/lib/lulu/client';
import { LULU_SKUS } from '@/lib/lulu/products';
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
const mockRenderOrderProof = jest.fn();
const mockLoadPublished = jest.fn();
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
  verifyProofFile: jest.fn(),
  ensureProofFileAvailable: jest.fn(),
  renderOrderProof: (...args: unknown[]) => mockRenderOrderProof(...args),
  signedProofLink: jest.fn(async () => 'https://storage.test/signed'),
}));
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => mockLoadPublished(...args),
}));
jest.mock('@/lib/lulu/client', () => ({
  luluConfigured: jest.requireActual('@/lib/lulu/client').luluConfigured,
  getLuluCoverDimensions: jest.fn(async () => ({ width: 1368, height: 738 })),
  validateLuluFile: jest.fn(async (kind, _options, saved, remember) => {
    if (saved) return saved;
    await remember(kind);
    return kind;
  }),
  quoteLuluOrder: jest.fn(async () => ({ shippingLevel: 'EXPRESS', totalEur: 20 })),
  getLuluJob: (...args: unknown[]) => mockGetLuluJob(...args),
  getLuluJobCosts: (...args: unknown[]) => mockGetLuluJobCosts(...args),
  submitLuluJob: (...args: unknown[]) => mockSubmit(...args),
}));

import { getPublicPrintOptions, startPrintCheckout, setPrintSettings } from './checkout';
import { PREMIUM_SQUARE_PACKAGE } from './premium-edition';
import {
  correctSquareEdition,
  finalizeManualPrint,
  hasPaidOrderForStory,
  pollLuluCosts,
  processPrintProof,
  reconcilePrintOrder,
  reserveManualPrint,
  setPrintHold,
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
      const jobId = String(randomInt(1e12));
      const createdAt = '2026-11-22T12:30:00.000Z';
      mockSubmit.mockResolvedValue({
        id: jobId,
        createdAt,
        costs: { currency: 'EUR', total: 20, amountExclTax: '12.345', fees: [] },
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
        vendor: { id: jobId, environment: 'production', createdAt },
      });
      const [cost] = await mockDatabase
        .select()
        .from(printFulfillmentCosts)
        .where(eq(printFulfillmentCosts.printRequestId, request.id));
      expect(cost).toMatchObject({
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

  it.each([32, 33])(
    'freezes an approved %i-page Lulu square purchase, rebinds a correction on hold, and releases once',
    async (pageCount) => {
      jest.clearAllMocks();
      jest.replaceProperty(process, 'env', {
        ...process.env,
        PRINT_PROOF_BUCKET: 'private-proof',
        PRINT_INTERNAL_AUDIENCE: 'https://webapp.test',
        PRINT_ADMIN_SERVICE_ACCOUNT: 'admin@example.test',
        PRINT_SCHEDULER_SERVICE_ACCOUNT: 'scheduler@example.test',
        LULU_PREMIUM_SQUARE_POD_PACKAGE_ID: PREMIUM_SQUARE_PACKAGE,
        LULU_PAPERBACK_POD_PACKAGE_ID: LULU_SKUS.paperback,
        LULU_HARDCOVER_POD_PACKAGE_ID: LULU_SKUS.hardcover,
        LULU_PRINT_ENVIRONMENT: 'sandbox',
        LULU_PRINT_CLIENT_KEY: 'synthetic-client',
        LULU_PRINT_CONTACT_EMAIL: 'operator@example.test',
        LULU_PRINT_SECRET_VERSION: 'projects/fixture/secrets/fixture/versions/1',
      });
      try {
        delete process.env.PREMIUM_SQUARE_PRINT_APPROVAL;
        const [author] = await mockDatabase
          .insert(authors)
          .values({
            clerkUserId: randomUUID(),
            email: randomUUID() + '@example.test',
            displayName: 'Square order fixture',
          })
          .returning();
        const storyId = randomUUID();
        const firstRevision = randomUUID();
        const replacement = randomUUID();
        function marker(revision: string, generation: string) {
          return {
            version: 1,
            type: 'premium_children',
            state: 'published',
            revision,
            manifest: {
              key: `${storyId}/premium/revisions/${revision}/manifest.json`,
              generation,
              sha256: 'a'.repeat(64),
              bytes: 1024,
            },
          };
        }
        const originalMarker = marker(firstRevision, '101');
        const correctedMarker = marker(replacement, '102');
        await mockDatabase.insert(stories).values({
          storyId,
          authorId: author.authorId,
          title: 'Square book',
          status: 'published',
          chapterCount: 9,
          features: { premiumBook: originalMarker },
        });
        const [address] = await mockDatabase
          .insert(addresses)
          .values({
            authorId: author.authorId,
            type: 'delivery',
            line1: 'Example 1',
            city: 'Lisboa',
            country: 'PT',
            postalCode: '1000-001',
          })
          .returning();
        await mockDatabase.insert(printProviders).values({
          name: 'Square fixture',
          companyName: 'Square fixture',
          emailAddress: 'print@example.test',
          phoneNumber: '1',
          address: 'Example 1',
          postalCode: '1000-001',
          city: 'Lisboa',
          country: 'PT',
          prices: {},
          availableCountries: ['PT'],
        });
        await mockDatabase.insert(authorCreditBalances).values({
          authorId: author.authorId,
          totalCredits: 50,
        });
        for (const [serviceCode, credits] of [
          ['shippingCost', 3],
          ['extraBookCopy', 4],
          ['extraChapterCost', 50],
        ] as const) {
          await mockDatabase
            .insert(pricing)
            .values({ serviceCode, credits, isActive: true })
            .onConflictDoUpdate({ target: pricing.serviceCode, set: { credits, isActive: true } });
        }
        const actor = 'operator@example.test';
        await setPrintSettings(
          { defaultProvider: 'lulu', maxEurPerCopy: 20, hardcoverCredits: 12 },
          actor,
        );
        const recipient = {
          name: 'Recipient',
          email: 'receiver@example.test',
          phone_number: '+351210000000',
        };
        const form = {
          storyId,
          shippingId: address.addressId,
          intentId: randomUUID(),
          totalCost: 19,
          numberOfCopies: 2,
          printingOption: {
            serviceCode: 'printedHardCover' as const,
            editionRevision: firstRevision,
          },
          recipient,
        };
        const selection = { storyId, authorId: author.authorId };
        const emails: unknown[] = [];
        const tickets = new Map<string, string>();
        jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
          const data = JSON.parse(String(init?.body));
          if (String(url) === 'https://notifications.test/email/print-order-proof') {
            emails.push(data);
            return Response.json({ success: true, data: { deliveryStatus: 'sent' } });
          }
          expect(String(url)).toBe('https://admin.test/api/tickets/paid-print');
          const printRequestId = data.orderDetails.printRequestId;
          const id = tickets.get(printRequestId) ?? randomUUID();
          tickets.set(printRequestId, id);
          return Response.json({ id, metadata: { printRequestId } });
        });

        await expect(getPublicPrintOptions(selection)).resolves.toMatchObject({
          hardcoverAvailable: false,
          paperbackAvailable: false,
        });
        await expect(startPrintCheckout(form, author)).rejects.toMatchObject({
          code: 'square_print_unavailable',
        });
        expect(tickets.size).toBe(0);
        expect(mockLoadPublished).not.toHaveBeenCalled();
        process.env.PREMIUM_SQUARE_PRINT_APPROVAL = 'sandbox:approval-record-fixture';
        mockLoadPublished.mockImplementation(async (_story, _author, features) => ({
          format: { pageCount },
          previousRevision:
            features.premiumBook.revision === replacement ? firstRevision : undefined,
        }));
        await expect(getPublicPrintOptions(selection)).resolves.toMatchObject({
          luluDefault: true,
          paperbackAvailable: false,
          hardcoverAvailable: true,
          squareEditionRevision: firstRevision,
        });
        const bought = await Promise.all([
          startPrintCheckout(form, author),
          startPrintCheckout(form, author),
        ]);
        const { request, fulfillment } = bought[0];
        expect(tickets.size).toBe(1);
        expect(bought.filter((order) => !order.duplicate)).toHaveLength(1);
        expect(fulfillment).toMatchObject({
          provider: 'lulu',
          binding: 'hardcover',
          creditsSpent: 19,
        });
        expect(request.printingOptions).toMatchObject({
          extraChapters: 0,
          premiumEdition: { premiumBook: originalMarker, pageCount },
        });

        await mockDatabase
          .update(stories)
          .set({ features: { premiumBook: correctedMarker } })
          .where(eq(stories.storyId, storyId));
        function proof(generation: string) {
          const asset = { bucket: 'b', object: 'o', generation, size: 1, sha256: 'a'.repeat(64) };
          return {
            interior: asset,
            cover: { ...asset, object: 'cover', sha256: 'b'.repeat(64) },
            pageCount,
            qaPassed: true,
            qaCriticalCount: 0,
          };
        }
        mockRenderOrderProof.mockResolvedValue(proof('1'));
        const firstProof = await processPrintProof(request.id);
        expect(firstProof.fulfillment).toMatchObject({ status: 'proof_ready', proofVersion: 1 });
        expect(mockRenderOrderProof.mock.calls[0][0]).toMatchObject({
          premiumBook: originalMarker,
          premiumPageCount: pageCount,
        });
        expect(mockSubmit).not.toHaveBeenCalled();
        const onHold = await setPrintHold(firstProof, 'Customer requested a spelling correction');
        const corrected = await correctSquareEdition(
          onHold,
          {
            expectedRevision: firstRevision,
            correctedRevision: replacement,
            reason: 'Corrected spelling on page 8',
          },
          actor,
        );
        expect(corrected.fulfillment).toMatchObject({
          status: 'held',
          proofVersion: 2,
          proofSentAt: null,
          quote: null,
        });
        await setPrintHold(corrected, null);
        delete process.env.PREMIUM_SQUARE_PRINT_APPROVAL;
        await expect(getPublicPrintOptions(selection)).resolves.toMatchObject({
          hardcoverAvailable: false,
        });
        await expect(
          startPrintCheckout({ ...form, intentId: randomUUID() }, author),
        ).rejects.toMatchObject({ code: 'square_print_unavailable' });
        mockRenderOrderProof.mockResolvedValue(proof('2'));
        const ready = await processPrintProof(request.id);
        expect(ready.fulfillment).toMatchObject({ status: 'proof_ready', proofVersion: 2 });
        expect(mockRenderOrderProof.mock.calls[2][0]).toMatchObject({
          premiumBook: correctedMarker,
          premiumPageCount: pageCount,
        });
        expect(emails).toMatchObject([
          { recipient: { email: author.email }, proofVersion: 1, interiorGeneration: '1' },
          {
            recipient: { email: author.email },
            proofVersion: 2,
            interiorGeneration: '2',
            revised: true,
          },
        ]);
        expect(mockSubmit).not.toHaveBeenCalled();
        const quote = ready.fulfillment.quote as { confirmationId: string; totalEur: number };
        const release = {
          confirmationId: quote.confirmationId,
          confirmedTotalEur: quote.totalEur,
          proofVersion: 2,
          checkedInbox: true,
        };
        await expect(
          submitPrintOrder(ready, { ...release, proofVersion: 1 }, actor),
        ).rejects.toMatchObject({
          code: 'print_not_approved',
        });
        mockSubmit.mockResolvedValue({
          id: '101',
          status: 'UNPAID',
          externalId: request.id,
          tracking: [],
          lines: [{ external_id: request.id + '-1' }],
        });
        const approvals = await Promise.allSettled([
          submitPrintOrder(ready, release, actor),
          submitPrintOrder(ready, release, actor),
        ]);
        expect(approvals.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit.mock.calls[0][0]).toMatchObject({
          podPackageId: PREMIUM_SQUARE_PACKAGE,
          copies: 2,
          externalId: request.id,
        });
        expect(getLuluCoverDimensions).toHaveBeenCalledTimes(2);
        expect(getLuluCoverDimensions).toHaveBeenCalledWith({
          podPackageId: PREMIUM_SQUARE_PACKAGE,
          pageCount,
        });
        expect(validateLuluFile).toHaveBeenCalledWith(
          'interior',
          expect.objectContaining({ pageCount, requirePackageMatch: true }),
          undefined,
          expect.any(Function),
        );
        expect(validateLuluFile).toHaveBeenCalledWith(
          'cover',
          expect.objectContaining({ pageCount, requirePackageMatch: true }),
          undefined,
          expect.any(Function),
        );
        expect(quoteLuluOrder).toHaveBeenCalledWith(
          expect.objectContaining({ pageCount, podPackageId: PREMIUM_SQUARE_PACKAGE }),
        );
        const [balance] = await mockDatabase
          .select()
          .from(authorCreditBalances)
          .where(eq(authorCreditBalances.authorId, author.authorId));
        expect(balance.totalCredits).toBe(31);
        const debitEntries = await mockDatabase
          .select()
          .from(creditLedger)
          .where(eq(creditLedger.authorId, author.authorId));
        expect(debitEntries.map(({ amount }) => amount)).toEqual([-19]);
      } finally {
        jest.restoreAllMocks();
      }
    },
    30_000,
  );
});
