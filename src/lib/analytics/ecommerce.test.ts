import {
  buildCheckoutPayload,
  buildPurchasePayload,
  sanitizeClientAnalyticsContext,
  type CreditOrderTotals,
} from './ecommerce';

const orderTotals: CreditOrderTotals = {
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
};

describe('GA4 ecommerce payloads', () => {
  it('keeps every package and quantity in the checkout payload with stable IDs', () => {
    const payload = buildCheckoutPayload(orderTotals, 'eur');

    expect(payload).toEqual({
      currency: 'EUR',
      value: 38,
      credits_purchased: 400,
      items: [
        {
          item_id: 'credit_package_starter',
          item_name: '100 Mythoria Credits',
          item_brand: 'Mythoria',
          item_category: 'Credits',
          item_variant: 'starter',
          price: 10,
          quantity: 2,
        },
        {
          item_id: 'credit_package_creator',
          item_name: '200 Mythoria Credits',
          item_brand: 'Mythoria',
          item_category: 'Credits',
          item_variant: 'creator',
          price: 18,
          quantity: 1,
        },
      ],
    });
  });

  it('separates VAT and reconciles net item revenue deterministically to cents', () => {
    const payload = buildPurchasePayload({
      transactionId: 'order-123',
      currency: 'eur',
      grossAmountCents: 3800,
      taxAmountCents: 215,
      customerType: 'new',
      orderTotals,
    });

    const itemValueCents = payload.items.reduce(
      (sum, item) => sum + Math.round(item.price * item.quantity * 100),
      0,
    );

    expect(payload).toMatchObject({
      transaction_id: 'order-123',
      currency: 'EUR',
      value: 35.85,
      tax: 2.15,
      credits_purchased: 400,
      customer_type: 'new',
    });
    expect(payload.items.map((item) => item.item_id)).toEqual([
      'credit_package_starter',
      'credit_package_creator',
    ]);
    expect(itemValueCents).toBe(3585);
  });

  it('excludes shipping from value and reports it separately', () => {
    const payload = buildPurchasePayload({
      transactionId: 'order-shipping',
      currency: 'EUR',
      grossAmountCents: 3900,
      taxAmountCents: 200,
      shippingAmountCents: 100,
      orderTotals,
    });

    expect(payload).toMatchObject({ value: 36, tax: 2, shipping: 1 });
    expect(payload).not.toHaveProperty('gross_value');
  });

  it('accepts only consented genuine client IDs and numeric session IDs', () => {
    expect(
      sanitizeClientAnalyticsContext({
        clientId: ' 123.456 ',
        sessionId: '1712345678',
        consent: {
          analyticsStorage: 'granted',
          adUserData: 'denied',
          adPersonalization: 'granted',
        },
      }),
    ).toEqual({
      clientId: '123.456',
      sessionId: 1712345678,
      consent: {
        analyticsStorage: 'granted',
        adUserData: 'denied',
        adPersonalization: 'granted',
      },
    });

    expect(
      sanitizeClientAnalyticsContext({
        clientId: '123.456',
        consent: {
          analyticsStorage: 'denied',
          adUserData: 'denied',
          adPersonalization: 'denied',
        },
      }),
    ).toBeUndefined();
  });
});
