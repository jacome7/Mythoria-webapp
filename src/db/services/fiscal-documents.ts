import { and, asc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
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
export type FiscalRetrySkipReason = 'insert_document_response_unknown';

export interface FiscalDocumentRetryResult {
  document: FiscalDocument | null;
  retrySkippedReason?: FiscalRetrySkipReason;
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

type ResolvedCustomer =
  | {
      mode: 'keyinvoice_client';
      keyInvoiceClientId: string;
      keyInvoiceCustomerId: string;
      vatin: string;
      source: KeyInvoiceCustomerSource;
    }
  | {
      mode: 'final_consumer';
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
): KeyInvoiceCustomerSource {
  return {
    name: customerDetails?.name || null,
    email: customerDetails?.email || null,
    phone: customerDetails?.phone || null,
    address: customerDetails?.address
      ? {
          line1: customerDetails.address.line1 || null,
          line2: customerDetails.address.line2 || null,
          city: customerDetails.address.city || null,
          postalCode: customerDetails.address.postal_code || null,
          country: customerDetails.address.country || null,
        }
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

function fiscalPdfUrl(document: FiscalDocument | null | undefined): string | null {
  if (!document?.pdfStoragePath || document.status !== 'issued') return null;
  return `/api/payments/fiscal-documents/${document.id}/pdf`;
}

export function retrySkipReasonForDocument(
  document: Pick<FiscalDocument, 'docNum'>,
  hasInsertDocumentRequestedEvent: boolean,
): FiscalRetrySkipReason | null {
  if (document.docNum) return null;
  return hasInsertDocumentRequestedEvent ? 'insert_document_response_unknown' : null;
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

async function resolveCustomer(order: PaymentOrder): Promise<ResolvedCustomer> {
  const metadata = metadataForOrder(order);
  const customerDetails = metadata.stripe?.customerDetails || null;
  const source = sourceFromStripeCustomerDetails(customerDetails);
  const normalizedVat = normalizeVatForKeyInvoice(getStripeTaxId(customerDetails));

  if (!normalizedVat) {
    return { mode: 'final_consumer', source };
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
      source,
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
      Name: customerDisplayName(source),
      Address: customerAddress(source) || undefined,
      PostalCode: source.address?.postalCode || undefined,
      Locality: source.address?.city || undefined,
      CountryCode: source.address?.country || normalizedVat.countryCode,
      Phone: source.phone || undefined,
      Email: source.email || undefined,
      Comments: `Mythoria author ${order.authorId}`,
    });
    keyInvoiceClientId = inserted.Id;
  }

  const localCustomer = await upsertKeyInvoiceCustomer({
    authorId: order.authorId,
    vatin: normalizedVat.keyInvoiceVatin,
    keyInvoiceClientId,
    source,
    countryCode: normalizedVat.countryCode,
  });

  return {
    mode: 'keyinvoice_client',
    keyInvoiceClientId,
    keyInvoiceCustomerId: localCustomer.id,
    vatin: normalizedVat.keyInvoiceVatin,
    source,
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
      const customerSource = sourceFromStripeCustomerDetails(customerDetails);
      const normalizedVat = normalizeVatForKeyInvoice(getStripeTaxId(customerDetails));
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
          ...(normalizedVat
            ? { DraftCustomerVATIN: normalizedVat.keyInvoiceVatin }
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
              ...(normalizedVat
                ? {
                    customerMode: 'keyinvoice_client',
                    vatin: normalizedVat.keyInvoiceVatin,
                    countryCode: normalizedVat.countryCode,
                  }
                : buildFinalConsumerAuditData()),
            },
          },
        });

        const [draft] = await db
          .update(fiscalDocuments)
          .set({
            status: 'draft',
            customerMode: normalizedVat ? 'keyinvoice_client' : 'final_consumer',
            keyInvoiceCustomerId: null,
            keyInvoiceClientId: null,
            finalConsumerVatNumber: normalizedVat ? null : FINAL_CONSUMER_VATIN,
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

      const customer = await resolveCustomer(order);

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
              ...(customer.mode === 'final_consumer' ? buildFinalConsumerAuditData() : {}),
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

      const remoteDocument = await keyInvoiceClient.getDocument({
        docType: documentForPdf.docType,
        docSeries: documentForPdf.docSeries,
        docNum: documentForPdf.docNum,
      });
      const pdf = await keyInvoiceClient.getDocumentPDF({
        docType: documentForPdf.docType,
        docSeries: documentForPdf.docSeries,
        docNum: documentForPdf.docNum,
      });
      const storedPdf = await storeFiscalDocumentPdf({
        authorId: order.authorId,
        orderId: order.orderId,
        fullDocNumber: documentForPdf.fullDocNumber || remoteDocument.DocNum,
        pdfBase64: pdf.DocumentBinary,
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
        },
      });

      if (config.registerAt) {
        const atResponse = await keyInvoiceClient.registerInvoiceAT({
          docType: documentForPdf.docType,
          docSeries: documentForPdf.docSeries,
          docNum: documentForPdf.docNum,
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
