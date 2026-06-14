import { buildKeyInvoiceDocumentPayload } from './document-builder';

describe('buildKeyInvoiceDocumentPayload', () => {
  const baseInput = {
    orderId: 'order-123',
    docType: '34',
    docSeriesId: 'SERIES1',
    paymentMethodId: 'STRIPE_PM',
    paymentIntentId: 'pi_123',
    checkoutSessionId: 'cs_123',
    docDate: new Date('2026-06-14T10:00:00Z'),
    taxId: 'TAX6',
    lines: [
      {
        packageId: 1,
        packageKey: 'credits10',
        quantity: 2,
        credits: 10,
        unitPrice: 9,
      },
    ],
    productIdsByPackageKey: {
      credits10: 'KI-CREDITS-10',
    },
  };

  it('builds a final-consumer Fatura-Recibo payload', () => {
    const payload = buildKeyInvoiceDocumentPayload({
      ...baseInput,
      customer: {
        mode: 'final_consumer',
        source: {
          name: null,
          address: {
            line1: 'Rua A',
            city: 'Lisboa',
            postalCode: '1000-001',
            country: 'PT',
          },
        },
      },
    });

    expect(payload).toMatchObject({
      method: 'insertDocument',
      DocType: '34',
      DocSeries: 'SERIES1',
      Name: 'Consumidor Final',
      CountryCode: 'PT',
      IdPaymentMethod: 'STRIPE_PM',
      DocLines: [
        {
          IdProduct: 'KI-CREDITS-10',
          ProductName: 'Geração de Livros - 10 créditos',
          Qty: '2',
          Price: '9.00',
          IdTax: 'TAX6',
        },
      ],
    });
  });

  it('builds a KeyInvoice client payload when a client id exists', () => {
    const payload = buildKeyInvoiceDocumentPayload({
      ...baseInput,
      customer: {
        mode: 'keyinvoice_client',
        keyInvoiceClientId: '1005',
        source: { name: 'Cliente A' },
      },
    });

    expect(payload.IdClient).toBe('1005');
    expect(payload.Name).toBeUndefined();
  });

  it('fails closed when a package product id is missing', () => {
    expect(() =>
      buildKeyInvoiceDocumentPayload({
        ...baseInput,
        productIdsByPackageKey: {},
        customer: {
          mode: 'final_consumer',
          source: {},
        },
      }),
    ).toThrow('Missing KeyInvoice product id for credit package credits10');
  });
});
