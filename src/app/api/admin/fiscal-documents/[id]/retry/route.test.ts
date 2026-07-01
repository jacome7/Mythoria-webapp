/** @jest-environment node */

jest.mock('@/db/services', () => ({
  fiscalDocumentService: {
    retryByFiscalDocumentId: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';

import { fiscalDocumentService } from '@/db/services';

import { POST } from './route';

const retryByFiscalDocumentIdMock =
  fiscalDocumentService.retryByFiscalDocumentId as jest.Mock;

function request(body: unknown, apiKey = 'admin-secret') {
  return new NextRequest('https://mythoria.pt/api/admin/fiscal-documents/doc-1/retry', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
}

function params(id = 'doc-1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/admin/fiscal-documents/[id]/retry', () => {
  const originalAdminApiKey = process.env.ADMIN_API_KEY;

  beforeEach(() => {
    process.env.ADMIN_API_KEY = 'admin-secret';
    retryByFiscalDocumentIdMock.mockReset();
  });

  afterEach(() => {
    if (originalAdminApiKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = originalAdminApiKey;
    }
  });

  it('returns JSON 500 when ADMIN_API_KEY is not configured', async () => {
    delete process.env.ADMIN_API_KEY;

    const response = await POST(request({}), params());
    await expect(response.json()).resolves.toEqual({
      error: 'ADMIN_API_KEY is not configured',
    });
    expect(response.status).toBe(500);
  });

  it('returns JSON 401 for an invalid API key', async () => {
    const response = await POST(request({}, 'wrong'), params());

    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(response.status).toBe(401);
  });

  it('passes admin audit metadata to the retry service and returns JSON 200', async () => {
    retryByFiscalDocumentIdMock.mockResolvedValue({
      outcome: 'retried',
      orderStatus: 'completed',
      document: {
        id: 'doc-1',
        orderId: 'order-1',
        status: 'issued',
        docType: '34',
        docSeries: '23',
        docNum: '100',
        fullDocNumber: 'FR 23/100',
        pdfStoragePath: 'fiscal-documents/order-1.pdf',
        lastError: null,
        nextRetryAt: null,
        issuedAt: new Date('2026-07-01T12:00:00.000Z'),
        updatedAt: new Date('2026-07-01T12:01:00.000Z'),
      },
    });

    const response = await POST(
      request({ adminEmail: 'admin@mythoria.pt', source: 'mythoria_admin' }),
      params('doc-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(retryByFiscalDocumentIdMock).toHaveBeenCalledWith('doc-1', {
      adminEmail: 'admin@mythoria.pt',
      source: 'mythoria_admin',
    });
    expect(body).toMatchObject({
      success: true,
      outcome: 'retried',
      document: {
        id: 'doc-1',
        status: 'issued',
        issuedAt: '2026-07-01T12:00:00.000Z',
      },
    });
  });

  it('returns JSON 409 when the document is not retryable', async () => {
    retryByFiscalDocumentIdMock.mockResolvedValue({
      outcome: 'not_retryable',
      reason: 'retry_not_due',
      orderStatus: 'completed',
      document: {
        id: 'doc-1',
        orderId: 'order-1',
        status: 'failed',
        docType: '34',
        docSeries: null,
        docNum: null,
        fullDocNumber: null,
        pdfStoragePath: null,
        lastError: 'KeyInvoice authenticate transport failed',
        nextRetryAt: new Date('2026-07-01T12:05:00.000Z'),
        issuedAt: null,
        updatedAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    });

    const response = await POST(request({}), params());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: 'Fiscal document is not retryable',
      reason: 'retry_not_due',
      document: {
        id: 'doc-1',
        status: 'failed',
        nextRetryAt: '2026-07-01T12:05:00.000Z',
      },
    });
  });
});
