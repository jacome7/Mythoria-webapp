/**
 * EU VAT Number Validation Utilities
 * Based on official EU VAT number formats
 */

export interface VATValidationResult {
  isValid: boolean;
  country?: string;
  formattedVAT?: string;
  error?: string;
}

// EU VAT Number patterns by country
const VAT_PATTERNS: Record<string, { pattern: RegExp; name: string; format: string }> = {
  AT: { pattern: /^ATU\d{8}$/, name: 'Austria', format: 'ATU12345678' },
  BE: { pattern: /^BE[01]\d{9}$/, name: 'Belgium', format: 'BE0123456789' },
  BG: { pattern: /^BG\d{9,10}$/, name: 'Bulgaria', format: 'BG123456789' },
  CY: { pattern: /^CY\d{8}L$/, name: 'Cyprus', format: 'CY12345678L' },
  CZ: { pattern: /^CZ\d{8,10}$/, name: 'Czech Republic', format: 'CZ12345678' },
  DE: { pattern: /^DE\d{9}$/, name: 'Germany', format: 'DE123456789' },
  DK: { pattern: /^DK\d{8}$/, name: 'Denmark', format: 'DK12345678' },
  EE: { pattern: /^EE\d{9}$/, name: 'Estonia', format: 'EE123456789' },
  EL: { pattern: /^EL\d{9}$/, name: 'Greece', format: 'EL123456789' },
  ES: { pattern: /^ES[A-Z]\d{7}[A-Z]$|^ES[A-Z][0-9]{7}[0-9A-Z]$|^ES[0-9]{8}[A-Z]$/, name: 'Spain', format: 'ESA12345674' },
  FI: { pattern: /^FI\d{8}$/, name: 'Finland', format: 'FI12345678' },
  FR: { pattern: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/, name: 'France', format: 'FR12345678901' },
  HR: { pattern: /^HR\d{11}$/, name: 'Croatia', format: 'HR12345678901' },
  HU: { pattern: /^HU\d{8}$/, name: 'Hungary', format: 'HU12345678' },
  IE: { pattern: /^IE\d{7}[A-WY][A-I]?|IE[0-9+][A-Z+][0-9]{5}[A-WY]$/, name: 'Ireland', format: 'IE1234567WA' },
  IT: { pattern: /^IT\d{11}$/, name: 'Italy', format: 'IT12345678901' },
  LT: { pattern: /^LT\d{9,12}$/, name: 'Lithuania', format: 'LT123456789' },
  LU: { pattern: /^LU\d{8}$/, name: 'Luxembourg', format: 'LU12345678' },
  LV: { pattern: /^LV\d{11}$/, name: 'Latvia', format: 'LV12345678901' },
  MT: { pattern: /^MT\d{8}$/, name: 'Malta', format: 'MT12345678' },
  NL: { pattern: /^NL\d{9}B\d{2}$/, name: 'Netherlands', format: 'NL123456789B01' },
  PL: { pattern: /^PL\d{10}$/, name: 'Poland', format: 'PL1234567890' },
  PT: { pattern: /^PT\d{9}$/, name: 'Portugal', format: 'PT123456789' },
  RO: { pattern: /^RO\d{2,10}$/, name: 'Romania', format: 'RO123456789' },
  SE: { pattern: /^SE\d{12}$/, name: 'Sweden', format: 'SE123456789012' },
  SI: { pattern: /^SI\d{8}$/, name: 'Slovenia', format: 'SI12345678' },
  SK: { pattern: /^SK\d{10}$/, name: 'Slovakia', format: 'SK1234567890' },
  // Non-EU countries that use similar VAT systems
  GB: { pattern: /^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/, name: 'United Kingdom', format: 'GB123456789' },
  NO: { pattern: /^NO\d{9}MVA$/, name: 'Norway', format: 'NO123456789MVA' },
  CH: { pattern: /^CHE\d{9}(MWST|TVA|IVA)$/, name: 'Switzerland', format: 'CHE123456789MWST' },
};

/**
 * Clean and normalize VAT number input
 */
export function cleanVATNumber(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s\-\.]/g, '') // Remove spaces, dashes, and dots
    .trim();
}

/**
 * Validate EU VAT number format
 */
export function validateVATNumber(input: string): VATValidationResult {
  if (!input || input.length < 4) {
    return {
      isValid: false,
      error: 'VAT number is too short'
    };
  }

  const cleanedVAT = cleanVATNumber(input);
  
  // Extract country code (first 2 characters)
  const countryCode = cleanedVAT.substring(0, 2);
  
  if (!VAT_PATTERNS[countryCode]) {
    return {
      isValid: false,
      error: `Unsupported country code: ${countryCode}. Please use an EU VAT number.`
    };
  }

  const countryPattern = VAT_PATTERNS[countryCode];
  
  if (!countryPattern.pattern.test(cleanedVAT)) {
    return {
      isValid: false,
      country: countryPattern.name,
      error: `Invalid ${countryPattern.name} VAT number format. Expected format: ${countryPattern.format}`
    };
  }

  return {
    isValid: true,
    country: countryPattern.name,
    formattedVAT: cleanedVAT
  };
}

/**
 * Format VAT number with country-specific formatting
 */
export function formatVATNumber(input: string): string {
  const cleaned = cleanVATNumber(input);
  const countryCode = cleaned.substring(0, 2);
  
  if (!VAT_PATTERNS[countryCode]) {
    return cleaned;
  }

  // Add formatting for better readability
  switch (countryCode) {
    case 'BE':
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}.${cleaned.substring(9, 12)}`;
    case 'NL':
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}.${cleaned.substring(8, 11)}.${cleaned.substring(11)}`;
    case 'DE':
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8, 11)}`;
    case 'FR':
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 10)} ${cleaned.substring(10, 13)}`;
    default:
      // Add space after country code for better readability
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
  }
}

/**
 * Get list of supported EU countries for VAT validation
 */
export function getSupportedVATCountries(): Array<{ code: string; name: string; format: string }> {
  return Object.entries(VAT_PATTERNS).map(([code, info]) => ({
    code,
    name: info.name,
    format: info.format
  }));
}
