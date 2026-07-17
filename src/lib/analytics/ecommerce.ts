export type AnalyticsConsentStatus = 'granted' | 'denied';

export interface ClientAnalyticsContext {
  clientId: string;
  sessionId?: number;
  consent: {
    analyticsStorage: 'granted';
    adUserData: AnalyticsConsentStatus;
    adPersonalization: AnalyticsConsentStatus;
  };
}

export interface StoredAnalyticsContext extends ClientAnalyticsContext {
  userId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Sanitize the consent-gated analytics context supplied by the browser. */
export function sanitizeClientAnalyticsContext(value: unknown): ClientAnalyticsContext | undefined {
  if (!isRecord(value) || !isRecord(value.consent)) return undefined;

  const clientId = typeof value.clientId === 'string' ? value.clientId.trim() : '';
  if (
    !clientId ||
    clientId.length > 100 ||
    value.consent.analyticsStorage !== 'granted' ||
    !['granted', 'denied'].includes(String(value.consent.adUserData)) ||
    !['granted', 'denied'].includes(String(value.consent.adPersonalization))
  ) {
    return undefined;
  }

  const sessionId = Number(value.sessionId);

  return {
    clientId,
    ...(Number.isSafeInteger(sessionId) && sessionId > 0 ? { sessionId } : {}),
    consent: {
      analyticsStorage: 'granted',
      adUserData: value.consent.adUserData as AnalyticsConsentStatus,
      adPersonalization: value.consent.adPersonalization as AnalyticsConsentStatus,
    },
  };
}

export interface CreditOrderItemBreakdown {
  packageId: number;
  packageKey?: string;
  quantity: number;
  credits: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreditOrderTotals {
  totalCredits: number;
  totalAmount: number;
  itemsBreakdown: CreditOrderItemBreakdown[];
}

export interface GA4EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand: 'Mythoria';
  item_category: 'Credits';
  price: number;
  quantity: number;
  item_variant?: string;
  discount?: number;
}

export interface GA4CheckoutPayload {
  currency: string;
  value: number;
  credits_purchased: number;
  items: GA4EcommerceItem[];
}

export interface GA4PurchasePayload extends GA4CheckoutPayload {
  transaction_id: string;
  tax: number;
  shipping?: number;
  coupon?: string;
  customer_type?: 'new' | 'returning';
}

interface PurchasePayloadInput {
  transactionId: string;
  currency: string;
  grossAmountCents: number;
  taxAmountCents?: number;
  shippingAmountCents?: number;
  coupon?: string;
  customerType?: 'new' | 'returning';
  orderTotals: CreditOrderTotals;
}

const toCurrencyUnits = (amountCents: number): number => amountCents / 100;

const toStableItemId = (item: CreditOrderItemBreakdown): string =>
  `credit_package_${item.packageKey || item.packageId}`;

const allocateCents = (totalCents: number, weights: number[]): number[] => {
  if (weights.length === 0) return [];

  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (totalWeight === 0) {
    return weights.map((_, index) => (index === weights.length - 1 ? totalCents : 0));
  }

  const allocations = weights.map((weight) =>
    Math.floor((totalCents * Math.max(0, weight)) / totalWeight),
  );
  let remainder = totalCents - allocations.reduce((sum, amount) => sum + amount, 0);

  const rankedFractions = weights
    .map((weight, index) => ({
      index,
      fraction: (totalCents * Math.max(0, weight)) / totalWeight - allocations[index],
    }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);

  for (let index = 0; remainder > 0; index = (index + 1) % rankedFractions.length) {
    allocations[rankedFractions[index].index] += 1;
    remainder -= 1;
  }

  return allocations;
};

const buildItems = (orderTotals: CreditOrderTotals, lineValueCents: number[]): GA4EcommerceItem[] =>
  orderTotals.itemsBreakdown.map((item, index) => {
    const price = Number((lineValueCents[index] / 100 / item.quantity).toFixed(6));
    const grossUnitPrice = Number(item.unitPrice.toFixed(2));
    return {
      item_id: toStableItemId(item),
      item_name: `${item.credits} Mythoria Credits`,
      item_brand: 'Mythoria',
      item_category: 'Credits',
      item_variant: item.packageKey || String(item.packageId),
      price,
      quantity: item.quantity,
      ...(grossUnitPrice > price ? { discount: Number((grossUnitPrice - price).toFixed(6)) } : {}),
    };
  });

export function buildCheckoutPayload(
  orderTotals: CreditOrderTotals,
  currency: string,
): GA4CheckoutPayload {
  const lineGrossCents = orderTotals.itemsBreakdown.map((item) =>
    Math.round(item.totalPrice * 100),
  );
  const grossAmountCents = lineGrossCents.reduce((sum, amount) => sum + amount, 0);

  return {
    currency: currency.toUpperCase(),
    value: toCurrencyUnits(grossAmountCents),
    credits_purchased: orderTotals.totalCredits,
    items: buildItems(orderTotals, lineGrossCents),
  };
}

export function buildPurchasePayload({
  transactionId,
  currency,
  grossAmountCents,
  taxAmountCents = 0,
  shippingAmountCents = 0,
  coupon,
  customerType,
  orderTotals,
}: PurchasePayloadInput): GA4PurchasePayload {
  const normalizedGrossCents = Math.max(0, Math.round(grossAmountCents));
  const normalizedTaxCents = Math.max(0, Math.round(taxAmountCents));
  const normalizedShippingCents = Math.max(0, Math.round(shippingAmountCents));
  const netValueCents = Math.max(
    0,
    normalizedGrossCents - normalizedTaxCents - normalizedShippingCents,
  );
  const lineGrossCents = orderTotals.itemsBreakdown.map((item) =>
    Math.round(item.totalPrice * 100),
  );
  const lineNetCents = allocateCents(netValueCents, lineGrossCents);

  return {
    transaction_id: transactionId,
    currency: currency.toUpperCase(),
    value: toCurrencyUnits(netValueCents),
    tax: toCurrencyUnits(normalizedTaxCents),
    ...(normalizedShippingCents > 0 ? { shipping: toCurrencyUnits(normalizedShippingCents) } : {}),
    credits_purchased: orderTotals.totalCredits,
    ...(coupon ? { coupon } : {}),
    ...(customerType ? { customer_type: customerType } : {}),
    items: buildItems(orderTotals, lineNetCents),
  };
}
