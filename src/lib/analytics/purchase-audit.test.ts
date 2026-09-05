/** @jest-environment node */
import {
  auditPurchases,
  parseAuditDate,
  parseGA4Transactions,
  purchaseAuditCsv,
  type AuditOrder,
  type AuditOutbox,
  type AuditPaymentEvent,
  type AuditSnapshot,
} from './purchase-audit';

const FROM = '2026-08-05T23:00:00.000Z';
const TO = '2026-09-04T23:00:00.000Z';
const PAID = '2026-08-10T12:00:00.000Z';
const options = {
  from: new Date(FROM),
  to: new Date(TO),
  testAuthorIds: [] as string[],
  testOrderIds: [] as string[],
};
const order = (overrides: Partial<AuditOrder> = {}): AuditOrder => ({
  orderId: 'order-1',
  authorId: 'author-1',
  amount: 1060,
  currency: 'eur',
  status: 'completed',
  createdAt: PAID,
  updatedAt: PAID,
  metadata: {
    stripe: { amountTotal: 1060, totalDetails: { amount_tax: 60, amount_shipping: 0 } },
    analytics: { analytics_storage: 'granted' },
    email: 'secret@example.com',
    gclid: 'private-click',
  },
  ...overrides,
});
const completed = (orderId = 'order-1', at = PAID): AuditPaymentEvent => ({
  orderId,
  eventId: `completed-${orderId}`,
  eventType: 'payment_completed',
  createdAt: at,
  data: {},
});
const outbox = (overrides: Partial<AuditOutbox> = {}): AuditOutbox => ({
  dedupeKey: 'purchase:order-1',
  eventName: 'purchase',
  attributionId: 'attribution-1',
  hasClientId: true,
  hasSessionId: true,
  consent: { analyticsStorage: 'granted' },
  params: { transaction_id: 'order-1', value: 10, tax: 0.6, currency: 'EUR', customer_type: 'new' },
  occurredAt: PAID,
  deliveredAt: PAID,
  skippedAt: null,
  ...overrides,
});
const snapshot = (overrides: Partial<AuditSnapshot> = {}): AuditSnapshot => ({
  orders: [order()],
  events: [completed()],
  outbox: [outbox()],
  attributions: [
    {
      attributionId: 'attribution-1',
      consent: { analyticsStorage: 'granted' },
      createdAt: '2026-08-10T11:00:00Z',
      expiresAt: '2026-08-11T11:00:00Z',
    },
  ],
  ...overrides,
});
const refundEvent = (
  eventId: string,
  stripeEventId: string,
  amounts: number[],
): AuditPaymentEvent => ({
  eventId,
  orderId: 'order-1',
  eventType: 'refund_completed',
  createdAt: '2026-08-12T15:00:00Z',
  data: {
    stripeEventId,
    charge: {
      amount_refunded: amounts.reduce((sum, amount) => sum + amount, 0),
      refunds: {
        has_more: false,
        data: amounts.map((amount, index) => ({
          id: `re_${index}`,
          amount,
          status: 'succeeded',
          currency: 'eur',
          created: new Date(`2026-08-${11 + index}T12:00:00Z`).getTime() / 1000,
        })),
      },
    },
  },
});

describe('read-only purchase audit calculation', () => {
  it('reconciles gross/tax/net against persisted payload and distinguishes transport from GA4', () => {
    const report = auditPurchases(snapshot(), options);
    expect(report.rows[0]).toMatchObject({
      grossCents: 1060,
      taxCents: 60,
      shippingCents: 0,
      netCents: 1000,
      purchasePayloadNetDifferenceCents: 0,
      transportState: 'submitted_to_transport',
      ga4State: 'not_supplied',
      ga4RevenueCents: null,
      attributionValidAtCompletion: true,
    });
    expect(report.summary.byCurrency[0].ga4ObservedPurchases).toBe(0);
  });

  it('uses completion events rather than order creation or update for half-open date boundaries', () => {
    const data = snapshot({
      orders: [
        order({ orderId: 'before', createdAt: '2026-07-01T00:00:00Z' }),
        order({ orderId: 'end' }),
        order({ orderId: 'start' }),
      ],
      events: [completed('before', PAID), completed('end', TO), completed('start', FROM)],
      outbox: [],
    });
    expect(
      auditPurchases(data, options)
        .rows.map((row) => row.orderId)
        .sort(),
    ).toEqual(['before', 'start']);
  });

  it('classifies missing and conflicting completion timestamps as ambiguous, excluding from purchase totals', () => {
    const data = snapshot({
      orders: [order(), order({ orderId: 'order-2' })],
      events: [completed('order-2'), completed('order-2', '2026-08-11T12:00:00Z')],
    });
    const result = auditPurchases(data, options);
    expect(result.summary.purchases).toBe(0);
    expect(result.summary.ambiguousPeriodRows).toBe(2);
    expect(result.rows[0].completedAt).toBeNull();
  });

  it('uses pre-period purchase history and keeps uncertain earlier history unknown', () => {
    const history = order({
      orderId: 'earlier',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    });
    const data = snapshot({
      orders: [history, order()],
      events: [completed('earlier', '2026-07-01T01:00:00Z'), completed()],
    });
    expect(auditPurchases(data, options).rows[0].customerType).toBe('returning');
    expect(auditPurchases({ ...data, events: [completed()] }, options).rows[0].customerType).toBe(
      'unknown',
    );
  });

  it('does not infer test transactions from small amounts and excludes only confirmed test evidence', () => {
    const data = snapshot({ orders: [order({ amount: 1 })] });
    expect(auditPurchases(data, options).summary.purchases).toBe(1);
    expect(auditPurchases(data, { ...options, testOrderIds: ['order-1'] }).summary.purchases).toBe(
      0,
    );
    expect(
      auditPurchases(data, { ...options, testAuthorIds: ['author-1'] }).summary.purchases,
    ).toBe(0);
    const providerTest = snapshot({
      events: [
        completed(),
        { ...completed(), eventType: 'webhook_received', data: { session: { livemode: false } } },
      ],
    });
    expect(auditPurchases(providerTest, options).rows[0].testClassification).toBe(
      'confirmed_provider_test',
    );
  });

  it('does not count duplicate purchase outbox copies as new purchases and flags multiple keys', () => {
    const data = snapshot({
      outbox: [outbox(), outbox(), outbox({ dedupeKey: 'legacy-purchase:order-1' })],
    });
    const report = auditPurchases(data, options);
    expect(report.summary.purchases).toBe(1);
    expect(report.rows[0]).toMatchObject({
      purchaseOutboxRows: 3,
      purchaseOutboxDistinctKeys: 2,
      transportState: 'multiple_purchase_keys',
      purchasePayloadValueCents: null,
    });
  });

  it('deduplicates refund webhook IDs and individual refunds across cumulative snapshots', () => {
    const first = refundEvent('event-1', 'evt_1', [200]);
    const second = refundEvent('event-2', 'evt_2', [200, 300]);
    const data = snapshot({
      events: [completed(), first, { ...first, eventId: 'delivery-copy' }, second],
    });
    expect(auditPurchases(data, options).rows[0]).toMatchObject({
      refundGrossKnownCents: 500,
      refundCountKnownInRange: 2,
      duplicateRefundEvents: 1,
      refundNetStatus: 'unknown_tax_allocation',
    });
  });

  it('keeps cumulative refund amount without detailed refund evidence ambiguous and includes old-order refunds', () => {
    const old = '2026-07-01T00:00:00Z';
    const refund = {
      ...refundEvent('event-1', 'evt_1', []),
      data: { stripeEventId: 'evt_1', charge: { amount_refunded: 500 } },
    };
    const data = snapshot({
      orders: [order({ createdAt: old, updatedAt: old })],
      events: [completed('order-1', old), refund],
    });
    expect(auditPurchases(data, options).rows[0]).toMatchObject({
      scope: 'refund_only',
      refundGrossKnownCents: 0,
      refundAmbiguousEvents: 1,
    });
    expect(auditPurchases(data, options).summary.purchases).toBe(0);
  });

  it('uses refund occurrence time, not webhook observation, for the refund window', () => {
    const event = refundEvent('e1', 'evt_1', [200]);
    event.createdAt = '2026-08-12T12:00:00Z';
    const result = auditPurchases(snapshot({ events: [completed(), event] }), {
      ...options,
      from: new Date('2026-08-12T00:00:00Z'),
    });
    expect(result.rows[0].refundGrossKnownCents).toBe(0);
  });

  it('includes refunds occurring in the interval even when their webhook arrives after the end', () => {
    const event = refundEvent('late-event', 'evt_late', [200]);
    event.createdAt = '2026-09-06T12:00:00Z';
    const old = '2026-07-01T00:00:00Z';
    const data = snapshot({
      orders: [order({ createdAt: old, updatedAt: old })],
      events: [completed('order-1', old), event],
    });
    expect(auditPurchases(data, options).rows[0]).toMatchObject({
      scope: 'refund_only',
      refundGrossKnownCents: 200,
      refundCountKnownInRange: 1,
    });
    expect(auditPurchases(data, options).summary.purchases).toBe(0);
  });
  it('leaves missing taxes unknown instead of rebuilding the producer defaults', () => {
    const result = auditPurchases(snapshot({ orders: [order({ metadata: {} })] }), options);
    expect(result.rows[0].netCents).toBeNull();
    expect(result.summary.byCurrency[0].netUnknownOrders).toBe(1);
  });

  it('compares optional actual GA4 observations while identifying duplicate export rows', () => {
    const ga4Transactions = parseGA4Transactions({
      source: 'GA4 UI',
      transactions: [
        { transactionId: 'order-1', currency: 'EUR', revenue: 10, purchases: 1 },
        { transactionId: 'order-1', currency: 'EUR', revenue: 10, purchases: 1 },
      ],
    });
    const row = auditPurchases(snapshot(), { ...options, ga4Transactions }).rows[0];
    expect(row).toMatchObject({
      ga4InputRows: 2,
      ga4PurchaseCount: 2,
      ga4RevenueCents: 2000,
      ga4NetDifferenceCents: 1000,
      ga4State: 'observed_in_supplied_export',
    });
    expect(auditPurchases(snapshot(), { ...options, ga4Transactions: [] }).rows[0].ga4State).toBe(
      'not_in_supplied_export',
    );
  });

  it('exports only whitelist fields without personal, click, author or attribution IDs', () => {
    const report = auditPurchases(snapshot(), options);
    const output = purchaseAuditCsv(report.rows) + JSON.stringify(report.summary);
    for (const sensitive of ['secret@example.com', 'private-click', 'author-1', 'attribution-1'])
      expect(output).not.toContain(sensitive);
    expect(output).toContain('order-1');
  });

  it('rejects invalid calendar dates, local timestamps and invalid input revenue', () => {
    expect(() => parseAuditDate('2026-02-30')).toThrow();
    expect(() => parseAuditDate('2026-08-06T00:00:00')).toThrow();
    expect(parseAuditDate('2026-08-06').toISOString()).toBe('2026-08-06T00:00:00.000Z');
    expect(() =>
      parseGA4Transactions([
        { transactionId: 'id', currency: 'EUR', purchaseRevenue: -1, purchaseCount: 1 },
      ]),
    ).toThrow();
  });
});
