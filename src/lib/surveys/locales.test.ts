import { normalizeLocale } from '@/utils/locale-utils';
import { SUPPORTED_LOCALES_CANONICAL } from './locales';

describe('survey locale aliases', () => {
  it('agree with normalizeLocale', () => {
    for (const { locale, aliases } of SUPPORTED_LOCALES_CANONICAL) {
      expect(normalizeLocale(locale)).toBe(locale);
      for (const alias of aliases) expect(normalizeLocale(alias)).toBe(locale);
    }
    expect(normalizeLocale('xx')).toBe('en-US');
  });
});
