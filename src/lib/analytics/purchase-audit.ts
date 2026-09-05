/** Pure purchase reconciliation. Never imports DB, payment producers or network clients. */
export type JsonRecord = Record<string, unknown>;
export interface AuditOrder extends JsonRecord {
  orderId: string;
  authorId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata: unknown;
}
export interface AuditPaymentEvent extends JsonRecord {
  eventId: string;
  orderId: string;
  eventType: string;
  createdAt: Date | string;
  data: unknown;
}
export interface AuditOutbox extends JsonRecord {
  dedupeKey: string;
  eventName: string;
  attributionId: string | null;
  hasClientId: boolean;
  hasSessionId: boolean;
  consent: unknown;
  params: JsonRecord;
  occurredAt: Date | string;
  deliveredAt: Date | string | null;
  skippedAt: Date | string | null;
}
export interface AuditAttribution extends JsonRecord {
  attributionId: string;
  consent: unknown;
  createdAt: Date | string;
  expiresAt: Date | string;
}
export interface AuditSnapshot {
  orders: AuditOrder[];
  events: AuditPaymentEvent[];
  outbox: AuditOutbox[];
  attributions: AuditAttribution[];
}
export interface GA4Transaction {
  transactionId: string;
  currency: string;
  purchaseRevenue: number;
  purchaseCount: number;
}
export interface PurchaseAuditOptions {
  from: Date;
  to: Date;
  testAuthorIds: string[];
  testOrderIds: string[];
  ga4Transactions?: GA4Transaction[];
}

const record = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const money = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100)
    : null;
const millis = (value: Date | string): number => new Date(value).getTime();
const iso = (value: number | null): string | null =>
  value !== null && Number.isFinite(value) ? new Date(value).toISOString() : null;
const within = (time: number, options: PurchaseAuditOptions): boolean =>
  time >= options.from.getTime() && time < options.to.getTime();
const sumKnown = (values: Array<number | null>): number =>
  values.reduce<number>((sum, value) => sum + (value ?? 0), 0);

export function parseAuditDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) {
    throw new Error('Dates must be YYYY-MM-DD or an ISO timestamp ending in Z.');
  }
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) {
    throw new Error('Invalid calendar date.');
  }
  return parsed;
}

export function parseGA4Transactions(value: unknown): GA4Transaction[] {
  const input = Array.isArray(value) ? value : record(value).transactions;
  if (!Array.isArray(input))
    throw new Error('GA4 input must be an array or an object with transactions.');
  return input.map((item) => {
    const original = record(item);
    const row: JsonRecord = {
      ...original,
      purchaseRevenue: original.purchaseRevenue ?? original.revenue,
      purchaseCount: original.purchaseCount ?? original.purchases,
    };
    if (
      !text(row.transactionId) ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(String(row.transactionId)) ||
      !/^[A-Z]{3}$/.test(String(row.currency)) ||
      money(row.purchaseRevenue) === null ||
      integer(row.purchaseCount) === null ||
      Number(row.purchaseCount) < 1
    ) {
      throw new Error(
        'Invalid GA4 transaction: require transactionId, currency, purchaseRevenue and purchaseCount.',
      );
    }
    return {
      transactionId: String(row.transactionId),
      currency: String(row.currency),
      purchaseRevenue: Number(row.purchaseRevenue),
      purchaseCount: Number(row.purchaseCount),
    };
  });
}

function completion(order: AuditOrder, events: AuditPaymentEvent[]) {
  const times = [
    ...new Set(
      events
        .filter((event) => event.eventType === 'payment_completed')
        .map((event) => millis(event.createdAt))
        .filter(Number.isFinite),
    ),
  ];
  const completed = times.length > 0 || order.status === 'completed';
  return {
    completed,
    at: times.length === 1 ? times[0] : null,
    status:
      times.length === 1
        ? 'payment_completed_event'
        : times.length > 1
          ? 'ambiguous_multiple_completion_times'
          : completed
            ? 'ambiguous_missing_completion_event'
            : 'not_completed',
  };
}

function testStatus(order: AuditOrder, events: AuditPaymentEvent[], options: PurchaseAuditOptions) {
  if (options.testOrderIds.includes(order.orderId)) return 'confirmed_explicit_order';
  if (options.testAuthorIds.includes(order.authorId)) return 'confirmed_explicit_author';
  const stripe = record(record(order.metadata).stripe);
  const modes: boolean[] = [];
  if (typeof stripe.livemode === 'boolean') modes.push(stripe.livemode);
  for (const event of events) {
    const data = record(event.data);
    for (const payload of [data, record(data.session), record(data.charge)]) {
      if (typeof payload.livemode === 'boolean') modes.push(payload.livemode);
    }
  }
  if (modes.includes(false) && modes.includes(true)) return 'ambiguous_provider_mode';
  if (modes.includes(false)) return 'confirmed_provider_test';
  return modes.includes(true) ? 'provider_live' : 'unclassified';
}

function refunds(events: AuditPaymentEvent[], options: PurchaseAuditOptions) {
  const eventKeys = new Set<string>();
  const refundsById = new Map<string, { amount: number; at: number; currency: string | null }>();
  let duplicateEvents = 0;
  let ambiguousEvents = 0;
  let observedInRange = false;
  for (const event of events.filter((entry) => entry.eventType === 'refund_completed')) {
    const data = record(event.data);
    const key = text(data.stripeEventId) || event.eventId;
    if (eventKeys.has(key)) {
      duplicateEvents += 1;
      continue;
    }
    eventKeys.add(key);
    const observed = within(millis(event.createdAt), options);
    observedInRange ||= observed;
    const charge = record(data.charge);
    const refundList = record(charge.refunds);
    const list = Array.isArray(refundList.data) ? refundList.data : [];
    if (observed && (list.length === 0 || refundList.has_more === true)) ambiguousEvents += 1;
    for (const item of list) {
      const refund = record(item);
      const id = text(refund.id);
      const amount = integer(refund.amount);
      const created = integer(refund.created);
      if (refund.status !== 'succeeded') continue;
      if (!id || amount === null || created === null) {
        if (observed) ambiguousEvents += 1;
        continue;
      }
      const entry = {
        amount,
        at: created * 1000,
        currency: text(refund.currency)?.toUpperCase() || null,
      };
      const previous = refundsById.get(id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) {
        if (observed) ambiguousEvents += 1;
        continue;
      }
      refundsById.set(id, entry);
    }
  }
  const inRange = [...refundsById.values()].filter((entry) => within(entry.at, options));
  return { inRange, ambiguousEvents, duplicateEvents, observedInRange };
}

export function auditPurchases(snapshot: AuditSnapshot, options: PurchaseAuditOptions) {
  if (
    !Number.isFinite(options.from.getTime()) ||
    !Number.isFinite(options.to.getTime()) ||
    options.from >= options.to
  ) {
    throw new Error('Audit requires a valid from < to interval.');
  }
  const eventsByOrder = new Map<string, AuditPaymentEvent[]>();
  for (const event of snapshot.events) {
    eventsByOrder.set(event.orderId, [...(eventsByOrder.get(event.orderId) || []), event]);
  }
  const context = snapshot.orders.map((order) => {
    const events = eventsByOrder.get(order.orderId) || [];
    return {
      order,
      events,
      completion: completion(order, events),
      test: testStatus(order, events, options),
    };
  });
  const attributions = new Map(snapshot.attributions.map((entry) => [entry.attributionId, entry]));
  const rows = context.flatMap(({ order, events, completion: paid, test }) => {
    const refunded = refunds(events, options);
    const purchaseInRange = paid.at !== null && within(paid.at, options);
    const ambiguousCandidate =
      paid.completed &&
      paid.at === null &&
      (within(millis(order.createdAt), options) ||
        within(millis(order.updatedAt), options) ||
        events.some((event) => within(millis(event.createdAt), options)));
    if (
      !purchaseInRange &&
      !ambiguousCandidate &&
      !refunded.observedInRange &&
      refunded.inRange.length === 0
    )
      return [];
    const otherOrders = context.filter(
      (entry) =>
        entry.order.authorId === order.authorId &&
        entry.order.orderId !== order.orderId &&
        entry.completion.completed &&
        !entry.test.startsWith('confirmed_'),
    );
    const earlierKnown =
      paid.at !== null &&
      otherOrders.some((entry) => entry.completion.at !== null && entry.completion.at < paid.at!);
    const earlierUnknown =
      paid.at === null ||
      otherOrders.some(
        (entry) =>
          (entry.completion.at === null && millis(entry.order.createdAt) <= paid.at!) ||
          entry.completion.at === paid.at,
      );
    const customerType = earlierKnown ? 'returning' : earlierUnknown ? 'unknown' : 'new';
    const stripe = record(record(order.metadata).stripe);
    const analytics = record(record(order.metadata).analytics);
    const grossCents = integer(stripe.amountTotal) ?? integer(order.amount);
    const details = record(stripe.totalDetails);
    const taxCents = integer(details.amount_tax);
    const shippingCents = integer(details.amount_shipping);
    const netCents =
      grossCents !== null &&
      taxCents !== null &&
      shippingCents !== null &&
      grossCents >= taxCents + shippingCents
        ? grossCents - taxCents - shippingCents
        : null;
    const outbox = snapshot.outbox.filter(
      (entry) =>
        entry.eventName === 'purchase' &&
        (entry.params.transaction_id === order.orderId ||
          entry.dedupeKey === `purchase:${order.orderId}`),
    );
    const uniqueOutbox = [...new Map(outbox.map((entry) => [entry.dedupeKey, entry])).values()];
    const payload = uniqueOutbox.length === 1 ? uniqueOutbox[0] : undefined;
    const valueCents = payload ? money(payload.params.value) : null;
    const payloadTaxCents = payload ? money(payload.params.tax) : null;
    const payloadShippingCents = payload ? money(payload.params.shipping ?? 0) : null;
    const refundOutbox = [
      ...new Map(
        snapshot.outbox
          .filter(
            (entry) =>
              entry.eventName === 'refund' &&
              entry.params.transaction_id === order.orderId &&
              within(millis(entry.occurredAt), options),
          )
          .map((entry) => [entry.dedupeKey, entry]),
      ).values(),
    ];
    const ga4 = options.ga4Transactions?.filter((entry) => entry.transactionId === order.orderId);
    const ga4CurrencyMatches =
      ga4?.every((entry) => entry.currency === order.currency.toUpperCase()) ?? false;
    const ga4RevenueCents =
      ga4 && ga4.length > 0 && ga4CurrencyMatches
        ? sumKnown(ga4.map((entry) => money(entry.purchaseRevenue)))
        : null;
    const attribution = payload?.attributionId
      ? attributions.get(payload.attributionId)
      : undefined;
    const excludedTest = test.startsWith('confirmed_');
    return [
      {
        orderId: order.orderId,
        currency: /^[a-z]{3}$/i.test(order.currency) ? order.currency.toUpperCase() : 'UNK',
        scope: purchaseInRange
          ? 'purchase_in_range'
          : ambiguousCandidate
            ? 'ambiguous_purchase_period'
            : 'refund_only',
        completionStatus: paid.status,
        completedAt: iso(paid.at),
        testClassification: test,
        excludedConfirmedTest: excludedTest,
        customerType,
        grossCents,
        grossSource: integer(stripe.amountTotal) !== null ? 'stripe_amount_total' : 'order_amount',
        orderAmountMismatch:
          integer(stripe.amountTotal) !== null && stripe.amountTotal !== order.amount,
        taxCents,
        shippingCents,
        netCents,
        financialStatus: netCents === null ? 'unknown_tax_or_shipping_or_invalid_totals' : 'known',
        purchaseOutboxRows: outbox.length,
        purchaseOutboxDistinctKeys: uniqueOutbox.length,
        purchasePayloadValueCents: valueCents,
        purchasePayloadTaxCents: payloadTaxCents,
        purchasePayloadShippingCents: payloadShippingCents,
        purchasePayloadCurrencyMatches: payload
          ? payload.params.currency === order.currency.toUpperCase()
          : null,
        purchasePayloadTransactionMatches: payload
          ? payload.params.transaction_id === order.orderId
          : null,
        purchasePayloadCustomerTypeMatches:
          payload && customerType !== 'unknown'
            ? payload.params.customer_type === customerType
            : null,
        purchasePayloadNetDifferenceCents:
          netCents !== null && valueCents !== null ? valueCents - netCents : null,
        purchasePayloadTaxDifferenceCents:
          taxCents !== null && payloadTaxCents !== null ? payloadTaxCents - taxCents : null,
        purchasePayloadShippingDifferenceCents:
          shippingCents !== null && payloadShippingCents !== null
            ? payloadShippingCents - shippingCents
            : null,
        consentAtCheckout:
          analytics.analytics_storage === 'granted'
            ? 'granted'
            : analytics.analytics_storage === 'denied'
              ? 'denied'
              : 'unknown',
        outboxConsent: payload
          ? record(payload.consent).analyticsStorage === 'granted'
            ? 'granted'
            : 'not_granted'
          : 'missing',
        hasClientId: payload?.hasClientId ?? false,
        hasSessionId: payload?.hasSessionId ?? false,
        attributionPresent: Boolean(attribution),
        attributionValidAtCompletion:
          attribution && paid.at !== null
            ? millis(attribution.createdAt) <= paid.at && millis(attribution.expiresAt) > paid.at
            : null,
        transportState:
          uniqueOutbox.length > 1
            ? 'multiple_purchase_keys'
            : !payload
              ? 'missing'
              : payload.deliveredAt
                ? 'submitted_to_transport'
                : payload.skippedAt
                  ? 'skipped'
                  : 'pending_or_exhausted',
        transportSubmittedAt: payload?.deliveredAt
          ? new Date(payload.deliveredAt).toISOString()
          : null,
        ga4State:
          ga4 === undefined
            ? 'not_supplied'
            : ga4.length === 0
              ? 'not_in_supplied_export'
              : !ga4CurrencyMatches
                ? 'currency_mismatch'
                : 'observed_in_supplied_export',
        ga4PurchaseCount: ga4 ? ga4.reduce((sum, entry) => sum + entry.purchaseCount, 0) : null,
        ga4InputRows: ga4?.length ?? null,
        ga4RevenueCents,
        ga4NetDifferenceCents:
          ga4RevenueCents !== null && netCents !== null ? ga4RevenueCents - netCents : null,
        refundCountKnownInRange: refunded.inRange.length,
        refundGrossKnownCents: refunded.inRange.every(
          (entry) => !entry.currency || entry.currency === order.currency.toUpperCase(),
        )
          ? refunded.inRange.reduce((sum, entry) => sum + entry.amount, 0)
          : null,
        refundAmbiguousEvents: refunded.ambiguousEvents,
        duplicateRefundEvents: refunded.duplicateEvents,
        refundNetStatus:
          refunded.inRange.length || refunded.ambiguousEvents
            ? 'unknown_tax_allocation'
            : 'no_refund_evidence',
        refundOutboxCount: refundOutbox.length,
        refundPayloadValueKnownCents: sumKnown(
          refundOutbox.map((entry) => money(entry.params.value)),
        ),
        refundPayloadUnknownValues: refundOutbox.filter(
          (entry) => money(entry.params.value) === null,
        ).length,
        refundTransportSubmitted: refundOutbox.filter((entry) => entry.deliveredAt !== null).length,
      },
    ];
  });
  const real = rows.filter((row) => !row.excludedConfirmedTest);
  const purchased = real.filter((row) => row.scope === 'purchase_in_range');
  const byCurrency = [...new Set(real.map((row) => row.currency))].sort().map((currency) => {
    const purchases = purchased.filter((row) => row.currency === currency);
    const relevant = real.filter((row) => row.currency === currency);
    return {
      currency,
      purchases: purchases.length,
      grossKnownCents: sumKnown(purchases.map((row) => row.grossCents)),
      netKnownCents: sumKnown(purchases.map((row) => row.netCents)),
      netUnknownOrders: purchases.filter((row) => row.netCents === null).length,
      refundGrossKnownCents: sumKnown(relevant.map((row) => row.refundGrossKnownCents)),
      refundAmbiguousEvents: relevant.reduce((sum, row) => sum + row.refundAmbiguousEvents, 0),
      refundNetCents: null,
      ga4ObservedRevenueKnownCents: sumKnown(purchases.map((row) => row.ga4RevenueCents)),
      transportSubmittedPurchases: purchases.filter(
        (row) => row.transportState === 'submitted_to_transport',
      ).length,
      ga4ObservedPurchases: purchases.filter(
        (row) => row.ga4State === 'observed_in_supplied_export',
      ).length,
    };
  });
  const orderIds = new Set(snapshot.orders.map((order) => order.orderId));
  return {
    rows,
    summary: {
      schemaVersion: 1,
      interval: {
        fromInclusive: options.from.toISOString(),
        toExclusive: options.to.toISOString(),
        timezone: 'UTC',
      },
      definitions: {
        completedAt:
          'payment_completed.created_at; missing or multiple distinct times remain ambiguous',
        tests:
          'Only explicit author/order IDs or provider livemode=false; never inferred from amount',
        customerType:
          'Earlier completed non-test purchases across all available history; ambiguity remains unknown',
        transport: 'delivered_at proves submission only, never GA4 ingestion',
        ga4: 'Optional supplied transaction export; absence only means absent from that export',
        refunds:
          'Unique succeeded provider refund IDs at refund.created; never sum charge.amount_refunded snapshots',
        revenue:
          'Integer cents per currency; missing tax/shipping not assumed zero; refund tax allocation unknown',
      },
      scopeRows: rows.length,
      confirmedTestRowsExcluded: rows.length - real.length,
      ambiguousPeriodRows: real.filter((row) => row.scope === 'ambiguous_purchase_period').length,
      purchases: purchased.length,
      newCustomers: purchased.filter((row) => row.customerType === 'new').length,
      returningCustomers: purchased.filter((row) => row.customerType === 'returning').length,
      unknownCustomerType: purchased.filter((row) => row.customerType === 'unknown').length,
      unclassifiedModePurchases: purchased.filter(
        (row) => row.testClassification === 'unclassified',
      ).length,
      ga4InputSupplied: options.ga4Transactions !== undefined,
      ga4InputTransactionsNotInOrderSnapshot:
        options.ga4Transactions?.filter((entry) => !orderIds.has(entry.transactionId)).length ??
        null,
      byCurrency,
    },
  };
}

export function purchaseAuditCsv(rows: ReturnType<typeof auditPurchases>['rows']): string {
  if (rows.length === 0) return 'orderId\n';
  const columns = Object.keys(rows[0]) as Array<keyof (typeof rows)[number]>;
  const escape = (value: unknown): string => {
    let raw = value === null || value === undefined ? '' : String(value);
    if (/^[=+@\t\r]/.test(raw) || (/^-/.test(raw) && !/^-\d+(?:\.\d+)?$/.test(raw)))
      raw = `'${raw}`;
    return `"${raw.replace(/"/g, '""')}"`;
  };
  return (
    [
      columns.map(escape).join(','),
      ...rows.map((row) => columns.map((key) => escape(row[key])).join(',')),
    ].join('\n') + '\n'
  );
}
