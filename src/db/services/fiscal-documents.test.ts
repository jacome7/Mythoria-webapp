jest.mock('@/db', () => ({ db: {} }));
jest.mock('@/lib/keyinvoice/client', () => ({ keyInvoiceClient: {} }));
jest.mock('@/lib/keyinvoice/pdf-storage', () => ({ storeFiscalDocumentPdf: jest.fn() }));

import {
  adminRetryBlockReasonForDocument,
  retrySkipReasonForDocument,
} from './fiscal-documents';

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
