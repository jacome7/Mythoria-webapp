import { keyInvoiceClient, resetKeyInvoiceSessionForTests } from './client';

function mockJson(json: unknown, status = 200) {
  return {
    status,
    json: jest.fn().mockResolvedValue(json),
  } as unknown as Response;
}

describe('keyInvoiceClient', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.KEYINVOICE_API_KEY;
  const originalApiUrl = process.env.KEYINVOICE_API_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    resetKeyInvoiceSessionForTests();
    process.env.KEYINVOICE_API_KEY = 'ki_test';
    process.env.KEYINVOICE_API_URL = 'https://login.keyinvoice.com/API5.php';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    resetKeyInvoiceSessionForTests();
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.KEYINVOICE_API_KEY;
    } else {
      process.env.KEYINVOICE_API_KEY = originalApiKey;
    }
    if (originalApiUrl === undefined) {
      delete process.env.KEYINVOICE_API_URL;
    } else {
      process.env.KEYINVOICE_API_URL = originalApiUrl;
    }
  });

  it('authenticates once and reuses the Sid for subsequent calls', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ Status: 1, Sid: 'sid-1' }))
      .mockResolvedValueOnce(mockJson({ Status: 1, Data: { PricesWithVAT: '1' } }))
      .mockResolvedValueOnce(mockJson({ Status: 1, Data: { Taxes: [] } }));

    await expect(keyInvoiceClient.verifyUserInsertionPricesWithVAT()).resolves.toBe(true);
    await expect(keyInvoiceClient.getTaxes()).resolves.toEqual({ Taxes: [] });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ Sid: 'sid-1' });
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({ Sid: 'sid-1' });
  });

  it('returns false for clientExists when KeyInvoice responds with Status 0', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJson({ Status: 1, Sid: 'sid-1' }))
      .mockResolvedValueOnce(mockJson({ Status: 0, ErrorMessage: 'Not found' }));

    await expect(keyInvoiceClient.clientExists('999999990')).resolves.toBe(false);
  });

  it('parses KeyInvoice payment methods from the Payments response field', async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ Status: 1, Sid: 'sid-1' })).mockResolvedValueOnce(
      mockJson({
        Status: 1,
        Data: {
          Payments: [{ IdPayment: '7', Name: 'Cartão de Crédito' }],
        },
      }),
    );

    await expect(keyInvoiceClient.listPaymentMethods()).resolves.toEqual({
      Payments: [{ IdPayment: '7', Name: 'Cartão de Crédito' }],
    });
  });
});
