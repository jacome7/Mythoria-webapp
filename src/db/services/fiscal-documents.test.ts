jest.mock('@/db', () => ({ db: {} }));
jest.mock('@/lib/keyinvoice/client', () => ({
  keyInvoiceClient: {
    getDocumentPDF: jest.fn(),
  },
}));
jest.mock('@/lib/keyinvoice/pdf-storage', () => ({ storeFiscalDocumentPdf: jest.fn() }));

import { keyInvoiceClient } from '@/lib/keyinvoice/client';
import {
  adminRetryBlockReasonForDocument,
  buildRemoteDocumentSyncValues,
  getKeyInvoiceDocumentPdfWithFallback,
  resolveKeyInvoiceVat,
  retrySkipReasonForDocument,
} from './fiscal-documents';

const mockKeyInvoiceClient = jest.mocked(keyInvoiceClient);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveKeyInvoiceVat', () => {
  it('prefers a valid Stripe Checkout tax id over the author profile VAT', () => {
    const result = resolveKeyInvoiceVat({
      stripeTaxId: 'PT 999 999 990',
      authorFiscalNumber: '231292686',
    });

    expect(result).toMatchObject({
      source: 'stripe_checkout_tax_id',
      normalizedVat: {
        keyInvoiceVatin: '999999990',
        countryCode: 'PT',
      },
    });
  });

  it('uses a valid author profile NIF when Stripe did not collect one', () => {
    const result = resolveKeyInvoiceVat({
      stripeTaxId: null,
      authorFiscalNumber: '231292686',
    });

    expect(result).toMatchObject({
      source: 'author_profile_fiscal_number',
      normalizedVat: {
        keyInvoiceVatin: '231292686',
        countryCode: 'PT',
      },
    });
  });

  it('falls back to final consumer when neither VAT candidate is valid', () => {
    expect(
      resolveKeyInvoiceVat({
        stripeTaxId: '123',
        authorFiscalNumber: 'not-a-vat',
      }),
    ).toEqual({
      source: 'none',
      rawValue: null,
      normalizedVat: null,
    });
  });
});

describe('buildRemoteDocumentSyncValues', () => {
  it('builds remote document fields that can be persisted before PDF retrieval', () => {
    expect(
      buildRemoteDocumentSyncValues(
        { docType: '34', docSeries: '23', docNum: '9', fullDocNumber: null },
        {
          DocType: '34',
          DocSeries: '23',
          DocNum: '9',
          FullDocNumber: '34 23/9',
          Date: undefined,
          IdClient: undefined,
          VATIN: undefined,
          ClientName: undefined,
          ATDocCodeID: 'at-code',
          GrossTotal: '43',
          NetTotal: '40.57',
          TaxTotal: '2.43',
          Voided: undefined,
        },
      ),
    ).toEqual({
      docType: '34',
      docSeries: '23',
      docNum: '9',
      fullDocNumber: '34 23/9',
      atDocCodeId: 'at-code',
      grossTotal: '43.00',
      netTotal: '40.57',
      taxTotal: '2.43',
    });
  });
});

describe('getKeyInvoiceDocumentPdfWithFallback', () => {
  it('retries signed PDF generation, then falls back to unsigned A4 PDF', async () => {
    mockKeyInvoiceClient.getDocumentPDF
      .mockRejectedValueOnce(new Error('Could not generate PDF file data'))
      .mockRejectedValueOnce(new Error('Could not generate PDF file data'))
      .mockResolvedValueOnce({ DocumentBinary: 'base64-pdf' });

    const result = await getKeyInvoiceDocumentPdfWithFallback(
      {
        docType: '34',
        docSeries: '23',
        docNum: '9',
      },
      { retryDelayMs: 0 },
    );

    expect(result).toEqual({
      pdf: { DocumentBinary: 'base64-pdf' },
      signed: false,
      fallbackUsed: true,
      attempts: 3,
    });
    expect(mockKeyInvoiceClient.getDocumentPDF).toHaveBeenNthCalledWith(1, {
      docType: '34',
      docSeries: '23',
      docNum: '9',
      signed: true,
    });
    expect(mockKeyInvoiceClient.getDocumentPDF).toHaveBeenNthCalledWith(2, {
      docType: '34',
      docSeries: '23',
      docNum: '9',
      signed: true,
    });
    expect(mockKeyInvoiceClient.getDocumentPDF).toHaveBeenNthCalledWith(3, {
      docType: '34',
      docSeries: '23',
      docNum: '9',
      signed: false,
    });
  });
});

describe('retrySkipReasonForDocument', () => {
  it('allows retries before insertDocument is requested', () => {
    expect(retrySkipReasonForDocument({ docNum: null }, false)).toBeNull();
  });

  it('skips retries when insertDocument was requested but no remote document number is stored', () => {
    expect(retrySkipReasonForDocument({ docNum: null }, true)).toBe(
      'insert_document_response_unknown',
    );
  });

  it('allows retries to resume PDF/storage work when a remote document number is stored', () => {
    expect(retrySkipReasonForDocument({ docNum: '12345' }, true)).toBeNull();
  });

  it('does not force a new insertDocument call when the remote document number exists', () => {
    expect(retrySkipReasonForDocument({ docNum: '9' }, true)).toBeNull();
  });
});

describe('adminRetryBlockReasonForDocument', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');

  it('allows pending completed documents with no future retry delay', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: { status: 'pending', nextRetryAt: null, docNum: null },
        order: { status: 'completed' },
        hasInsertDocumentRequestedEvent: false,
        now,
      }),
    ).toBeNull();
  });

  it('rejects non-pending/failed fiscal document statuses', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: { status: 'issued', nextRetryAt: null, docNum: null },
        order: { status: 'completed' },
        hasInsertDocumentRequestedEvent: false,
        now,
      }),
    ).toBe('document_status_not_retryable');
  });

  it('rejects payment orders that are not completed', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: { status: 'failed', nextRetryAt: null, docNum: null },
        order: { status: 'processing' },
        hasInsertDocumentRequestedEvent: false,
        now,
      }),
    ).toBe('payment_order_not_completed');
  });

  it('rejects documents whose retry time is still in the future', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: {
          status: 'failed',
          nextRetryAt: new Date('2026-07-01T12:05:00.000Z'),
          docNum: null,
        },
        order: { status: 'completed' },
        hasInsertDocumentRequestedEvent: false,
        now,
      }),
    ).toBe('retry_not_due');
  });

  it('rejects documents that require manual KeyInvoice reconciliation', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: { status: 'failed', nextRetryAt: null, docNum: null },
        order: { status: 'completed' },
        hasInsertDocumentRequestedEvent: true,
        now,
      }),
    ).toBe('insert_document_response_unknown');
  });

  it('allows retries to resume after a remote document number has been stored', () => {
    expect(
      adminRetryBlockReasonForDocument({
        document: { status: 'failed', nextRetryAt: null, docNum: '123' },
        order: { status: 'completed' },
        hasInsertDocumentRequestedEvent: true,
        now,
      }),
    ).toBeNull();
  });
});
