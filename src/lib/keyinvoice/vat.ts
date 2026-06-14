import { cleanVATNumber, validateVATNumber } from '@/lib/vat-validation';

export interface NormalizedVatInfo {
  input: string;
  normalized: string;
  keyInvoiceVatin: string;
  countryCode: string;
  isPortugueseNif: boolean;
}

export function isValidPortugueseNif(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{9}$/.test(digits)) return false;

  const checkDigit = Number(digits[8]);
  const sum = digits
    .slice(0, 8)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (9 - index), 0);
  const remainder = sum % 11;
  const expected = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === expected;
}

export function normalizeVatForKeyInvoice(input?: string | null): NormalizedVatInfo | null {
  if (!input?.trim()) return null;

  const cleaned = cleanVATNumber(input);
  const barePortuguese = /^\d{9}$/.test(cleaned) ? cleaned : null;
  const portugueseWithPrefix = /^PT\d{9}$/.test(cleaned) ? cleaned.slice(2) : null;
  const portugueseDigits = barePortuguese || portugueseWithPrefix;

  if (portugueseDigits) {
    if (!isValidPortugueseNif(portugueseDigits)) return null;
    return {
      input,
      normalized: `PT${portugueseDigits}`,
      keyInvoiceVatin: portugueseDigits,
      countryCode: 'PT',
      isPortugueseNif: true,
    };
  }

  const validation = validateVATNumber(cleaned);
  if (!validation.isValid || !validation.formattedVAT) return null;

  return {
    input,
    normalized: validation.formattedVAT,
    keyInvoiceVatin: validation.formattedVAT,
    countryCode: validation.formattedVAT.slice(0, 2),
    isPortugueseNif: false,
  };
}
