/** @jest-environment node */
import { creditLedger } from '@/db/schema';
import { LULU_SKUS } from '@/lib/lulu/products';

const mockStatements: unknown[] = [];
const mockInserts = jest.fn();
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
  db: { transaction: (...args: unknown[]) => mockTransaction(...args) },
}));
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({
    admin: { apiUrl: 'https://admin.test', apiKey: 'admin-key' },
    storyGeneration: { apiKey: 'sgw-key' },
    notification: { apiKey: 'notification-key' },
  }),
}));

import { startPrintCheckout } from './checkout';

const storyId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const shippingId = '8d9f18f9-6a1f-4acd-ac13-a4da2b998cee';
const intentId = 'bac88002-1d44-4451-9285-d4bd2485a4ec';
const orderId = 'e3c00abe-c343-428e-9b0e-138fe8e3d3a0';
const ticketId = 'b53517fe-a406-493b-bda7-9cad123bd371';

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
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        execute: jest.fn().mockResolvedValue(undefined),
        select: mockBuilder,
        update: mockBuilder,
        insert: (table: unknown) => {
          mockInserts(table);
          return mockBuilder();
        },
      }),
    );
    jest.spyOn(global, 'fetch').mockImplementation(mockFetch);
  });

  afterEach(() => jest.restoreAllMocks());

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
});
