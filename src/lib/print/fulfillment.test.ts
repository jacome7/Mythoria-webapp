/** @jest-environment node */

const mockSubmit = jest.fn();
const mockQuote = jest.fn();
const mockWrite = jest.fn();
const mockFind = jest.fn();
const mockCancel = jest.fn();
const mockGetJob = jest.fn();
const mockGetJobCosts = jest.fn();
const mockReadOrder = jest.fn();
const mockOrderNumberLookup = jest.fn();
const mockRender = jest.fn();
const mockDimensions = jest.fn();
const mockValidate = jest.fn();
const mockVerifyProof = jest.fn();
const mockEnsureAvailable = jest.fn();
const mockReadBookManifest = jest.fn();
let mockCeiling = '20';
let mockCurrentOrder: ReturnType<typeof order> | undefined;
let mockPublishedStory: unknown;
let mockDispatchOptions: unknown;

function mockWriter() {
  return {
    set: (values: object) => {
      mockWrite(values);
      return {
        where: () => ({
          returning: async () => {
            if (mockCurrentOrder)
              mockCurrentOrder.fulfillment = { ...mockCurrentOrder.fulfillment, ...values };
            return [mockCurrentOrder?.fulfillment ?? { ...fulfillment, ...values }];
          },
        }),
      };
    },
  };
}

jest.mock('@/db', () => ({
  db: {
    update: () => mockWriter(),
    select: (selection?: { countries?: unknown }) => ({
      from: () => ({
        where: async () => [{ countries: ['PT'] }],
        innerJoin: () => ({
          where: () => {
            if (selection?.countries) throw new Error('Unexpected order lookup');
            mockReadOrder();
            return [mockCurrentOrder];
          },
        }),
      }),
    }),
    transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        execute: async () => undefined,
        update: (table: object) =>
          table === printRequests
            ? {
                set: (values: { printingOptions: unknown }) => {
                  mockDispatchOptions = values.printingOptions;
                  return {
                    where: () => ({
                      returning: async () => [{ ...mockCurrentOrder?.request, ...values }],
                    }),
                  };
                },
              }
            : mockWriter(),
        select: (selection?: { conflictingPrintRequestId?: unknown }) => ({
          from: (table: object) => ({
            where: () => ({
              for: async () => (table === stories ? [mockPublishedStory] : [{ max: mockCeiling }]),
              limit: () => {
                if (!selection?.conflictingPrintRequestId) throw new Error('Unexpected lookup');
                return mockOrderNumberLookup();
              },
            }),
          }),
        }),
      }),
  },
}));
jest.mock('@/lib/lulu/client', () => ({
  luluConfigured: () => true,
  submitLuluJob: (...args: unknown[]) => mockSubmit(...args),
  LuluHttpError: class extends Error {
    constructor(
      public status: number,
      public detail?: string,
    ) {
      super('LULU_HTTP_' + status);
    }
  },
  LuluValidationError: class extends Error {
    constructor(
      public code: string,
      public detail?: string,
    ) {
      super(code);
    }
  },
  quoteLuluOrder: (...args: unknown[]) => mockQuote(...args),
  findLuluJob: (...args: unknown[]) => mockFind(...args),
  getLuluJob: (...args: unknown[]) => mockGetJob(...args),
  getLuluJobCosts: (...args: unknown[]) => mockGetJobCosts(...args),
  cancelLuluJob: (...args: unknown[]) => mockCancel(...args),
  getLuluCoverDimensions: (...args: unknown[]) => mockDimensions(...args),
  validateLuluFile: (...args: unknown[]) => mockValidate(...args),
}));
jest.mock('./proof', () => ({
  assetFile: jest.fn(),
  renderOrderProof: (...args: unknown[]) => mockRender(...args),
  verifyProofFile: (...args: unknown[]) => mockVerifyProof(...args),
  ensureProofFileAvailable: (...args: unknown[]) => mockEnsureAvailable(...args),
  signedProofLink: jest.fn(async () => 'https://storage.test/signed'),
}));
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({
    notification: { engineUrl: 'https://notify.test', apiKey: 'notification-key' },
  }),
}));
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => mockReadBookManifest(...args),
}));

import { printRequests, stories } from '@/db/schema';
import { LuluHttpError } from '@/lib/lulu/client';
import { LULU_SKUS } from '@/lib/lulu/products';
import { PREMIUM_SQUARE_PACKAGE } from './premium-edition';
import {
  cancelSubmittedLuluOrder,
  correctSquareEdition,
  preparePrintOrderNow,
  printOrderView,
  processPrintProof,
  reconcileLuluWebhook,
  reconcilePrintOrder,
  reserveManualPrint,
  revisePrintProof,
  submitPrintOrder,
} from './fulfillment';

const id = '32c3cb83-00c2-4933-972b-916ec8065f18';
const orderNumber = '32C3CB83';
const confirmationId = 'b53517fe-a406-493b-bda7-9cad123bd371';
const proofFile = { bucket: 'b', object: 'o', generation: '1', sha256: 'a'.repeat(64), size: 55 };
const proof = {
  interior: proofFile,
  cover: proofFile,
  pageCount: 48,
  qaPassed: true,
  qaCriticalCount: 0,
};
const shippingSnapshot = {
  name: 'Receiver',
  street1: 'Example 1',
  city: 'Lisbon',
  postcode: '1000-001',
  country_code: 'PT',
  phone_number: '123456789',
  email: 'receiver@example.test',
};
const emailVariables = {
  email: 'owner@example.test',
  name: 'Owner',
  OrderNumber: orderNumber,
  OrderDate: '2026-11-21',
  CreditCost: 10,
  numberOfCopies: 2,
  storyTitle: 'Title',
  CoverImageURL: '',
  line1: '',
  line2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
  phone: '',
  listenURL: 'https://mythoria.test/stories/listen',
  contactURL: 'https://mythoria.test/contact',
  language: 'en-US',
};
const fulfillment = {
  status: 'proof_ready',
  provider: 'lulu',
  binding: 'paperback',
  proofSentAt: new Date(),
  proofVersion: 1,
  proof,
  copies: 2,
  runId: id,
  holdReason: null,
  updatedAt: new Date(),
  vendor: null,
  luluExternalId: null as string | null,
  quote: {
    confirmationId,
    podPackageId: LULU_SKUS.paperback as string,
    shippingLevel: 'EXPRESS',
    totalEur: 30,
    perCopyEur: 15,
  },
  shippingSnapshot,
  emailVariables,
};

function order(overrides: Partial<typeof fulfillment> = {}) {
  return {
    fulfillment: { ...fulfillment, ...overrides },
    request: { id, storyId: id },
  } as unknown as Parameters<typeof submitPrintOrder>[0];
}

function squareOrder(overrides: Partial<typeof fulfillment> = {}, pageCount = 32) {
  const value = order({
    binding: 'hardcover',
    proof: {
      ...proof,
      pageCount,
      ...{
        podPackageId: PREMIUM_SQUARE_PACKAGE,
        interiorValidationId: '111',
        coverValidationId: '222',
      },
    },
    quote: { ...fulfillment.quote, podPackageId: PREMIUM_SQUARE_PACKAGE },
    ...overrides,
  });
  value.request.printingOptions = {
    premiumEdition: {
      profile: 'premium_square_casewrap',
      podPackageId: PREMIUM_SQUARE_PACKAGE,
      pageCount,
      luluEnvironment: 'sandbox',
      premiumBook: {
        version: 1,
        type: 'premium_children',
        state: 'published',
        revision: id,
        manifest: {
          key: `${id}/premium/revisions/${id}/manifest.json`,
          generation: '1',
          sha256: 'a'.repeat(64),
          bytes: 250,
        },
      },
    },
  };
  return value;
}

describe('Lulu release safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRender.mockReset();
    mockReadBookManifest.mockReset();
    mockCeiling = '20';
    mockCurrentOrder = undefined;
    mockPublishedStory = undefined;
    mockDispatchOptions = undefined;
    mockOrderNumberLookup.mockResolvedValue([]);
    mockQuote.mockResolvedValue({ shippingLevel: 'EXPRESS', totalEur: 30 });
    mockGetJobCosts.mockResolvedValue({
      currency: 'EUR',
      total: 30,
      amountExclTax: '25.00',
      fees: [],
    });
    jest.replaceProperty(process, 'env', {
      ...process.env,
      LULU_PAPERBACK_POD_PACKAGE_ID: LULU_SKUS.paperback,
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('rejects square release for the wrong proof version, missing validation, or a changed supplier environment', async () => {
    process.env.LULU_PRINT_ENVIRONMENT = 'production';
    const actor = 'operator@example.test';
    const approval = { confirmationId, confirmedTotalEur: 30, checkedInbox: true, proofVersion: 1 };
    await expect(
      submitPrintOrder(squareOrder(), { ...approval, proofVersion: 2 }, actor),
    ).rejects.toMatchObject({ code: 'print_not_approved' });
    await expect(
      submitPrintOrder(squareOrder(), { ...approval, checkedInbox: false }, actor),
    ).rejects.toMatchObject({ code: 'print_not_approved' });
    await expect(
      submitPrintOrder(squareOrder({ proof: { ...proof, pageCount: 32 } }), approval, actor),
    ).rejects.toMatchObject({ code: 'print_not_approved' });
    const wrongCount = squareOrder();
    wrongCount.fulfillment.proof = {
      ...(wrongCount.fulfillment.proof as typeof proof),
      pageCount: 33,
    };
    await expect(submitPrintOrder(wrongCount, approval, actor)).rejects.toMatchObject({
      code: 'print_not_approved',
    });
    await expect(submitPrintOrder(squareOrder(), approval, actor)).rejects.toMatchObject({
      code: 'square_supplier_changed',
    });
    expect(mockQuote).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('prepares a new version for manual square dispatch and requires a hold for edition corrections', async () => {
    const actor = 'operator@example.test';
    await expect(revisePrintProof(squareOrder(), 'manual')).resolves.toMatchObject({
      fulfillment: { provider: 'manual', proofVersion: 2, proof: null, quote: null },
    });
    await expect(
      reserveManualPrint(
        squareOrder(),
        { partnerId: id, proofVersion: 1, checkedInbox: true },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'manual_print_not_ready' });
    await expect(
      correctSquareEdition(
        squareOrder(),
        {
          expectedRevision: id,
          correctedRevision: confirmationId,
          reason: 'Correct a spelling mistake',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'square_correction_not_ready' });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('requires emailed proof for paid square manual release and skips customer email for a staff proof', async () => {
    const actor = 'operator@example.test';
    const approval = { partnerId: id, proofVersion: 1, checkedInbox: true as const };
    const paid = squareOrder({ provider: 'manual', proofSentAt: null as never });
    await expect(reserveManualPrint(paid, approval, actor)).rejects.toMatchObject({
      code: 'manual_print_not_ready',
    });

    const staff = squareOrder({ provider: 'manual', proofSentAt: null as never, copies: 1 });
    staff.request.printingOptions = {
      ...(staff.request.printingOptions as object),
      staffProofRevision: id,
    };
    staff.fulfillment = {
      ...staff.fulfillment,
      status: 'pending',
      ticketId: id,
      proof: null,
      quote: null,
    };
    mockCurrentOrder = staff;
    mockRender.mockResolvedValue({ ...proof, pageCount: 32 });
    const email = jest.spyOn(global, 'fetch');
    const prepared = await processPrintProof(id);
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'manual', binding: 'hardcover', premiumPageCount: 32 }),
    );
    expect(prepared.fulfillment).toMatchObject({ status: 'proof_ready', proofSentAt: null });
    expect(email).not.toHaveBeenCalled();
    expect(mockQuote).not.toHaveBeenCalled();
    await expect(reserveManualPrint(prepared, approval, actor)).resolves.toMatchObject({
      squareOrder: { proofOnly: true, copies: 1 },
    });
    expect(mockEnsureAvailable).toHaveBeenCalledTimes(2);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('prepares Lulu for an existing manual order even when public square checkout is closed', async () => {
    process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
    process.env.LULU_PREMIUM_SQUARE_POD_PACKAGE_ID = PREMIUM_SQUARE_PACKAGE;
    delete process.env.PREMIUM_SQUARE_PRINT_APPROVAL;
    const paid = squareOrder({ provider: 'manual' });
    const options = paid.request.printingOptions as { premiumEdition: Record<string, unknown> };
    delete options.premiumEdition.luluEnvironment;
    delete options.premiumEdition.podPackageId;
    mockCurrentOrder = paid;
    await expect(revisePrintProof(paid, 'lulu')).resolves.toMatchObject({
      fulfillment: { provider: 'lulu', status: 'pending', proofVersion: 2 },
      request: {
        printingOptions: {
          premiumEdition: {
            luluEnvironment: 'sandbox',
            podPackageId: PREMIUM_SQUARE_PACKAGE,
            premiumBook: { revision: id },
          },
        },
      },
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it.each([32, 33])(
    'renders, emails and validates a paid %i-page edition without reading the current story or submitting a job',
    async (pageCount) => {
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      const pending = squareOrder({}, pageCount);
      pending.fulfillment = {
        ...pending.fulfillment,
        status: 'pending',
        ticketId: id,
        proof: null,
        proofSentAt: null,
        quote: null,
      };
      mockCurrentOrder = pending;
      const request = pending.request.printingOptions as {
        premiumEdition: { premiumBook: unknown };
      };
      mockRender.mockResolvedValue({ ...proof, pageCount });
      mockDimensions.mockResolvedValue({ width: 1368, height: 738 });
      mockValidate.mockImplementation(async (kind, _options, _existing, remember) => {
        await remember(kind);
        return kind;
      });
      const sent = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          Response.json({ success: false, data: { deliveryStatus: 'pending' } }, { status: 202 }),
        )
        .mockResolvedValueOnce(Response.json({ success: true, data: { deliveryStatus: 'sent' } }));

      const waitingForMail = await processPrintProof(id);
      expect(waitingForMail.fulfillment).toMatchObject({ status: 'pending', proofSentAt: null });
      expect(mockValidate).not.toHaveBeenCalled();
      const ready = await processPrintProof(id);
      expect(ready.fulfillment).toMatchObject({
        status: 'proof_ready',
        proofSentAt: expect.any(Date),
        quote: { podPackageId: PREMIUM_SQUARE_PACKAGE, totalEur: 30 },
        proof: { interiorValidationId: 'interior', coverValidationId: 'cover', pageCount },
      });
      expect(mockRender).toHaveBeenCalledTimes(2);
      expect(mockRender).toHaveBeenLastCalledWith(
        expect.objectContaining({
          premiumBook: request.premiumEdition.premiumBook,
          premiumPageCount: pageCount,
          podPackageId: PREMIUM_SQUARE_PACKAGE,
        }),
        { width: 1368, height: 738 },
      );
      expect(mockDimensions).toHaveBeenCalledWith({
        podPackageId: PREMIUM_SQUARE_PACKAGE,
        pageCount,
      });
      expect(mockValidate.mock.calls.map(([kind]) => kind)).toEqual(['interior', 'cover']);
      for (const [, options] of mockValidate.mock.calls) {
        expect(options).toMatchObject({
          pageCount,
          podPackageId: PREMIUM_SQUARE_PACKAGE,
          requirePackageMatch: true,
        });
      }
      expect(mockQuote).toHaveBeenCalledWith(expect.objectContaining({ pageCount }));
      expect(mockReadBookManifest).not.toHaveBeenCalled();
      expect(mockVerifyProof).toHaveBeenCalledTimes(2);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(sent).toHaveBeenCalledTimes(2);
      for (const [, init] of sent.mock.calls) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          recipient: { email: 'owner@example.test' },
          proofVersion: 1,
          interiorGeneration: '1',
          coverGeneration: '1',
        });
      }
    },
  );

  it.each(['a stored proof', 'the preliminary render', 'the completed render'])(
    'stops before emailing or validating %s with the wrong page count',
    async (mismatch) => {
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      const pending = squareOrder({}, 33);
      const wrongProof = { ...proof, pageCount: 32 };
      pending.fulfillment = {
        ...pending.fulfillment,
        status: 'pending',
        ticketId: id,
        proof: mismatch === 'a stored proof' ? wrongProof : null,
        proofSentAt: null,
        quote: null,
      };
      mockCurrentOrder = pending;
      mockRender
        .mockResolvedValueOnce(
          mismatch === 'the preliminary render' ? wrongProof : { ...proof, pageCount: 33 },
        )
        .mockResolvedValueOnce(wrongProof);
      mockDimensions.mockResolvedValue({ width: 1368, height: 738 });
      const send = jest.spyOn(global, 'fetch');

      await expect(processPrintProof(id)).resolves.toMatchObject({
        fulfillment: { status: 'manual_review', proofSentAt: null, quote: null },
      });
      expect(mockDimensions).toHaveBeenCalledTimes(Number(mismatch === 'the completed render'));
      expect(mockValidate).not.toHaveBeenCalled();
      expect(mockQuote).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('binds the direct published successor under a hold and archives the previous emailed pair', async () => {
    const held = squareOrder({ status: 'held', holdReason: 'Customer reply' as never });
    mockCurrentOrder = held;
    const options = held.request.printingOptions as {
      premiumEdition: { premiumBook: Record<string, unknown> };
    };
    const replacement = {
      ...options.premiumEdition.premiumBook,
      revision: confirmationId,
      manifest: {
        key: `${id}/premium/revisions/${confirmationId}/manifest.json`,
        generation: '2',
        sha256: 'b'.repeat(64),
        bytes: 260,
      },
    };
    mockPublishedStory = { storyId: id, authorId: id, features: { premiumBook: replacement } };
    mockReadBookManifest
      .mockResolvedValueOnce({ previousRevision: 'different', format: { pageCount: 32 } })
      .mockResolvedValueOnce({ previousRevision: id, format: { pageCount: 33 } })
      .mockResolvedValueOnce({ previousRevision: id, format: { pageCount: 32 } });
    const correction = {
      expectedRevision: id,
      correctedRevision: confirmationId,
      reason: 'Spelling correction',
    };
    const actor = 'operator@example.test';
    await expect(correctSquareEdition(held, correction, actor)).rejects.toMatchObject({
      code: 'square_correction_stale',
    });
    await expect(correctSquareEdition(held, correction, actor)).rejects.toMatchObject({
      code: 'square_correction_page_count_changed',
    });
    expect(mockWrite).not.toHaveBeenCalled();
    const corrected = await correctSquareEdition(held, correction, actor);
    expect(corrected.fulfillment).toMatchObject({
      status: 'held',
      holdReason: 'Customer reply',
      proofVersion: 2,
      proof: null,
      proofSentAt: null,
      quote: null,
    });
    expect(mockDispatchOptions).toMatchObject({
      premiumEdition: { premiumBook: replacement },
      premiumRevisionHistory: [
        {
          previousEdition: { premiumBook: options.premiumEdition.premiumBook },
          replacementRevision: confirmationId,
          previousProofVersion: 1,
          previousProof: { interior: proofFile, cover: proofFile },
          actor,
          reason: correction.reason,
        },
      ],
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it.each([32, 33])(
    'releases a verified %i-page proof once and reconciles an uncertain create before retrying',
    async (pageCount) => {
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      mockSubmit.mockRejectedValueOnce(new Error('Lulu connection lost'));
      const actor = 'operator@example.test';
      const approval = {
        confirmationId,
        confirmedTotalEur: 30,
        checkedInbox: true,
        proofVersion: 1,
      };
      const uncertain = await submitPrintOrder(squareOrder({}, pageCount), approval, actor);
      expect(uncertain.fulfillment.status).toBe('uncertain');
      expect(mockEnsureAvailable).toHaveBeenCalledTimes(2);
      expect(mockQuote).toHaveBeenCalledWith(expect.objectContaining({ pageCount }));
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: orderNumber,
          podPackageId: PREMIUM_SQUARE_PACKAGE,
          copies: 2,
          shippingLevel: 'EXPRESS',
          interiorUrl: 'https://storage.test/signed',
          coverUrl: 'https://storage.test/signed',
        }),
      );
      await submitPrintOrder(uncertain, approval, actor);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects wrong product profiles and oversized carrier addresses before contacting Lulu', async () => {
    const actor = 'operator@example.test';
    const approval = { confirmationId, confirmedTotalEur: 30 };
    const wrongBinding = order();
    wrongBinding.fulfillment.quote = { ...fulfillment.quote, podPackageId: LULU_SKUS.hardcover };
    await expect(submitPrintOrder(wrongBinding, approval, actor)).rejects.toMatchObject({
      code: 'lulu_print_profile_changed',
    });
    const oversized = order({ shippingSnapshot: { ...shippingSnapshot, city: 'X'.repeat(31) } });
    await expect(submitPrintOrder(oversized, approval, actor)).rejects.toMatchObject({
      code: 'shipping_details_required',
    });
    expect(mockQuote).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('requires the current sent, clear, QA-passed proof and exact price', async () => {
    const actor = 'operator@example.test';
    const approval = { confirmationId, confirmedTotalEur: 30 };
    const candidates = [
      order({ proofSentAt: null as unknown as Date }),
      order({ holdReason: 'review guest address' as unknown as null }),
      order({ proof: { ...proof, qaPassed: false } }),
    ];
    for (const candidate of candidates) {
      await expect(submitPrintOrder(candidate, approval, actor)).rejects.toMatchObject({
        code: 'print_not_approved',
      });
    }
    await expect(
      submitPrintOrder(order(), { ...approval, confirmedTotalEur: 29 }, actor),
    ).rejects.toMatchObject({ code: 'print_not_approved' });
    expect(mockQuote).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('refreshes a changed cost without creating a supplier job', async () => {
    mockQuote.mockResolvedValue({ shippingLevel: 'EXPRESS', totalEur: 32 });
    const result = await submitPrintOrder(
      order(),
      { confirmationId, confirmedTotalEur: 30 },
      'operator@example.test',
    );
    expect(result.fulfillment.quote).toMatchObject({ totalEur: 32, perCopyEur: 16 });
    expect(result.fulfillment.quote).not.toMatchObject({ confirmationId });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('applies the EUR ceiling to landed total divided by copies', async () => {
    mockCeiling = '14.99';
    await expect(
      submitPrintOrder(order(), { confirmationId, confirmedTotalEur: 30 }, 'operator@example.test'),
    ).rejects.toMatchObject({ code: 'lulu_ceiling_exceeded' });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('allows review after an explicit supplier validation rejection', async () => {
    mockSubmit.mockRejectedValue(new LuluHttpError(400));
    const result = await submitPrintOrder(
      order(),
      { confirmationId, confirmedTotalEur: 30 },
      'operator@example.test',
    );
    expect(result.fulfillment).toMatchObject({ status: 'manual_review', quote: null });
  });

  it('blocks Lulu release for an existing duplicate order number', async () => {
    mockOrderNumberLookup.mockResolvedValueOnce([{ conflictingPrintRequestId: 'other-request' }]);
    await expect(
      submitPrintOrder(order(), { confirmationId, confirmedTotalEur: 30 }, 'operator@example.test'),
    ).rejects.toMatchObject({ code: 'print_order_number_conflict' });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('reconciles an ambiguous create without ever resubmitting it', async () => {
    mockSubmit.mockRejectedValue(new Error('lost supplier response'));
    mockFind.mockResolvedValue(null);
    const approval = { confirmationId, confirmedTotalEur: 30 };
    const actor = 'operator@example.test';
    const uncertain = await submitPrintOrder(order(), approval, actor);
    expect(uncertain.fulfillment.status).toBe('uncertain');
    expect(mockWrite.mock.calls.map(([values]) => values.status)).toEqual([
      'submitting',
      'uncertain',
    ]);
    await submitPrintOrder(uncertain, approval, actor);
    expect((await reconcilePrintOrder(uncertain)).fulfillment.status).toBe('uncertain');
    expect(mockWrite.mock.calls[0][0]).toMatchObject({ luluExternalId: orderNumber });
    expect(mockFind).toHaveBeenCalledWith(orderNumber);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([null, orderNumber])(
    'reconciles signed callback references with stored ID %s',
    async (storedId) => {
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      const externalId = storedId ?? id;
      mockCurrentOrder = order({ status: 'uncertain', luluExternalId: storedId });
      mockFind.mockResolvedValue({
        id: '77',
        status: 'CREATED',
        externalId,
        tracking: [],
        lines: [{ external_id: externalId + '-1' }],
      });

      await reconcileLuluWebhook('77', externalId);

      expect(mockFind).toHaveBeenCalledWith(externalId);
      expect(mockCurrentOrder.fulfillment).toMatchObject({ status: 'submitted' });
    },
  );

  it('cancels a cancelable submitted Lulu job and rejects canceling in-production jobs', async () => {
    process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
    const submitted = order({
      status: 'submitted',
      vendor: {
        id: '77',
        status: 'UNPAID',
        externalId: id,
        tracking: [],
        lines: [{ external_id: id + '-1', tracking_urls: [] }],
      } as never,
    });
    mockCurrentOrder = submitted;
    mockCancel.mockResolvedValue({ name: 'CANCELED', line_item_statuses: [] });
    mockGetJob.mockResolvedValue({
      id: '77',
      status: 'CANCELED',
      externalId: id,
      tracking: [],
      lines: [{ external_id: id + '-1', tracking_urls: [] }],
    });
    const canceled = await cancelSubmittedLuluOrder(
      submitted,
      'Admin canceled due to address typo',
      'operator@example.test',
    );
    expect(mockCancel).toHaveBeenCalledWith('77');
    expect(canceled.fulfillment.vendor).toMatchObject({ id: '77', status: 'CANCELED' });

    const inProduction = order({
      status: 'submitted',
      vendor: {
        id: '78',
        status: 'IN_PRODUCTION',
        externalId: id,
        tracking: [],
        lines: [{ external_id: id + '-1', tracking_urls: [] }],
      } as never,
    });
    await expect(
      cancelSubmittedLuluOrder(inProduction, 'Too late', 'operator@example.test'),
    ).rejects.toMatchObject({ code: 'lulu_cancel_unavailable' });
  });

  it('prepares and submits multi-copy adminPrintOrder orders without sending customer proof email', async () => {
    process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
    const adminOrder = order({
      status: 'held',
      ticketId: id,
      holdReason: null as never,
      proof: null as never,
      quote: null as never,
      proofSentAt: null as never,
      copies: 2,
    } as never);
    adminOrder.request.printingOptions = { adminPrintOrder: true, orderKind: 'admin_order' };
    mockCurrentOrder = adminOrder;
    mockRender.mockResolvedValue(proof);
    mockDimensions.mockResolvedValue({ width: 1000, height: 650 });
    mockValidate.mockResolvedValue('val-1');
    const fetchSpy = jest.spyOn(global, 'fetch');

    const prepared = await preparePrintOrderNow(adminOrder);
    expect(prepared.fulfillment.status).toBe('proof_ready');
    expect(prepared.fulfillment.proofSentAt).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    mockCurrentOrder = prepared;
    const readyQuote = prepared.fulfillment.quote as { confirmationId: string; totalEur: number };
    mockSubmit.mockResolvedValue({
      id: '99',
      status: 'CREATED',
      externalId: orderNumber,
      tracking: [],
      lines: [{ external_id: orderNumber + '-1', tracking_urls: [] }],
    });
    mockGetJobCosts.mockResolvedValue({
      currency: 'EUR',
      total: 30,
      amountExclTax: '25.00',
      fees: [],
    });
    const dispatched = await submitPrintOrder(
      prepared,
      { confirmationId: readyQuote.confirmationId, confirmedTotalEur: readyQuote.totalEur },
      'operator@example.test',
    );
    expect(dispatched.fulfillment.status).toBe('submitted');
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ copies: 2 }));
  });

  it('exposes unpaid/cancelable flags on Lulu vendor views without breaking manual_dispatching vendor objects', async () => {
    const unpaidLulu = order({
      provider: 'lulu',
      status: 'submitted',
      vendor: {
        id: '77',
        status: 'UNPAID',
        externalId: id,
        tracking: [],
        lines: [{ external_id: id + '-1', tracking_urls: [] }],
      } as never,
    });
    await expect(printOrderView(unpaidLulu)).resolves.toMatchObject({
      vendor: { id: '77', status: 'UNPAID', unpaid: true, cancelable: true },
    });

    const manualDispatching = order({
      provider: 'manual',
      status: 'manual_dispatching',
      vendor: { reservationId: 'r1', partnerId: 'p1' } as never,
    });
    await expect(printOrderView(manualDispatching)).resolves.toMatchObject({
      vendor: { reservationId: 'r1', partnerId: 'p1' },
    });
  });
});
