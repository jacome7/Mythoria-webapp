jest.mock('@/db', () => ({ db: {} }));
jest.mock('@/lib/keyinvoice/client', () => ({ keyInvoiceClient: {} }));
jest.mock('@/lib/keyinvoice/pdf-storage', () => ({ storeFiscalDocumentPdf: jest.fn() }));

import { retrySkipReasonForDocument } from './fiscal-documents';

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
