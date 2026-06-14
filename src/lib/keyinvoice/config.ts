export const KEYINVOICE_API_URL = 'https://login.keyinvoice.com/API5.php';
export const FINAL_CONSUMER_VATIN = '999999990';
export const DEFAULT_KEYINVOICE_DOC_TYPE = '34';
export const DEFAULT_KEYINVOICE_FALLBACK_TAX_RATE = 6;

export interface KeyInvoiceIssueConfig {
  apiUrl: string;
  draftOnly: boolean;
  docType: string;
  docSeriesId?: string;
  paymentMethodId: string;
  taxIdByRate: Record<string, string>;
  fallbackTaxId: string;
  productIdsByPackageKey: Record<string, string>;
  registerAt: boolean;
}

export interface KeyInvoiceTaxSelection {
  taxId: string;
  vatRate: number;
  effectiveVatRate: number | null;
  usedFallback: boolean;
  sourceKey?: string;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`${name} environment variable is required for KeyInvoice issuing`);
  }
  return value;
}

function parseJsonRecord(name: string, required: boolean): Record<string, string> {
  const raw = optionalEnv(name);
  if (!raw) {
    if (required) {
      throw new Error(`${name} environment variable is required for KeyInvoice issuing`);
    }
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${name}.${key} must be a non-empty string`);
      }
      return [normalizeRateKey(key), value.trim()];
    }),
  );
}

export function isKeyInvoiceEnabled(): boolean {
  return process.env.KEYINVOICE_ENABLED === 'true';
}

export function isKeyInvoiceDraftOnly(): boolean {
  return process.env.KEYINVOICE_DRAFT_ONLY === 'true';
}

export function getKeyInvoiceApiUrl(): string {
  return optionalEnv('KEYINVOICE_API_URL') || KEYINVOICE_API_URL;
}

export function requireKeyInvoiceApiKey(): string {
  return requiredEnv('KEYINVOICE_API_KEY');
}

export function normalizeRateKey(rate: string | number): string {
  const numeric = typeof rate === 'number' ? rate : Number(rate);
  if (!Number.isFinite(numeric)) {
    return String(rate).trim();
  }

  return numeric.toFixed(2).replace(/\.?0+$/, '');
}

export function loadKeyInvoiceIssueConfig(): KeyInvoiceIssueConfig {
  return {
    apiUrl: getKeyInvoiceApiUrl(),
    draftOnly: isKeyInvoiceDraftOnly(),
    docType: optionalEnv('KEYINVOICE_DOC_TYPE') || DEFAULT_KEYINVOICE_DOC_TYPE,
    docSeriesId: optionalEnv('KEYINVOICE_DOC_SERIES_ID'),
    paymentMethodId: requiredEnv('KEYINVOICE_PAYMENT_METHOD_ID_STRIPE'),
    taxIdByRate: parseJsonRecord('KEYINVOICE_TAX_ID_BY_RATE_JSON', true),
    fallbackTaxId: requiredEnv('KEYINVOICE_FALLBACK_TAX_ID'),
    productIdsByPackageKey: parseJsonRecord('KEYINVOICE_PRODUCT_IDS_BY_PACKAGE_KEY_JSON', true),
    registerAt: process.env.KEYINVOICE_REGISTER_AT === 'true',
  };
}

export function effectiveVatRateFromStripe(
  amountTotalCents: number,
  amountTaxCents: number | null | undefined,
): number | null {
  if (amountTaxCents === null || amountTaxCents === undefined) return null;
  if (!Number.isFinite(amountTotalCents) || amountTotalCents <= 0) return null;
  if (!Number.isFinite(amountTaxCents) || amountTaxCents < 0) return null;

  const netCents = amountTotalCents - amountTaxCents;
  if (netCents <= 0) return null;

  return Number(((amountTaxCents / netCents) * 100).toFixed(2));
}

export function selectKeyInvoiceTax(params: {
  amountTotalCents: number;
  amountTaxCents?: number | null;
  taxIdByRate: Record<string, string>;
  fallbackTaxId: string;
}): KeyInvoiceTaxSelection {
  const effectiveVatRate = effectiveVatRateFromStripe(
    params.amountTotalCents,
    params.amountTaxCents,
  );

  if (effectiveVatRate !== null) {
    const exactKey = normalizeRateKey(effectiveVatRate);
    const exactTaxId = params.taxIdByRate[exactKey];
    if (exactTaxId) {
      return {
        taxId: exactTaxId,
        vatRate: effectiveVatRate,
        effectiveVatRate,
        usedFallback: false,
        sourceKey: exactKey,
      };
    }

    const nearest = Object.entries(params.taxIdByRate)
      .map(([key, taxId]) => ({ key, taxId, rate: Number(key) }))
      .filter((candidate) => Number.isFinite(candidate.rate))
      .map((candidate) => ({
        ...candidate,
        distance: Math.abs(candidate.rate - effectiveVatRate),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearest && nearest.distance <= 0.5) {
      return {
        taxId: nearest.taxId,
        vatRate: nearest.rate,
        effectiveVatRate,
        usedFallback: false,
        sourceKey: nearest.key,
      };
    }
  }

  return {
    taxId: params.fallbackTaxId,
    vatRate: DEFAULT_KEYINVOICE_FALLBACK_TAX_RATE,
    effectiveVatRate,
    usedFallback: true,
    sourceKey: 'fallback',
  };
}
