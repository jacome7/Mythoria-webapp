import {
  buildStripeCheckoutLineItems,
  buildPaymentOrderPurchasePayload,
  getStripeRefundAmountCents,
  mapToStripeCheckoutLocale,
  paymentService,
  type CreditPackage,
} from './payment';
import { webcrypto } from 'crypto';

describe('paymentService.calculateOrderTotal', () => {
  it('calculates totals for valid packages', async () => {
    const getPkgSpy = jest
      .spyOn(paymentService, 'getCreditPackage')
      .mockImplementation(async (id) => {
        if (id === 1) {
          return { id: 1, credits: 100, price: 10 } as CreditPackage;
        }
        if (id === 2) {
          return { id: 2, credits: 200, price: 18 } as CreditPackage;
        }
        return undefined;
      });

    const result = await paymentService.calculateOrderTotal([
      { packageId: 1, quantity: 2 },
      { packageId: 2, quantity: 1 },
    ]);

    expect(result.totalCredits).toBe(400);
    expect(result.totalAmount).toBe(38);
    expect(result.itemsBreakdown).toHaveLength(2);
    getPkgSpy.mockRestore();
  });

  it('throws for invalid package id', async () => {
    jest.spyOn(paymentService, 'getCreditPackage').mockResolvedValue(undefined);
    await expect(
      paymentService.calculateOrderTotal([{ packageId: 99, quantity: 1 }]),
    ).rejects.toThrow('Invalid package ID: 99');
  });
});

describe('paymentService.constructStripeWebhookEvent', () => {
  const webhookSecret = 'whsec_test_secret';

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const globalWithFetch = globalThis as typeof globalThis & { fetch?: typeof fetch };
    globalWithFetch.fetch = globalWithFetch.fetch || jest.fn();
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  });

  it('constructs a Stripe event for a valid signature', async () => {
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
        },
      },
    });
    const crypto = await import('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    const signature = `t=${timestamp},v1=${signatureHash}`;

    const event = await paymentService.constructStripeWebhookEvent(payload, signature);

    expect(event.id).toBe('evt_test');
    expect(event.type).toBe('checkout.session.completed');
  });

  it('throws for an invalid Stripe signature', async () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event' });

    await expect(paymentService.constructStripeWebhookEvent(payload, 'invalid')).rejects.toThrow();
  });
});

describe('buildStripeCheckoutLineItems', () => {
  const previousTaxCode = process.env.STRIPE_CREDIT_TAX_CODE;

  afterEach(() => {
    if (previousTaxCode === undefined) {
      delete process.env.STRIPE_CREDIT_TAX_CODE;
    } else {
      process.env.STRIPE_CREDIT_TAX_CODE = previousTaxCode;
    }
  });

  it('creates tax-inclusive EUR line items for credit packages', () => {
    delete process.env.STRIPE_CREDIT_TAX_CODE;

    const [lineItem] = buildStripeCheckoutLineItems([
      {
        packageId: 1,
        quantity: 2,
        credits: 100,
        unitPrice: 9.99,
        totalPrice: 19.98,
      },
    ]);

    expect(lineItem).toMatchObject({
      quantity: 2,
      price_data: {
        currency: 'eur',
        unit_amount: 999,
        tax_behavior: 'inclusive',
        product_data: {
          name: '100 Mythoria Credits',
          metadata: {
            mythoriaPackageId: '1',
          },
        },
      },
    });
  });

  it('adds the configured Stripe Tax code when present', () => {
    process.env.STRIPE_CREDIT_TAX_CODE = 'txcd_test';

    const [lineItem] = buildStripeCheckoutLineItems([
      {
        packageId: 2,
        quantity: 1,
        credits: 250,
        unitPrice: 20,
        totalPrice: 20,
      },
    ]);

    expect(lineItem?.price_data?.product_data).toMatchObject({
      tax_code: 'txcd_test',
    });
  });
});

describe('mapToStripeCheckoutLocale', () => {
  it.each([
    ['en-US', 'en'],
    ['pt-PT', 'pt'],
    ['es-ES', 'es'],
    ['fr-FR', 'fr'],
    ['de-DE', 'de'],
  ])('maps Mythoria locale %s to Stripe locale %s', (mythoriaLocale, stripeLocale) => {
    expect(mapToStripeCheckoutLocale(mythoriaLocale)).toBe(stripeLocale);
  });

  it('falls back to auto for unsupported locale input', () => {
    expect(mapToStripeCheckoutLocale('it-IT')).toBe('auto');
    expect(mapToStripeCheckoutLocale()).toBe('auto');
  });
});

describe('buildPaymentOrderPurchasePayload', () => {
  it('uses stored package lines and final Stripe totals as the shared purchase payload', () => {
    const order = {
      orderId: 'order-123',
      amount: 3800,
      currency: 'EUR',
      creditBundle: { credits: 400, price: 38 },
      metadata: {
        orderTotals: {
          totalCredits: 400,
          totalAmount: 38,
          itemsBreakdown: [
            {
              packageId: 1,
              packageKey: 'starter',
              quantity: 2,
              credits: 100,
              unitPrice: 10,
              totalPrice: 20,
            },
            {
              packageId: 2,
              packageKey: 'creator',
              quantity: 1,
              credits: 200,
              unitPrice: 18,
              totalPrice: 18,
            },
          ],
        },
        stripe: {
          amountTotal: 3700,
          paymentMethodType: 'card',
          totalDetails: { amount_tax: 209, amount_discount: 100, amount_shipping: 0 },
        },
      },
    } as unknown as Parameters<typeof buildPaymentOrderPurchasePayload>[0];

    const webhookPayload = buildPaymentOrderPurchasePayload(order);
    const browserPayload = buildPaymentOrderPurchasePayload(order);

    expect(browserPayload).toEqual(webhookPayload);
    expect(webhookPayload).toMatchObject({
      transaction_id: 'order-123',
      value: 34.91,
      tax: 2.09,
    });
    expect(webhookPayload).not.toHaveProperty('gross_value');
    expect(webhookPayload).not.toHaveProperty('payment_type');
    expect(webhookPayload.items).toHaveLength(2);
  });

  it('provides a stable legacy item when old metadata has no breakdown', () => {
    const order = {
      orderId: 'legacy-order',
      amount: 999,
      currency: 'eur',
      creditBundle: { credits: 100, price: 9.99 },
      metadata: null,
    } as unknown as Parameters<typeof buildPaymentOrderPurchasePayload>[0];

    expect(buildPaymentOrderPurchasePayload(order)).toMatchObject({
      transaction_id: 'legacy-order',
      value: 9.99,
      tax: 0,
      items: [{ item_id: 'credit_package_legacy_100', quantity: 1, price: 9.99 }],
    });
    expect(buildPaymentOrderPurchasePayload(order)).not.toHaveProperty('gross_value');
  });
});

describe('getStripeRefundAmountCents', () => {
  it('uses the webhook delta for repeated partial refunds', () => {
    const charge = { amount_refunded: 700, refunds: { data: [] } } as any;
    const event = {
      data: { object: charge, previous_attributes: { amount_refunded: 400 } },
    } as any;

    expect(getStripeRefundAmountCents(event, charge)).toBe(300);
  });

  it('falls back to Stripe latest refund amount when previous attributes are absent', () => {
    const charge = {
      amount_refunded: 700,
      refunds: {
        data: [
          { amount: 400, created: 10 },
          { amount: 300, created: 20 },
        ],
      },
    } as any;
    const event = { data: { object: charge } } as any;

    expect(getStripeRefundAmountCents(event, charge)).toBe(300);
  });
});
