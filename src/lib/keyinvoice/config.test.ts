import { effectiveVatRateFromStripe, selectKeyInvoiceTax } from './config';

describe('effectiveVatRateFromStripe', () => {
  it('calculates the effective VAT rate from tax-inclusive Stripe totals', () => {
    expect(effectiveVatRateFromStripe(500, 28)).toBe(5.93);
  });
});

describe('selectKeyInvoiceTax', () => {
  it('maps Stripe rounded 6% tax to the configured 6% KeyInvoice tax id', () => {
    const selection = selectKeyInvoiceTax({
      amountTotalCents: 500,
      amountTaxCents: 28,
      taxIdByRate: { '6': 'TAX6' },
      fallbackTaxId: 'FALLBACK6',
    });

    expect(selection).toMatchObject({
      taxId: 'TAX6',
      vatRate: 6,
      usedFallback: false,
    });
  });

  it('uses the requested fallback tax id when no mapping matches', () => {
    const selection = selectKeyInvoiceTax({
      amountTotalCents: 1000,
      amountTaxCents: 187,
      taxIdByRate: { '6': 'TAX6' },
      fallbackTaxId: 'FALLBACK6',
    });

    expect(selection).toMatchObject({
      taxId: 'FALLBACK6',
      vatRate: 6,
      usedFallback: true,
    });
  });
});
