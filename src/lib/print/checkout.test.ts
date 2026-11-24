/** @jest-environment node */
import { creditLedger, printFulfillments, printRequests } from '@/db/schema';
import { LULU_SKUS } from '@/lib/lulu/products';
import { PREMIUM_SQUARE_PACKAGE } from './premium-edition';

const mockStatements: unknown[] = [];
const mockInserts = jest.fn();
const mockValues = jest.fn();
const mockLoadManifest = jest.fn();
const mockTransaction = jest.fn();
const mockFetch = jest.fn();

function mockBuilder() {
  const builder: unknown = new Proxy(
    {},
    {
      get(_target, operation) {
        if (operation === 'then') {
          return (resolve: (value: unknown) => unknown) =>
            Promise.resolve(mockStatements.shift()).then(resolve);
        }
        return () => builder;
      },
    },
  );
  return builder;
}

jest.mock('@/db', () => ({
  db: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
    select: () => mockBuilder(),
    update: () => mockBuilder(),
  },
}));
jest.mock('@/lib/premium-children-book/storage', () => ({
  loadPublishedPremiumBook: (...args: unknown[]) => mockLoadManifest(...args),
}));
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({
    admin: { apiUrl: 'https://admin.test', apiKey: 'admin-key' },
    storyGeneration: { apiKey: 'sgw-key' },
    notification: { apiKey: 'notification-key' },
  }),
}));

import { getPublicPrintOptions, startPrintCheckout } from './checkout';
import { createStaffPrintProof } from './staff-proof';

const storyId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const shippingId = '8d9f18f9-6a1f-4acd-ac13-a4da2b998cee';
const intentId = 'bac88002-1d44-4451-9285-d4bd2485a4ec';
const orderId = 'e3c00abe-c343-428e-9b0e-138fe8e3d3a0';
const ticketId = 'b53517fe-a406-493b-bda7-9cad123bd371';
const revision = 'b63517fe-a406-493b-bda7-9cad123bd372';
const premiumBook = {
  version: 1,
  type: 'premium_children',
  state: 'published',
  revision,
  manifest: {
    key: `${storyId}/premium/revisions/${revision}/manifest.json`,
    generation: '33',
    sha256: 'a'.repeat(64),
    bytes: 1024,
  },
};
const squareStory = {
  storyId,
  title: 'Story',
  authorId: 'author',
  chapterCount: 9,
  features: { premiumBook },
};
const fees = [
  { serviceCode: 'shippingCost', credits: 3 },
  { serviceCode: 'extraBookCopy', credits: 4 },
];

describe('paid print checkout recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', {
      ...process.env,
      PRINT_PROOF_BUCKET: 'private-print-proofs',
      PRINT_INTERNAL_AUDIENCE: 'https://webapp.test',
      PRINT_ADMIN_SERVICE_ACCOUNT: 'admin@test.example',
      PRINT_SCHEDULER_SERVICE_ACCOUNT: 'scheduler@test.example',
    });
    mockStatements.length = 0;
    mockLoadManifest.mockResolvedValue({ format: { pageCount: 32 } });
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        execute: jest.fn().mockResolvedValue(undefined),
        select: mockBuilder,
        update: mockBuilder,
        insert: (table: unknown) => {
          mockInserts(table);
          return {
            values: (values: unknown) => {
              mockValues(table, values);
              return mockBuilder();
            },
          };
        },
      }),
    );
    jest.spyOn(global, 'fetch').mockImplementation(mockFetch);
  });

  afterEach(() => jest.restoreAllMocks());

  function configureSquare(approved = true, mode = 'manual') {
    process.env.LULU_PREMIUM_SQUARE_POD_PACKAGE_ID = PREMIUM_SQUARE_PACKAGE;
    process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
    process.env.LULU_PRINT_CLIENT_KEY = 'fixture';
    process.env.LULU_PRINT_SECRET_VERSION = 'projects/test/secrets/test/versions/1';
    process.env.LULU_PRINT_CONTACT_EMAIL = 'test@example.test';
    if (approved) process.env.PREMIUM_SQUARE_PRINT_APPROVAL = `${mode}:physical-proof-1`;
    else delete process.env.PREMIUM_SQUARE_PRINT_APPROVAL;
  }

  it.each([
    ['none', false],
    ['lulu', false],
    ['none', true],
    ['lulu', true],
  ] as const)(
    'resolves square options with default %s and physical approval %s',
    async (defaultProvider, approved) => {
      configureSquare(approved, defaultProvider === 'none' ? 'manual' : 'sandbox');
      mockStatements.push(
        [{ defaultProvider, maxEurPerCopy: defaultProvider === 'none' ? '0' : '25' }],
        [{ credits: 12, active: true }],
        [squareStory],
        fees,
      );
      await expect(getPublicPrintOptions({ storyId, authorId: 'author' })).resolves.toEqual({
        paperbackAvailable: false,
        hardcoverAvailable: approved,
        luluDefault: defaultProvider === 'lulu',
        squareEditionRevision: approved ? revision : undefined,
      });
      expect(mockLoadManifest).toHaveBeenCalledTimes(Number(approved));
    },
  );

  it('keeps a matching Lulu approval valid when only the default changes to manual', async () => {
    configureSquare(true, 'sandbox');
    for (const defaultProvider of ['lulu', 'none']) {
      mockStatements.push(
        [{ defaultProvider, maxEurPerCopy: '25' }],
        [{ credits: 12, active: true }],
        [squareStory],
        fees,
      );
      await expect(getPublicPrintOptions({ storyId, authorId: 'author' })).resolves.toMatchObject({
        luluDefault: defaultProvider === 'lulu',
        hardcoverAvailable: true,
        squareEditionRevision: revision,
      });
    }
  });

  it.each(['manual', 'production'])(
    'does not allow Lulu checkout in sandbox with a %s approval',
    async (approval) => {
      configureSquare(true, approval);
      mockStatements.push(
        [{ defaultProvider: 'lulu', maxEurPerCopy: '25' }],
        [{ credits: 12, active: true }],
        [squareStory],
      );
      await expect(getPublicPrintOptions({ storyId, authorId: 'author' })).resolves.toMatchObject({
        hardcoverAvailable: false,
      });
      expect(mockLoadManifest).not.toHaveBeenCalled();
    },
  );

  const buyer = { authorId: 'author', displayName: 'Name', email: 'buyer@example.test' };
  const squareForm = {
    storyId,
    shippingId,
    intentId,
    totalCost: 19,
    numberOfCopies: 2,
    printingOption: { serviceCode: 'printedHardCover' as const, editionRevision: revision },
    recipient: {
      name: 'Recipient',
      email: 'recipient@example.test',
      phone_number: '+351210000000',
    },
  };

  function stageSquareCheckout() {
    mockStatements.push(
      [],
      [squareStory],
      [
        {
          addressId: shippingId,
          country: 'PT',
          line1: 'Rua 1',
          city: 'Lisboa',
          postalCode: '1000-001',
        },
      ],
      [{ id: 'provider', availableCountries: ['PT'] }],
      [{ defaultProvider: 'none', maxEurPerCopy: '25' }],
      [
        { serviceCode: 'printedHardCover', credits: 12 },
        { serviceCode: 'extraChapterCost', credits: 99 },
        ...fees,
      ],
      [{ totalCredits: 25 }],
    );
  }

  it.each([32, 33])(
    'freezes the %i-page manual edition at the existing hardcover price with None selected',
    async (pageCount) => {
      configureSquare(true, pageCount === 32 ? 'sandbox' : 'manual');
      mockLoadManifest.mockResolvedValue({ format: { pageCount } });
      stageSquareCheckout();
      const request = { id: orderId, storyId, shippingId, requestedAt: new Date() };
      const staged = {
        authorId: buyer.authorId,
        creditsSpent: 19,
        status: 'awaiting_ticket',
        binding: 'hardcover',
      };
      const paid = { ...staged, ticketId, status: 'pending' };
      mockStatements.push([request], [staged], [staged], [{ totalCredits: 6 }], undefined, [paid]);
      mockFetch.mockResolvedValueOnce(
        Response.json({ id: ticketId, metadata: { printRequestId: orderId } }),
      );
      await expect(startPrintCheckout(squareForm, buyer)).resolves.toMatchObject({
        fulfillment: paid,
      });
      expect(mockValues).toHaveBeenCalledWith(
        printRequests,
        expect.objectContaining({
          printingOptions: expect.objectContaining({
            totalCost: 19,
            extraChapters: 0,
            premiumEdition: {
              profile: 'premium_square_casewrap',
              pageCount,
              premiumBook,
            },
          }),
        }),
      );
      expect(mockValues).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          provider: 'manual',
          binding: 'hardcover',
          creditsSpent: 19,
        }),
      );
      expect(mockValues).toHaveBeenCalledWith(
        creditLedger,
        expect.objectContaining({ amount: -19, idempotencyKey: `print_order:${orderId}` }),
      );
    },
  );

  it('fails before ticketing or charging for unapproved sales, stale editions, or a paperback downgrade', async () => {
    configureSquare(false);
    stageSquareCheckout();
    await expect(startPrintCheckout(squareForm, buyer)).rejects.toMatchObject({
      code: 'square_print_unavailable',
    });
    mockStatements.length = 0;
    configureSquare();
    stageSquareCheckout();
    await expect(
      startPrintCheckout(
        { ...squareForm, printingOption: { serviceCode: 'printedHardCover' } },
        buyer,
      ),
    ).rejects.toMatchObject({ code: 'print_edition_changed' });
    mockStatements.length = 0;
    stageSquareCheckout();
    await expect(
      startPrintCheckout(
        { ...squareForm, printingOption: { serviceCode: 'printedSoftCover' } },
        buyer,
      ),
    ).rejects.toMatchObject({ code: 'square_print_unavailable' });
    expect(mockValues).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    [{ line1: 'X'.repeat(31) }, {}, 'each shipping address line'],
    [{ line2: 'X'.repeat(31) }, {}, 'each shipping address line'],
    [{ city: 'X'.repeat(31) }, {}, 'the city'],
    [{}, { name: 'X'.repeat(36) }, '35 characters'],
    [{}, { phone_number: '+351' + '2'.repeat(17) }, '8 to 20 characters'],
    [{ country: 'ES', stateRegion: 'Madrid' }, {}, 'short state, province, or region code'],
  ])(
    'rejects invalid Lulu shipping before reserving or deducting credits',
    async (address, recipient, message) => {
      process.env.LULU_PAPERBACK_POD_PACKAGE_ID = LULU_SKUS.paperback;
      process.env.LULU_PRINT_ENVIRONMENT = 'sandbox';
      process.env.LULU_PRINT_CLIENT_KEY = 'test-key';
      process.env.LULU_PRINT_SECRET_VERSION = 'projects/test/secrets/test/versions/1';
      process.env.LULU_PRINT_CONTACT_EMAIL = 'test@example.test';
      const country = 'country' in address ? address.country : 'PT';
      mockStatements.push(
        [],
        [{ storyId, title: 'Story', chapterCount: 4 }],
        [
          {
            addressId: shippingId,
            country,
            line1: 'Rua 1',
            city: 'Lisboa',
            postalCode: '1000-001',
            ...address,
          },
        ],
        [{ id: 'provider', availableCountries: [country] }],
        [{ defaultProvider: 'lulu' }],
        [{ serviceCode: 'printedSoftCover', credits: 10 }],
      );

      await expect(
        startPrintCheckout(
          {
            storyId,
            shippingId,
            intentId,
            totalCost: 10,
            numberOfCopies: 1,
            printingOption: { serviceCode: 'printedSoftCover' },
            recipient: {
              name: 'Name',
              email: 'author@example.test',
              phone_number: '+351210000000',
              ...recipient,
            },
          },
          { authorId: 'author', displayName: 'Name', email: 'author@example.test' },
        ),
      ).rejects.toMatchObject({
        code: 'shipping_details_required',
        message: expect.stringContaining(message),
      });
      expect(mockInserts).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('reuses the same order ID after Admin loses a ticket response and charges once after retry', async () => {
    const request = { id: orderId, storyId, shippingId, requestedAt: new Date() };
    const staged = {
      status: 'awaiting_ticket',
      authorId: 'author',
      creditsSpent: 10,
      copies: 1,
      binding: 'paperback',
      shippingSnapshot: { addressId: shippingId },
    };
    const paid = { ...staged, status: 'pending', ticketId };
    const author = { authorId: 'author', displayName: 'Name', email: 'author@example.test' };
    const form = {
      storyId,
      shippingId,
      intentId,
      totalCost: 10,
      numberOfCopies: 1,
      printingOption: { serviceCode: 'printedSoftCover' as const },
    };
    mockStatements.push(
      [],
      [{ storyId, title: 'Story', chapterCount: 4 }],
      [{ addressId: shippingId, country: 'PT', line1: 'Rua 1', city: 'Lisboa' }],
      [{ id: 'provider', availableCountries: ['PT'] }],
      [],
      [{ serviceCode: 'printedSoftCover', credits: 10 }],
      [{ totalCredits: 20 }],
      [request],
      [staged],
    );
    mockFetch.mockRejectedValueOnce(new Error('connection dropped after ticket creation'));
    await expect(startPrintCheckout(form, author)).rejects.toMatchObject({
      code: 'print_ticket_pending',
    });
    expect(mockInserts.mock.calls.flat()).not.toContain(creditLedger);

    mockStatements.push([{ request, fulfillment: staged }]);
    mockFetch.mockResolvedValueOnce(
      Response.json({ id: ticketId, metadata: { printRequestId: intentId } }),
    );
    await expect(startPrintCheckout(form, author)).rejects.toMatchObject({
      code: 'print_ticket_pending',
    });
    expect(mockInserts.mock.calls.flat()).not.toContain(creditLedger);

    mockStatements.push(
      [{ request, fulfillment: staged }],
      [staged],
      [{ totalCredits: 10 }],
      undefined,
      [paid],
    );
    mockFetch.mockResolvedValueOnce(
      Response.json({ id: ticketId, metadata: { printRequestId: orderId } }),
    );
    await expect(startPrintCheckout(form, author)).resolves.toMatchObject({ fulfillment: paid });
    expect(
      mockFetch.mock.calls.map(([url, options]) => ({
        endpoint: String(url),
        orderDetails: JSON.parse(options.body).orderDetails,
      })),
    ).toEqual(
      Array.from({ length: 3 }, () => ({
        endpoint: 'https://admin.test/api/tickets/paid-print',
        orderDetails: { fulfillmentVersion: 1, printRequestId: orderId },
      })),
    );
    expect(mockInserts.mock.calls.flat().filter((table) => table === creditLedger)).toHaveLength(1);

    mockStatements.push([{ request, fulfillment: paid }]);
    await expect(startPrintCheckout(form, author)).resolves.toMatchObject({ duplicate: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockInserts.mock.calls.flat().filter((table) => table === creditLedger)).toHaveLength(1);
  });

  it('links exactly one staff copy while checkout is disabled and reuses the reservation after a lost ticket response', async () => {
    delete process.env.PREMIUM_SQUARE_PRINT_APPROVAL;
    const actor = 'operator@example.test';
    const shippingAddress = {
      name: 'Staff',
      street1: 'Example 1',
      city: 'Lisbon',
      postcode: '1000-001',
      country_code: 'PT',
      phone_number: '+351210000000',
      email: actor,
    };
    const input = { storyId, revision, shippingAddress };
    const request = {
      id: orderId,
      storyId,
      requestedAt: new Date(),
      printingOptions: { staffProofRevision: revision, requestedBy: actor },
    };
    const fulfillment = {
      authorId: squareStory.authorId,
      binding: 'hardcover',
      copies: 1,
      creditsSpent: 0,
      provider: 'manual',
    };
    mockStatements.push(
      [],
      [squareStory],
      [{ id: 'provider', availableCountries: ['PT'] }],
      [request],
      [fulfillment],
    );
    mockFetch.mockRejectedValueOnce(new Error('connection dropped after ticket creation'));
    await expect(createStaffPrintProof(input, actor)).rejects.toMatchObject({
      code: 'print_ticket_pending',
    });

    mockStatements.push([{ request, fulfillment }], undefined);
    mockFetch.mockResolvedValueOnce(
      Response.json({
        id: ticketId,
        metadata: { printRequestId: orderId, staffProofRevision: revision },
      }),
    );
    await expect(createStaffPrintProof(input, actor)).resolves.toEqual({ ticketId });

    mockStatements.push([{ request, fulfillment: { ...fulfillment, ticketId } }]);
    await expect(createStaffPrintProof(input, actor)).resolves.toEqual({ ticketId });
    expect(mockInserts.mock.calls.flat()).toEqual([printRequests, printFulfillments]);
    expect(mockValues).toHaveBeenCalledWith(
      printFulfillments,
      expect.objectContaining({ ...fulfillment, shippingSnapshot: shippingAddress }),
    );
    expect(mockFetch.mock.calls).toHaveLength(2);
    for (const [url, options] of mockFetch.mock.calls) {
      expect(String(url)).toBe('https://admin.test/api/tickets/staff-print');
      expect(JSON.parse(options.body)).toMatchObject({
        numberOfCopies: 1,
        orderDetails: { printRequestId: orderId, proofOnly: { revision, requestedBy: actor } },
      });
    }
  });
});
