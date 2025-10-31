import { formatPhoneNumberForClerk, hasCountryCode } from './phone-number';

describe('formatPhoneNumberForClerk', () => {
  describe('Portuguese numbers (pt-PT)', () => {
    it('should format Portuguese mobile number without country code', () => {
      const result = formatPhoneNumberForClerk('912345678', 'pt-PT');
      expect(result).toBe('+351912345678');
    });

    it('should format Portuguese mobile number with country code', () => {
      const result = formatPhoneNumberForClerk('+351912345678', 'pt-PT');
      expect(result).toBe('+351912345678');
    });

    it('should format Portuguese number with spaces', () => {
      const result = formatPhoneNumberForClerk('91 234 5678', 'pt-PT');
      expect(result).toBe('+351912345678');
    });

    it('should format Portuguese number with dashes', () => {
      const result = formatPhoneNumberForClerk('91-234-5678', 'pt-PT');
      expect(result).toBe('+351912345678');
    });
  });

  describe('US numbers (en-US)', () => {
    it('should format US number without country code', () => {
      const result = formatPhoneNumberForClerk('2125551234', 'en-US');
      expect(result).toBe('+12125551234');
    });

    it('should format US number with country code', () => {
      const result = formatPhoneNumberForClerk('+12125551234', 'en-US');
      expect(result).toBe('+12125551234');
    });

    it('should format US number with formatting', () => {
      const result = formatPhoneNumberForClerk('(212) 555-1234', 'en-US');
      expect(result).toBe('+12125551234');
    });
  });

  describe('Spanish numbers (es-ES)', () => {
    it('should format Spanish mobile number without country code', () => {
      const result = formatPhoneNumberForClerk('612345678', 'es-ES');
      expect(result).toBe('+34612345678');
    });

    it('should format Spanish mobile number with country code', () => {
      const result = formatPhoneNumberForClerk('+34612345678', 'es-ES');
      expect(result).toBe('+34612345678');
    });
  });

  describe('French numbers (fr-FR)', () => {
    it('should format French mobile number without country code', () => {
      const result = formatPhoneNumberForClerk('612345678', 'fr-FR');
      expect(result).toBe('+33612345678');
    });

    it('should format French mobile number with country code', () => {
      const result = formatPhoneNumberForClerk('+33612345678', 'fr-FR');
      expect(result).toBe('+33612345678');
    });
  });

  describe('German numbers (de-DE)', () => {
    it('should format German mobile number without country code', () => {
      const result = formatPhoneNumberForClerk('15123456789', 'de-DE');
      expect(result).toBe('+4915123456789');
    });

    it('should format German mobile number with country code', () => {
      const result = formatPhoneNumberForClerk('+4915123456789', 'de-DE');
      expect(result).toBe('+4915123456789');
    });
  });

  describe('Edge cases', () => {
    it('should return null for null input', () => {
      const result = formatPhoneNumberForClerk(null, 'pt-PT');
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = formatPhoneNumberForClerk(undefined, 'pt-PT');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = formatPhoneNumberForClerk('', 'pt-PT');
      expect(result).toBeNull();
    });

    it('should return null for invalid phone number', () => {
      const result = formatPhoneNumberForClerk('123', 'pt-PT');
      expect(result).toBeNull();
    });

    it('should default to PT for unknown locale', () => {
      const result = formatPhoneNumberForClerk('912345678', 'xx-XX');
      expect(result).toBe('+351912345678');
    });

    it('should handle whitespace-only input', () => {
      const result = formatPhoneNumberForClerk('   ', 'pt-PT');
      expect(result).toBeNull();
    });
  });

  describe('International numbers with explicit country code', () => {
    it('should format UK number regardless of locale', () => {
      const result = formatPhoneNumberForClerk('+447911123456', 'pt-PT');
      expect(result).toBe('+447911123456');
    });

    it('should format Brazilian number regardless of locale', () => {
      const result = formatPhoneNumberForClerk('+5511987654321', 'en-US');
      expect(result).toBe('+5511987654321');
    });
  });
});

describe('hasCountryCode', () => {
  it('should return true for number with country code', () => {
    expect(hasCountryCode('+351912345678')).toBe(true);
  });

  it('should return false for number without country code', () => {
    expect(hasCountryCode('912345678')).toBe(false);
  });

  it('should return false for null', () => {
    expect(hasCountryCode(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(hasCountryCode(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(hasCountryCode('')).toBe(false);
  });

  it('should handle whitespace before +', () => {
    expect(hasCountryCode('  +351912345678')).toBe(true);
  });
});
