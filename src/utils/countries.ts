export const SUPPORTED_COUNTRIES = [
  'US',
  'GB',
  'DE',
  'FR',
  'ES',
  'IT',
  'PT',
  'NL',
  'BE',
  'CA',
  'AU',
  'JP',
  'BR',
] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const LOCALE_TO_COUNTRY: Record<string, SupportedCountry> = {
  'en-US': 'US',
  'pt-PT': 'PT',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'de-DE': 'DE',
};

export function localeToCountry(locale: string): SupportedCountry | null {
  return LOCALE_TO_COUNTRY[locale] ?? null;
}

export function getCountryOptions(
  t: (key: string) => string,
): Array<{ value: string; label: string }> {
  const countries = SUPPORTED_COUNTRIES.map((code) => ({
    value: code,
    label: t(`countries.${code.toLowerCase()}`),
  }));
  return countries.sort((a, b) => a.label.localeCompare(b.label));
}
