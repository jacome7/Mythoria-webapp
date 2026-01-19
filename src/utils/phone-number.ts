import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Map of supported locales to their corresponding country codes
 * Used to determine default country code when parsing phone numbers
 */
const LOCALE_TO_COUNTRY: Record<string, CountryCode> = {
  'en-US': 'US',
  'pt-PT': 'PT',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'de-DE': 'DE',
};

/**
 * Format a phone number for Clerk's SignUp component
 *
 * This function handles phone numbers that may or may not have country codes:
 * - If the number has a country code (starts with +), it's parsed as-is
 * - If the number lacks a country code, we use the locale to determine the default country
 * - Returns the number in E.164 format (e.g., +351912345678) which Clerk expects
 *
 * @param phoneNumber - The raw phone number (with or without country code)
 * @param locale - The user's locale (e.g., 'pt-PT', 'en-US')
 * @returns Formatted phone number in E.164 format, or null if invalid
 *
 * @example
 * formatPhoneNumberForClerk('912345678', 'pt-PT')  // returns '+351912345678'
 * formatPhoneNumberForClerk('+351912345678', 'pt-PT')  // returns '+351912345678'
 * formatPhoneNumberForClerk('555-123-4567', 'en-US')  // returns '+15551234567'
 */
export function formatPhoneNumberForClerk(
  phoneNumber: string | null | undefined,
  locale: string,
): string | null {
  if (!phoneNumber) {
    return null;
  }

  try {
    // Clean the phone number (remove spaces, dashes, parentheses)
    const cleanedNumber = phoneNumber.trim();

    // Determine the default country code from locale
    const defaultCountry = LOCALE_TO_COUNTRY[locale] || 'PT'; // Default to Portugal if locale not found

    // Try to parse the phone number
    // If it has a country code, parsePhoneNumber will detect it
    // If not, we provide the defaultCountry as a hint
    let parsedNumber;

    if (cleanedNumber.startsWith('+')) {
      // Number already has country code
      parsedNumber = parsePhoneNumber(cleanedNumber);
    } else {
      // Number doesn't have country code, use locale-based default
      parsedNumber = parsePhoneNumber(cleanedNumber, defaultCountry);
    }

    // Validate the parsed number
    if (!parsedNumber || !parsedNumber.isValid()) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[formatPhoneNumberForClerk] Invalid phone number:', {
          phoneNumber,
          locale,
          defaultCountry,
        });
      }
      return null;
    }

    // Return in E.164 format (international format with +)
    const formattedNumber = parsedNumber.format('E.164');

    return formattedNumber;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[formatPhoneNumberForClerk] Error formatting phone number:', {
        phoneNumber,
        locale,
        error,
      });
    }
    return null;
  }
}

/**
 * Check if a phone number appears to have a country code
 * @param phoneNumber - The phone number to check
 * @returns true if the number starts with + (has country code)
 */
export function hasCountryCode(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) {
    return false;
  }
  return phoneNumber.trim().startsWith('+');
}
