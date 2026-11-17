/** @jest-environment node */
const mockTransaction = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockStripe = {
  checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
};

/** Chainable Drizzle stand-in: builder calls return itself; awaiting yields `result`. */
function mockChain(result: unknown, onValues?: (values: unknown) => void): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        if (prop === 'values' && onValues) {
          return (values: unknown) => {
            onValues(values);
            return proxy;
          };
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

jest.mock('../index', () => ({
  db: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
    select: () => mockChain([]),
    update: () => mockChain([]),
    insert: () => mockChain([]),
  },
}));
jest.mock('./referrals', () => ({
  referralLock: jest.fn(),
  accrueOrderCommission: jest.fn(),
  captureOrderReferral: jest.fn(),
  adjustProviderCommission: jest.fn(),
}));
jest.mock('./fiscal-documents', () => ({
  fiscalDocumentService: { issueForCompletedStripeOrder: jest.fn() },
}));
jest.mock('../../lib/notifications/client', () => ({
  notificationClient: { sendCreditsAddedNotification: jest.fn() },
}));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('stripe', () => ({ __esModule: true, default: jest.fn(() => mockStripe) }));

import { paymentOrders } from '../schema';
import { buildCreditOrderConversionInput, paymentService } from './payment';
import type { PaymentOrder } from '../schema';

const adContext = {
  adConsent: 'granted' as const,
  oppref: 'opp-1',
  obref: 'ob-1',
  ipAddress: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
  sourceUrl: 'https://mythoria.pt/en-US/buy-credits',
  capturedAt: '2026-11-16T10:00:00.000Z',
};

const starterBreakdown = {
  totalCredits: 100,
  totalAmount: 9.99,
  itemsBreakdown: [
    {
      packageId: 1,
      packageKey: 'starter',
      quantity: 1,
      credits: 100,
      unitPrice: 9.99,
      totalPrice: 9.99,
    },
  ],
};

function order(overrides: Record<string, unknown> = {}): PaymentOrder {
  return {
    orderId: 'order-1',
    authorId: 'author-1',
    amount: 999,
    currency: 'eur',
    status: 'pending',
    creditBundle: { credits: 100, price: 9.99 },
    metadata: {
      orderTotals: starterBreakdown,
      stripe: { amountTotal: 1049 },
      ads: adContext,
    },
    ...overrides,
  } as unknown as PaymentOrder;
}

describe('buildCreditOrderConversionInput', () => {
  it('uses the final Stripe VAT-inclusive total and the GA4 package id', () => {
    expect(buildCreditOrderConversionInput(order())).toEqual({
      orderId: 'order-1',
      amountCents: 1049,
      currency: 'EUR',
      packageKey: 'credit_package_starter',
      packageName: '100 Mythoria Credits',
      credits: 100,
    });
  });

  it('falls back to the order amount and a legacy package for old metadata', () => {
    expect(buildCreditOrderConversionInput(order({ metadata: null }))).toMatchObject({
      amountCents: 999,
      packageKey: 'credit_package_legacy_100',
      credits: 100,
    });
  });
});

describe('paymentService.completeOrder OpenAI Ads conversion', () => {
  function completionTx(updated: PaymentOrder | undefined) {
    const tx = {
      update: jest.fn(() => mockChain(updated ? [updated] : [])),
      insert: jest.fn(() => mockChain([])),
      select: jest.fn(() => mockChain([{ value: 1 }])),
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));
    return tx;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('enqueues order_created in the completion transaction with the stored ad context', async () => {
    const tx = completionTx(order({ status: 'completed' }));

    await paymentService.completeOrder(order(), { source: 'stripe' });

    expect(mockEnqueueAdConversion).toHaveBeenCalledTimes(1);
    const [executor, input] = mockEnqueueAdConversion.mock.calls[0];
    expect(executor).toBe(tx);
    expect(input).toMatchObject({
      conversion: {
        eventType: 'order_created',
        eventId: 'order_order-1',
        data: {
          type: 'contents',
          amount: 1049,
          currency: 'EUR',
          contents: [{ id: 'credit_package_starter', quantity: 1, amount: 1049 }],
        },
      },
      authorId: 'author-1',
      adContext,
      occurredAt: expect.any(Date),
    });
  });

  it('sends a null context for orders without stored ads metadata', async () => {
    completionTx(order({ status: 'completed', metadata: { stripe: { amountTotal: 500 } } }));

    await paymentService.completeOrder(order(), { source: 'stripe' });

    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ adContext: null }),
    );
  });

  it('still completes the order when the stored metadata cannot be turned into a conversion', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    completionTx(
      order({
        status: 'completed',
        metadata: { orderTotals: { itemsBreakdown: 'not-an-array' } },
      } as unknown as Partial<PaymentOrder>),
    );

    await expect(
      paymentService.completeOrder(order(), { source: 'stripe' }),
    ).resolves.not.toThrow();
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });

  it('skips zero-amount orders and orders completed elsewhere', async () => {
    completionTx(
      order({ status: 'completed', amount: 0, metadata: { stripe: { amountTotal: 0 } } }),
    );
    await paymentService.completeOrder(order(), { source: 'stripe' });
    completionTx(undefined);
    await paymentService.completeOrder(order(), { source: 'stripe' });
    await paymentService.completeOrder(order({ status: 'completed' }), { source: 'stripe' });

    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});

describe('paymentService.createStripeCheckoutSession ad context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('stores the sanitized ad context as metadata.ads on the new order', async () => {
    const inserted: unknown[] = [];
    const created = { ...order(), createdAt: new Date(), providerOrderId: null };
    const tx = {
      select: jest.fn(() => mockChain([])),
      insert: jest.fn((table: unknown) =>
        mockChain(table === paymentOrders ? [created] : [], (values) => {
          if (table === paymentOrders) inserted.push(values);
        }),
      ),
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));
    jest.spyOn(paymentService, 'calculateOrderTotal').mockResolvedValue(starterBreakdown);
    jest.spyOn(paymentService, 'findOrCreateStripeCustomer').mockResolvedValue('cus_1');
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_1',
      url: 'https://checkout.stripe.test/cs_1',
      payment_status: 'unpaid',
    });

    await paymentService.createStripeCheckoutSession({
      userId: 'author-1',
      email: 'a@example.com',
      displayName: 'A',
      creditPackages: [{ packageId: 1, quantity: 1 }],
      successUrl: 'https://mythoria.pt/ok',
      cancelUrl: 'https://mythoria.pt/cancel',
      adContext: { ...adContext, adConsent: 'denied' },
    });

    expect(inserted).toHaveLength(1);
    expect((inserted[0] as { metadata: { ads?: unknown } }).metadata.ads).toEqual({
      adConsent: 'denied',
      sourceUrl: adContext.sourceUrl,
      capturedAt: adContext.capturedAt,
    });
  });
});
