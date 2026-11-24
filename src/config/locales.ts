const DEFAULT_SUPPORTED_LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'] as const;

const configuredLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
  .map((locale) => locale.trim())
  .filter(Boolean);

export const SUPPORTED_LOCALES: readonly string[] = configuredLocales?.length
  ? configuredLocales
  : DEFAULT_SUPPORTED_LOCALES;

export type SupportedLocale = (typeof DEFAULT_SUPPORTED_LOCALES)[number];
