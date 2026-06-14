import { isValidPortugueseNif, normalizeVatForKeyInvoice } from './vat';

describe('isValidPortugueseNif', () => {
  it('accepts the Portuguese final-consumer convention NIF', () => {
    expect(isValidPortugueseNif('999999990')).toBe(true);
  });
});

describe('normalizeVatForKeyInvoice', () => {
  it('normalizes PT-prefixed NIFs to the bare KeyInvoice VATIN value', () => {
    expect(normalizeVatForKeyInvoice('PT 999 999 990')).toMatchObject({
      normalized: 'PT999999990',
      keyInvoiceVatin: '999999990',
      countryCode: 'PT',
    });
  });
});
