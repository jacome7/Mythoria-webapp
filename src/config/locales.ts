const DEFAULT_SUPPORTED_LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'] as const;

export const SUPPORTED_LOCALES = (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',').map((l) =>
  l.trim(),
) || [...DEFAULT_SUPPORTED_LOCALES]) as readonly string[];

export type SupportedLocale = (typeof DEFAULT_SUPPORTED_LOCALES)[number];
