import { and, asc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  authors,
  fiscalDocumentEvents,
  fiscalDocuments,
  keyInvoiceCustomers,
  paymentOrders,
  type FiscalDocument,
  type KeyInvoiceCustomer,
  type PaymentOrder,
} from '@/db/schema';
import { keyInvoiceClient } from '@/lib/keyinvoice/client';
import {
  FINAL_CONSUMER_VATIN,
  isKeyInvoiceEnabled,
  loadKeyInvoiceIssueConfig,
  selectKeyInvoiceTax,
} from '@/lib/keyinvoice/config';
import {
  buildFinalConsumerAuditData,
  buildKeyInvoiceDocumentPayload,
  creditPackageDescription,
  type KeyInvoiceCustomerSource,
  type KeyInvoiceOrderLine,
} from '@/lib/keyinvoice/document-builder';
import { storeFiscalDocumentPdf } from '@/lib/keyinvoice/pdf-storage';
import { normalizeVatForKeyInvoice } from '@/lib/keyinvoice/vat';

type FiscalStatus = FiscalDocument['status'];
type NormalizedVat = NonNullable<ReturnType<typeof normalizeVatForKeyInvoice>>;
export type KeyInvoiceVatSource = 'stripe_checkout_tax_id' | 'author_profile_fiscal_number' | 'none';
export type FiscalRetrySkipReason = 'insert_document_response_unknown';
export type AdminFiscalRetryBlockReason =
  | 'document_status_not_retryable'
  | 'payment_order_not_completed'
  | 'retry_not_due'
  | FiscalRetrySkipReason;

export interface FiscalDocumentRetryResult {
  document: FiscalDocument | null;
  retrySkippedReason?: FiscalRetrySkipReason;
}

export interface AdminFiscalRetryResult {
  outcome: 'not_found' | 'not_retryable' | 'retried';
  document: FiscalDocument | null;
  reason?: AdminFiscalRetryBlockReason;
  orderStatus?: PaymentOrder['status'];
}

interface StripeCustomerDetails {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  tax_ids?: Array<{
    type?: string | null;
    value?: string | null;
  }> | null;
}

interface StripeCheckoutMetadata {
  stripe?: {
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
    paymentStatus?: string | null;
    totalDetails?: {
      amount_tax?: number | null;
    } | null;
    customerDetails?: StripeCustomerDetails | null;
  };
  orderTotals?: {
    itemsBreakdown?: KeyInvoiceOrderLine[];
  };
}

interface AuthorFiscalIdentity {
  displayName: string;
  email: string;
  fiscalNumber: string | null;
  mobilePhone: string | null;
  countryOfOrigin: string | null;
}

export type ResolvedVatForKeyInvoice =
  | {
      source: Exclude<KeyInvoiceVatSource, 'none'>;
      rawValue: string;
      normalizedVat: NormalizedVat;
    }
  | {
      source: 'none';
      rawValue: null;
      normalizedVat: null;
    };

type ResolvedCustomer =
  | {
      mode: 'keyinvoice_client';
      keyInvoiceClientId: string;
      keyInvoiceCustomerId: string;
      vatin: string;
      vatSource: Exclude<KeyInvoiceVatSource, 'none'>;
      source: KeyInvoiceCustomerSource;
    }
  | {
      mode: 'final_consumer';
      vatSource: 'none';
      source: KeyInvoiceCustomerSource;
    };

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown KeyInvoice fiscal document error';
}

function metadataForOrder(order: PaymentOrder): StripeCheckoutMetadata {
  return order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
    ? (order.metadata as StripeCheckoutMetadata)
    : {};
}

function getStripeTaxId(customerDetails?: StripeCustomerDetails | null): string | null {
  const taxIds = customerDetails?.tax_ids;
  if (!Array.isArray(taxIds)) return null;

  const first = taxIds.find((taxId) => typeof taxId?.value === 'string' && taxId.value.trim());
  return first?.value?.trim() || null;
}

export function resolveKeyInvoiceVat(params: {
  stripeTaxId?: string | null;
  authorFiscalNumber?: string | null;
}): ResolvedVatForKeyInvoice {
  const stripeVat = normalizeVatForKeyInvoice(params.stripeTaxId);
  if (stripeVat) {
    return {
      source: 'stripe_checkout_tax_id',
      rawValue: params.stripeTaxId?.trim() || stripeVat.input,
      normalizedVat: stripeVat,
    };
  }

  const profileVat = normalizeVatForKeyInvoice(params.authorFiscalNumber);
  if (profileVat) {
    return {
      source: 'author_profile_fiscal_number',
      rawValue: params.authorFiscalNumber?.trim() || profileVat.input,
      normalizedVat: profileVat,
    };
  }

  return {
    source: 'none',
    rawValue: null,
    normalizedVat: null,
  };
}

function creditPackagePayloadLine(
  line: KeyInvoiceOrderLine,
  taxId: string,
  productIdsByPackageKey: Record<string, string>,
) {
  const packageKey = line.packageKey?.trim() || `credits${line.credits}`;
  const productId = productIdsByPackageKey[packageKey];
  if (!productId) {
    throw new Error(`Missing KeyInvoice product id for credit package ${packageKey}`);
  }

  return {
    IdProduct: productId,
    ProductName: creditPackageDescription(line.credits),
    Qty: String(line.quantity),
    Price: Number(line.unitPrice).toFixed(2),
    IdTax: taxId,
  };
}

function sourceFromStripeCustomerDetails(
  customerDetails?: StripeCustomerDetails | null,
  author?: AuthorFiscalIdentity | null,
): KeyInvoiceCustomerSource {
  return {
    name: customerDetails?.name || author?.displayName || null,
    email: customerDetails?.email || author?.email || null,
    phone: customerDetails?.phone || author?.mobilePhone || null,
    address: customerDetails?.address
      ? {
          line1: customerDetails.address.line1 || null,
          line2: customerDetails.address.line2 || null,
          city: customerDetails.address.city || null,
          postalCode: customerDetails.address.postal_code || null,
          country: customerDetails.address.country || null,
        }
      : author?.countryOfOrigin
        ? { country: author.countryOfOrigin }
        : null,
  };
}

function customerDisplayName(source: KeyInvoiceCustomerSource): string {
  if (source.name?.trim()) return source.name.trim();
  if (source.email?.trim()) return source.email.trim();
  return 'Consumidor Final';
}

function customerAddress(source: KeyInvoiceCustomerSource): string | null {
  const parts = [source.address?.line1, source.address?.line2]
    .map((value) => value?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function retryTime(attemptCount: number): Date {
  const minutes = Math.min(60, Math.max(5, attemptCount * attemptCount * 5));
  return new Date(Date.now() + minutes * 60_000);
}

function decimalString(value?: string | number | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : null;
}

function formatFullDocNumber(
  docType?: string | null,
  docSeries?: string | null,
  docNum?: string | null,
): string | null {
  return docType && docSeries && docNum ? `${docType} ${docSeries}/${docNum}` : null;
}

function fiscalPdfUrl(document: FiscalDocument | null | undefined): string | null {
  if (!document?.pdfStoragePath || document.status !== 'issued') return null;
  return `/api/payments/fiscal-documents/${document.id}/pdf`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPdfGenerationError(error: unknown): boolean {
  return /ficheiro|file|pdf|documentbinary|gerar os dados/i.test(toErrorMessage(error));
}

export async function getKeyInvoiceDocumentPdfWithFallback(
  params: {
    docType: string;
    docNum: string;
    docSeries?: string | null;
  },
  options: { retryDelayMs?: number } = {},
): Promise<{
  pdf: Awaited<ReturnType<typeof keyInvoiceClient.getDocumentPDF>>;
  signed: boolean;
  fallbackUsed: boolean;
  attempts: number;
}> {
  try {
    return {
      pdf: await keyInvoiceClient.getDocumentPDF({ ...params, signed: true }),
      signed: true,
      fallbackUsed: false,
      attempts: 1,
    };
  } catch (firstError) {
    if (!isPdfGenerationError(firstError)) {
      throw firstError;
    }

    await sleep(options.retryDelayMs ?? 250);

    try {
      return {
        pdf: await keyInvoiceClient.getDocumentPDF({ ...params, signed: true }),
        signed: true,
        fallbackUsed: false,
        attempts: 2,
      };
    } catch (secondError) {
      if (!isPdfGenerationError(secondError)) {
        throw secondError;
      }

      return {
        pdf: await keyInvoiceClient.getDocumentPDF({ ...params, signed: false }),
        signed: false,
        fallbackUsed: true,
        attempts: 3,
      };
    }
  }
}

export function retrySkipReasonForDocument(
  document: Pick<FiscalDocument, 'docNum'>,
  hasInsertDocumentRequestedEvent: boolean,
): FiscalRetrySkipReason | null {
  if (document.docNum) return null;
  return hasInsertDocumentRequestedEvent ? 'insert_document_response_unknown' : null;
}

export function adminRetryBlockReasonForDocument(params: {
  document: Pick<FiscalDocument, 'status' | 'nextRetryAt' | 'docNum'>;
  order: Pick<PaymentOrder, 'status'>;
  hasInsertDocumentRequestedEvent: boolean;
  now?: Date;
}): AdminFiscalRetryBlockReason | null {
  if (!['pending', 'failed'].includes(params.document.status)) {
    return 'document_status_not_retryable';
  }

  if (params.order.status !== 'completed') {
    return 'payment_order_not_completed';
  }

  const now = params.now || new Date();
  if (params.document.nextRetryAt && params.document.nextRetryAt > now) {
    return 'retry_not_due';
  }

  return retrySkipReasonForDocument(
    params.document,
    params.hasInsertDocumentRequestedEvent,
  );
}

function lineItemsFromOrder(order: PaymentOrder): KeyInvoiceOrderLine[] {
  const metadata = metadataForOrder(order);
  const items = metadata.orderTotals?.itemsBreakdown;
  if (!items?.length) {
    const creditBundle = order.creditBundle as { credits?: number; price?: number };
    return [
      {
        packageId: 0,
        packageKey: creditBundle.credits ? `credits${creditBundle.credits}` : null,
        quantity: 1,
        credits: Number(creditBundle.credits || 0),
        unitPrice: Number(creditBundle.price || order.amount / 100),
      },
    ];
  }

  return items.map((item) => ({
    packageId: Number(item.packageId),
    packageKey: item.packageKey || null,
    quantity: Number(item.quantity),
    credits: Number(item.credits),
    unitPrice: Number(item.unitPrice),
  }));
}

async function recordFiscalEvent(params: {
  fiscalDocumentId?: string | null;
  orderId: string;
  eventType: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}) {
  await db.insert(fiscalDocumentEvents).values({
    fiscalDocumentId: params.fiscalDocumentId || null,
    orderId: params.orderId,
    eventType: params.eventType,
    requestPayload: params.requestPayload ?? null,
    responsePayload: params.responsePayload ?? null,
  });
}

async function getFiscalDocumentByOrderId(orderId: string): Promise<FiscalDocument | null> {
  const [document] = await db
    .select()
    .from(fiscalDocuments)
    .where(eq(fiscalDocuments.orderId, orderId))
    .limit(1);
  return document || null;
}

async function getFiscalDocumentWithOrderById(
  documentId: string,
): Promise<{ document: FiscalDocument; order: PaymentOrder } | null> {
  const [row] = await db
    .select({ document: fiscalDocuments, order: paymentOrders })
    .from(fiscalDocuments)
    .innerJoin(paymentOrders, eq(paymentOrders.orderId, fiscalDocuments.orderId))
    .where(eq(fiscalDocuments.id, documentId))
    .limit(1);

  return row || null;
}

async function hasInsertDocumentRequestedEvent(documentId: string): Promise<boolean> {
  const rows = await db
    .select({ id: fiscalDocumentEvents.id })
    .from(fiscalDocumentEvents)
    .where(
      and(
        eq(fiscalDocumentEvents.fiscalDocumentId, documentId),
        eq(fiscalDocumentEvents.eventType, 'insert_document_requested'),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

async function getAuthorFiscalIdentity(authorId: string): Promise<AuthorFiscalIdentity | null> {
  const [author] = await db
    .select({
      displayName: authors.displayName,
      email: authors.email,
      fiscalNumber: authors.fiscalNumber,
      mobilePhone: authors.mobilePhone,
      countryOfOrigin: authors.countryOfOrigin,
    })
    .from(authors)
    .where(eq(authors.authorId, authorId))
    .limit(1);

  return author || null;
}

async function ensureFiscalDocument(order: PaymentOrder, docType: string): Promise<FiscalDocument> {
  const existing = await getFiscalDocumentByOrderId(order.orderId);
  if (existing) return existing;

  const [inserted] = await db
    .insert(fiscalDocuments)
    .values({
      orderId: order.orderId,
      authorId: order.authorId,
      docType,
      status: 'pending',
      customerMode: 'final_consumer',
      finalConsumerVatNumber: FINAL_CONSUMER_VATIN,
      stripeCheckoutSessionId: metadataForOrder(order).stripe?.checkoutSessionId || null,
      stripePaymentIntentId: metadataForOrder(order).stripe?.paymentIntentId || null,
    })
    .onConflictDoNothing()
    .returning();

  return inserted || ((await getFiscalDocumentByOrderId(order.orderId)) as FiscalDocument);
}

async function acquireIssueLock(document: FiscalDocument): Promise<FiscalDocument | null> {
  const staleIssuingBefore = new Date(Date.now() - 15 * 60_000);
  const [locked] = await db
    .update(fiscalDocuments)
    .set({
      status: 'issuing',
      attemptCount: sql`${fiscalDocuments.attemptCount} + 1`,
      lastError: null,
      nextRetryAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fiscalDocuments.id, document.id),
        or(
          inArray(fiscalDocuments.status, ['pending', 'failed']),
          and(
            eq(fiscalDocuments.status, 'issuing'),
            lt(fiscalDocuments.updatedAt, staleIssuingBefore),
          ),
        ),
      ),
    )
    .returning();

  return locked || null;
}

async function markFailed(document: FiscalDocument, error: unknown): Promise<void> {
  const message = toErrorMessage(error);
  const nextRetryAt = retryTime(document.attemptCount || 1);

  await db
    .update(fiscalDocuments)
    .set({
      status: 'failed',
      lastError: message,
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(fiscalDocuments.id, document.id));

  await recordFiscalEvent({
    fiscalDocumentId: document.id,
    orderId: document.orderId,
    eventType: 'issue_failed',
    responsePayload: { error: message, nextRetryAt },
  });
}

async function upsertKeyInvoiceCustomer(params: {
  authorId: string;
  vatin: string;
  keyInvoiceClientId: string;
  source: KeyInvoiceCustomerSource;
  countryCode: string;
}): Promise<KeyInvoiceCustomer> {
  const values = {
    authorId: params.authorId,
    vatin: params.vatin,
    keyInvoiceClientId: params.keyInvoiceClientId,
    name: customerDisplayName(params.source),
    email: params.source.email || null,
    phone: params.source.phone || null,
    countryCode: params.source.address?.country || params.countryCode,
    address: customerAddress(params.source),
    postalCode: params.source.address?.postalCode || null,
    locality: params.source.address?.city || null,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  const [customer] = await db
    .insert(keyInvoiceCustomers)
    .values(values)
    .onConflictDoUpdate({
      target: keyInvoiceCustomers.vatin,
      set: values,
    })
    .returning();

  return customer;
}

export function buildRemoteDocumentSyncValues(
  document: Pick<FiscalDocument, 'docType' | 'docSeries' | 'docNum' | 'fullDocNumber'>,
  remoteDocument: Awaited<ReturnType<typeof keyInvoiceClient.getDocument>>,
) {
  const docType = remoteDocument.DocType || document.docType;
  const docSeries = remoteDocument.DocSeries || document.docSeries;
  const docNum = remoteDocument.DocNum || document.docNum;

  return {
    docType,
    docSeries,
    docNum,
    fullDocNumber:
      remoteDocument.FullDocNumber ||
      document.fullDocNumber ||
      formatFullDocNumber(docType, docSeries, docNum),
    atDocCodeId: remoteDocument.ATDocCodeID || null,
    grossTotal: decimalString(remoteDocument.GrossTotal),
    netTotal: decimalString(remoteDocument.NetTotal),
    taxTotal: decimalString(remoteDocument.TaxTotal),
  };
}

async function syncRemoteDocumentData(
  document: FiscalDocument,
  remoteDocument: Awaited<ReturnType<typeof keyInvoiceClient.getDocument>>,
): Promise<FiscalDocument> {
  const [updated] = await db
    .update(fiscalDocuments)
    .set({
      ...buildRemoteDocumentSyncValues(document, remoteDocument),
      updatedAt: new Date(),
    })
    .where(eq(fiscalDocuments.id, document.id))
    .returning();

  return updated || document;
}

async function resolveCustomer(params: {
  order: PaymentOrder;
  source: KeyInvoiceCustomerSource;
  vatResolution: ResolvedVatForKeyInvoice;
}): Promise<ResolvedCustomer> {
  const normalizedVat = params.vatResolution.normalizedVat;

  if (!normalizedVat) {
    return {
      mode: 'final_consumer',
      vatSource: 'none',
      source: params.source,
    };
  }

  const existingLocal = await db
    .select()
    .from(keyInvoiceCustomers)
    .where(eq(keyInvoiceCustomers.vatin, normalizedVat.keyInvoiceVatin))
    .limit(1);

  if (existingLocal[0]) {
    return {
      mode: 'keyinvoice_client',
      keyInvoiceClientId: existingLocal[0].keyInvoiceClientId,
      keyInvoiceCustomerId: existingLocal[0].id,
      vatin: normalizedVat.keyInvoiceVatin,
      vatSource: params.vatResolution.source,
      source: params.source,
    };
  }

  let keyInvoiceClientId: string;
  const exists = await keyInvoiceClient.clientExists(normalizedVat.keyInvoiceVatin);
  if (exists) {
    const client = await keyInvoiceClient.getClient(normalizedVat.keyInvoiceVatin);
    keyInvoiceClientId = client.IdClient;
  } else {
    const inserted = await keyInvoiceClient.insertClient({
      VATIN: normalizedVat.keyInvoiceVatin,
      Name: customerDisplayName(params.source),
      Address: customerAddress(params.source) || undefined,
      PostalCode: params.source.address?.postalCode || undefined,
      Locality: params.source.address?.city || undefined,
      CountryCode: params.source.address?.country || normalizedVat.countryCode,
      Phone: params.source.phone || undefined,
      Email: params.source.email || undefined,
      Comments: `Mythoria author ${params.order.authorId}`,
    });
    keyInvoiceClientId = inserted.Id;
  }

  const localCustomer = await upsertKeyInvoiceCustomer({
    authorId: params.order.authorId,
    vatin: normalizedVat.keyInvoiceVatin,
    keyInvoiceClientId,
    source: params.source,
    countryCode: normalizedVat.countryCode,
  });

  return {
    mode: 'keyinvoice_client',
    keyInvoiceClientId,
    keyInvoiceCustomerId: localCustomer.id,
    vatin: normalizedVat.keyInvoiceVatin,
    vatSource: params.vatResolution.source,
    source: params.source,
  };
}

export const fiscalDocumentService = {
  fiscalPdfUrl,

  async getByOrderId(orderId: string): Promise<FiscalDocument | null> {
    return getFiscalDocumentByOrderId(orderId);
  },

  async getForAuthor(documentId: string, authorId: string): Promise<FiscalDocument | null> {
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(and(eq(fiscalDocuments.id, documentId), eq(fiscalDocuments.authorId, authorId)))
      .limit(1);
    return document || null;
  },

  async retryByFiscalDocumentId(
    documentId: string,
    audit: { adminEmail?: string | null; source?: string | null } = {},
  ): Promise<AdminFiscalRetryResult> {
    const row = await getFiscalDocumentWithOrderById(documentId);
    if (!row) {
      return { outcome: 'not_found', document: null };
    }

    const hasInsertRequest = await hasInsertDocumentRequestedEvent(row.document.id);
    const reason = adminRetryBlockReasonForDocument({
      document: row.document,
      order: row.order,
      hasInsertDocumentRequestedEvent: hasInsertRequest,
    });

    if (reason) {
      if (reason === 'insert_document_response_unknown') {
        await recordFiscalEvent({
          fiscalDocumentId: row.document.id,
          orderId: row.document.orderId,
          eventType: 'retry_skipped_reconciliation_required',
          responsePayload: {
            reason,
            requestedBy: {
              adminEmail: audit.adminEmail || null,
              source: audit.source || null,
            },
          },
        });
      }

      return {
        outcome: 'not_retryable',
        document: row.document,
        reason,
        orderStatus: row.order.status,
      };
    }

    await recordFiscalEvent({
      fiscalDocumentId: row.document.id,
      orderId: row.document.orderId,
      eventType: 'admin_retry_requested',
      requestPayload: {
        adminEmail: audit.adminEmail || null,
        source: audit.source || null,
      },
    });

    return {
      outcome: 'retried',
      document: await this.issueForCompletedStripeOrder(row.order),
      orderStatus: row.order.status,
    };
  },

  async issueForCompletedStripeOrder(order: PaymentOrder): Promise<FiscalDocument | null> {
    if (!isKeyInvoiceEnabled()) return null;
    if (order.status !== 'completed') return null;

    const config = loadKeyInvoiceIssueConfig();
    const initialDocument = await ensureFiscalDocument(order, config.docType);
    if (initialDocument.status === 'issued' && initialDocument.pdfStoragePath) {
      return initialDocument;
    }

    const lockedDocument = await acquireIssueLock(initialDocument);
    if (!lockedDocument) return initialDocument;

    try {
      const metadata = metadataForOrder(order);
      const customerDetails = metadata.stripe?.customerDetails || null;
      const authorIdentity = await getAuthorFiscalIdentity(order.authorId);
      const customerSource = sourceFromStripeCustomerDetails(customerDetails, authorIdentity);
      const vatResolution = resolveKeyInvoiceVat({
        stripeTaxId: getStripeTaxId(customerDetails),
        authorFiscalNumber: authorIdentity?.fiscalNumber,
      });
      const tax = selectKeyInvoiceTax({
        amountTotalCents: order.amount,
        amountTaxCents: metadata.stripe?.totalDetails?.amount_tax,
        taxIdByRate: config.taxIdByRate,
        fallbackTaxId: config.fallbackTaxId,
      });

      if (config.draftOnly) {
        const lines = lineItemsFromOrder(order);
        const draftPayload = {
          method: 'insertDocument',
          DocType: config.docType,
          ...(config.docSeriesId ? { DocSeries: config.docSeriesId } : {}),
          DocDate: (order.updatedAt || new Date()).toISOString().slice(0, 10),
          DocReference: `Stripe ${
            metadata.stripe?.paymentIntentId || metadata.stripe?.checkoutSessionId || 'unknown'
          } / Mythoria ${order.orderId}`,
          Comments: `Pagamento recebido via Stripe. Ordem Mythoria ${order.orderId}.`,
          IdPaymentMethod: config.paymentMethodId,
          ...(vatResolution.normalizedVat
            ? { DraftCustomerVATIN: vatResolution.normalizedVat.keyInvoiceVatin }
            : {
                Name: customerDisplayName(customerSource),
                Address: customerAddress(customerSource) || undefined,
                PostalCode: customerSource.address?.postalCode || undefined,
                Locality: customerSource.address?.city || undefined,
                CountryCode: customerSource.address?.country?.trim().toUpperCase() || 'PT',
              }),
          DocLines: lines.map((line) =>
            creditPackagePayloadLine(line, tax.taxId, config.productIdsByPackageKey),
          ),
        };

        await recordFiscalEvent({
          fiscalDocumentId: lockedDocument.id,
          orderId: order.orderId,
          eventType: 'draft_document_prepared',
          requestPayload: {
            ...draftPayload,
            fiscal: {
              tax,
              draftOnly: true,
              remoteKeyInvoiceDocumentCreated: false,
              ...(vatResolution.normalizedVat
                ? {
                    customerMode: 'keyinvoice_client',
                    vatSource: vatResolution.source,
                    vatin: vatResolution.normalizedVat.keyInvoiceVatin,
                    countryCode: vatResolution.normalizedVat.countryCode,
                  }
                : {
                    ...buildFinalConsumerAuditData(),
                    vatSource: 'none',
                  }),
            },
          },
        });

        const [draft] = await db
          .update(fiscalDocuments)
          .set({
            status: 'draft',
            customerMode: vatResolution.normalizedVat ? 'keyinvoice_client' : 'final_consumer',
            keyInvoiceCustomerId: null,
            keyInvoiceClientId: null,
            finalConsumerVatNumber: vatResolution.normalizedVat ? null : FINAL_CONSUMER_VATIN,
            vatRate: tax.vatRate.toFixed(2),
            taxId: tax.taxId,
            stripeCheckoutSessionId: metadata.stripe?.checkoutSessionId || null,
            stripePaymentIntentId: metadata.stripe?.paymentIntentId || null,
            lastError: null,
            nextRetryAt: null,
            updatedAt: new Date(),
          })
          .where(eq(fiscalDocuments.id, lockedDocument.id))
          .returning();

        return draft;
      }

      const customer = await resolveCustomer({
        order,
        source: customerSource,
        vatResolution,
      });

      await db
        .update(fiscalDocuments)
        .set({
          customerMode: customer.mode,
          keyInvoiceCustomerId:
            customer.mode === 'keyinvoice_client' ? customer.keyInvoiceCustomerId : null,
          keyInvoiceClientId:
            customer.mode === 'keyinvoice_client' ? customer.keyInvoiceClientId : null,
          finalConsumerVatNumber: customer.mode === 'final_consumer' ? FINAL_CONSUMER_VATIN : null,
          vatRate: tax.vatRate.toFixed(2),
          taxId: tax.taxId,
          updatedAt: new Date(),
        })
        .where(eq(fiscalDocuments.id, lockedDocument.id));

      let documentForPdf = lockedDocument;

      if (!lockedDocument.docNum) {
        const pricesWithVat = await keyInvoiceClient.verifyUserInsertionPricesWithVAT();
        if (!pricesWithVat) {
          throw new Error(
            'KeyInvoice API user is configured for prices without VAT; Mythoria sends VAT-included gross prices.',
          );
        }

        const payload = buildKeyInvoiceDocumentPayload({
          orderId: order.orderId,
          docType: config.docType,
          docSeriesId: config.docSeriesId,
          paymentMethodId: config.paymentMethodId,
          paymentIntentId: metadata.stripe?.paymentIntentId,
          checkoutSessionId: metadata.stripe?.checkoutSessionId,
          docDate: order.updatedAt || new Date(),
          taxId: tax.taxId,
          customer:
            customer.mode === 'keyinvoice_client'
              ? {
                  mode: 'keyinvoice_client',
                  keyInvoiceClientId: customer.keyInvoiceClientId,
                  source: customer.source,
                }
              : { mode: 'final_consumer', source: customer.source },
          lines: lineItemsFromOrder(order),
          productIdsByPackageKey: config.productIdsByPackageKey,
        });

        await recordFiscalEvent({
          fiscalDocumentId: lockedDocument.id,
          orderId: order.orderId,
          eventType: 'insert_document_requested',
          requestPayload: {
            ...payload,
            fiscal: {
              tax,
              customerMode: customer.mode,
              vatSource: customer.vatSource,
              ...(customer.mode === 'keyinvoice_client'
                ? {
                    vatin: customer.vatin,
                    keyInvoiceClientId: customer.keyInvoiceClientId,
                  }
                : buildFinalConsumerAuditData()),
            },
          },
        });

        const inserted = await keyInvoiceClient.insertDocument(payload);
        await recordFiscalEvent({
          fiscalDocumentId: lockedDocument.id,
          orderId: order.orderId,
          eventType: 'insert_document_succeeded',
          responsePayload: inserted,
        });

        const [updated] = await db
          .update(fiscalDocuments)
          .set({
            docType: inserted.DocType,
            docSeries: inserted.DocSeries || config.docSeriesId || null,
            docNum: inserted.DocNum,
            fullDocNumber: inserted.FullDocNumber || null,
            stripeCheckoutSessionId: metadata.stripe?.checkoutSessionId || null,
            stripePaymentIntentId: metadata.stripe?.paymentIntentId || null,
            updatedAt: new Date(),
          })
          .where(eq(fiscalDocuments.id, lockedDocument.id))
          .returning();

        documentForPdf = updated;
      }

      if (!documentForPdf.docNum) {
        throw new Error('KeyInvoice document number missing after insertDocument');
      }

      const keyInvoiceDocumentIdentity = {
        docType: documentForPdf.docType || config.docType,
        docSeries: documentForPdf.docSeries || config.docSeriesId || null,
        docNum: documentForPdf.docNum,
      };
      const remoteDocument = await keyInvoiceClient.getDocument({
        docType: keyInvoiceDocumentIdentity.docType,
        docSeries: keyInvoiceDocumentIdentity.docSeries,
        docNum: keyInvoiceDocumentIdentity.docNum,
      });
      documentForPdf = await syncRemoteDocumentData(documentForPdf, remoteDocument);

      const pdfDocumentIdentity = {
        docType: documentForPdf.docType || keyInvoiceDocumentIdentity.docType,
        docSeries: documentForPdf.docSeries || keyInvoiceDocumentIdentity.docSeries,
        docNum: documentForPdf.docNum || keyInvoiceDocumentIdentity.docNum,
      };
      const pdfResult = await getKeyInvoiceDocumentPdfWithFallback({
        docType: pdfDocumentIdentity.docType,
        docSeries: pdfDocumentIdentity.docSeries,
        docNum: pdfDocumentIdentity.docNum,
      });
      const storedPdf = await storeFiscalDocumentPdf({
        authorId: order.authorId,
        orderId: order.orderId,
        fullDocNumber: documentForPdf.fullDocNumber || remoteDocument.DocNum,
        pdfBase64: pdfResult.pdf.DocumentBinary,
      });

      await recordFiscalEvent({
        fiscalDocumentId: lockedDocument.id,
        orderId: order.orderId,
        eventType: 'pdf_stored',
        responsePayload: {
          storagePath: storedPdf.storagePath,
          sha256: storedPdf.sha256,
          size: storedPdf.size,
          remoteDocument,
          pdf: {
            signed: pdfResult.signed,
            fallbackUsed: pdfResult.fallbackUsed,
            attempts: pdfResult.attempts,
          },
        },
      });

      if (config.registerAt) {
        const atResponse = await keyInvoiceClient.registerInvoiceAT({
          docType: pdfDocumentIdentity.docType,
          docSeries: pdfDocumentIdentity.docSeries,
          docNum: pdfDocumentIdentity.docNum,
        });
        await recordFiscalEvent({
          fiscalDocumentId: lockedDocument.id,
          orderId: order.orderId,
          eventType: 'register_at_succeeded',
          responsePayload: atResponse,
        });
      }

      const [issued] = await db
        .update(fiscalDocuments)
        .set({
          status: 'issued',
          docType: remoteDocument.DocType || documentForPdf.docType,
          docSeries: remoteDocument.DocSeries || documentForPdf.docSeries,
          docNum: remoteDocument.DocNum || documentForPdf.docNum,
          fullDocNumber:
            remoteDocument.FullDocNumber ||
            documentForPdf.fullDocNumber ||
            formatFullDocNumber(
              pdfDocumentIdentity.docType,
              pdfDocumentIdentity.docSeries,
              pdfDocumentIdentity.docNum,
            ),
          atDocCodeId: remoteDocument.ATDocCodeID || null,
          grossTotal: decimalString(remoteDocument.GrossTotal),
          netTotal: decimalString(remoteDocument.NetTotal),
          taxTotal: decimalString(remoteDocument.TaxTotal),
          pdfStoragePath: storedPdf.storagePath,
          pdfSha256: storedPdf.sha256,
          lastError: null,
          nextRetryAt: null,
          issuedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fiscalDocuments.id, lockedDocument.id))
        .returning();

      return issued;
    } catch (error) {
      await markFailed(lockedDocument, error);
      console.error('KeyInvoice fiscal document issuing failed:', error);
      return await getFiscalDocumentByOrderId(order.orderId);
    }
  },

  async retryDueDocuments(
    limit = 25,
    orderIds: string[] = [],
  ): Promise<FiscalDocumentRetryResult[]> {
    if (!isKeyInvoiceEnabled()) return [];

    const now = new Date();
    const conditions = [
      eq(paymentOrders.status, 'completed'),
      inArray(fiscalDocuments.status, ['pending', 'failed']),
      or(isNull(fiscalDocuments.nextRetryAt), lt(fiscalDocuments.nextRetryAt, now)),
    ];

    if (orderIds.length) {
      conditions.push(inArray(fiscalDocuments.orderId, orderIds));
    }

    const rows = await db
      .select({ document: fiscalDocuments, order: paymentOrders })
      .from(fiscalDocuments)
      .innerJoin(paymentOrders, eq(paymentOrders.orderId, fiscalDocuments.orderId))
      .where(and(...conditions))
      .orderBy(asc(fiscalDocuments.createdAt))
      .limit(limit);

    const results: FiscalDocumentRetryResult[] = [];
    for (const row of rows) {
      const retrySkippedReason = retrySkipReasonForDocument(
        row.document,
        await hasInsertDocumentRequestedEvent(row.document.id),
      );

      if (retrySkippedReason) {
        await recordFiscalEvent({
          fiscalDocumentId: row.document.id,
          orderId: row.document.orderId,
          eventType: 'retry_skipped_reconciliation_required',
          responsePayload: { reason: retrySkippedReason },
        });
        results.push({ document: row.document, retrySkippedReason });
        continue;
      }

      results.push({ document: await this.issueForCompletedStripeOrder(row.order) });
    }
    return results;
  },

  async recordFiscalEventForOrder(
    orderId: string,
    eventType: string,
    responsePayload?: unknown,
  ): Promise<void> {
    const document = await getFiscalDocumentByOrderId(orderId);
    await recordFiscalEvent({
      fiscalDocumentId: document?.id || null,
      orderId,
      eventType,
      responsePayload,
    });

    if (document) {
      await db
        .update(fiscalDocuments)
        .set({
          status: 'credit_note_required',
          updatedAt: new Date(),
        })
        .where(and(eq(fiscalDocuments.id, document.id), eq(fiscalDocuments.status, 'issued')));
    }
  },
};
