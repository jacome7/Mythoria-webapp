import { FINAL_CONSUMER_VATIN } from './config';

export interface KeyInvoiceAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface KeyInvoiceCustomerSource {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: KeyInvoiceAddress | null;
}

export interface KeyInvoiceOrderLine {
  packageId: number;
  packageKey?: string | null;
  quantity: number;
  credits: number;
  unitPrice: number;
}

export interface BuildKeyInvoiceDocumentPayloadInput {
  orderId: string;
  docType: string;
  docSeriesId?: string;
  paymentMethodId: string;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  docDate: Date;
  taxId: string;
  customer:
    | {
        mode: 'keyinvoice_client';
        keyInvoiceClientId: string;
        source: KeyInvoiceCustomerSource;
      }
    | {
        mode: 'final_consumer';
        source: KeyInvoiceCustomerSource;
      };
  lines: KeyInvoiceOrderLine[];
  productIdsByPackageKey: Record<string, string>;
}

export interface BuiltKeyInvoiceDocumentPayload extends Record<string, unknown> {
  method: 'insertDocument';
  DocType: string;
  DocSeries?: string;
  IdClient?: string;
  Name?: string;
  Address?: string;
  PostalCode?: string;
  Locality?: string;
  CountryCode?: string;
  DocDate: string;
  DocReference: string;
  Comments: string;
  IdPaymentMethod: string;
  DocLines: Array<{
    IdProduct: string;
    ProductName: string;
    Qty: string;
    Price: string;
    IdTax: string;
  }>;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function decimal(value: number): string {
  return value.toFixed(2);
}

function addressLine(address?: KeyInvoiceAddress | null): string | undefined {
  const parts = [address?.line1, address?.line2].map((value) => value?.trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function customerName(source: KeyInvoiceCustomerSource): string {
  return source.name?.trim() || 'Consumidor Final';
}

function getPackageKey(line: KeyInvoiceOrderLine): string {
  if (line.packageKey?.trim()) return line.packageKey.trim();
  return `credits${line.credits}`;
}

function buildReference(input: BuildKeyInvoiceDocumentPayloadInput): string {
  const providerRef = input.paymentIntentId || input.checkoutSessionId || 'unknown';
  return `Stripe ${providerRef} / Mythoria ${input.orderId}`;
}

export function creditPackageDescription(credits: number): string {
  return `Geração de Livros - ${credits} créditos`;
}

export function buildKeyInvoiceDocumentPayload(
  input: BuildKeyInvoiceDocumentPayloadInput,
): BuiltKeyInvoiceDocumentPayload {
  const docLines = input.lines.map((line) => {
    const packageKey = getPackageKey(line);
    const productId = input.productIdsByPackageKey[packageKey];
    if (!productId) {
      throw new Error(`Missing KeyInvoice product id for credit package ${packageKey}`);
    }

    return {
      IdProduct: productId,
      ProductName: creditPackageDescription(line.credits),
      Qty: String(line.quantity),
      Price: decimal(line.unitPrice),
      IdTax: input.taxId,
    };
  });

  const payload: BuiltKeyInvoiceDocumentPayload = {
    method: 'insertDocument',
    DocType: input.docType,
    ...(input.docSeriesId ? { DocSeries: input.docSeriesId } : {}),
    DocDate: formatDate(input.docDate),
    DocReference: buildReference(input),
    Comments: `Pagamento recebido via Stripe. Ordem Mythoria ${input.orderId}.`,
    IdPaymentMethod: input.paymentMethodId,
    DocLines: docLines,
  };

  if (input.customer.mode === 'keyinvoice_client') {
    payload.IdClient = input.customer.keyInvoiceClientId;
    return payload;
  }

  const source = input.customer.source;
  const address = source.address;
  payload.Name = customerName(source);
  payload.Address = addressLine(address);
  payload.PostalCode = address?.postalCode?.trim() || undefined;
  payload.Locality = address?.city?.trim() || undefined;
  payload.CountryCode = address?.country?.trim().toUpperCase() || 'PT';

  return payload;
}

export function buildFinalConsumerAuditData() {
  return {
    customerMode: 'final_consumer' as const,
    finalConsumerVatNumber: FINAL_CONSUMER_VATIN,
  };
}
