import { validateVATNumber, formatVATNumber, getSupportedVATCountries } from '@/lib/vat-validation';

describe('validateVATNumber', () => {
  it('accepts valid VAT numbers', () => {
    const result = validateVATNumber('DE123456789');
    expect(result).toMatchObject({ isValid: true, country: 'Germany' });
  });

  it('rejects invalid format', () => {
    const result = validateVATNumber('DE123');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid Germany VAT number format');
  });

  it('rejects unsupported country', () => {
    const result = validateVATNumber('XX123456');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unsupported country code');
  });
});

describe('formatVATNumber', () => {
  it('formats VAT numbers for readability', () => {
    expect(formatVATNumber('DE123456789')).toBe('DE 123 456 789');
  });
});

describe('getSupportedVATCountries', () => {
  it('includes Germany in the list', () => {
    const countries = getSupportedVATCountries();
    expect(countries).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DE', name: 'Germany' })]),
    );
  });
});
