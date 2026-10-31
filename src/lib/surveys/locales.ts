/**
 * Canonical survey/invitation locales with the aliases accepted for `authors.preferred_locale`.
 * Must match `normalizeLocale` in src/utils/locale-utils.ts (verified in locales.test.ts);
 * the audience snapshot normalizes the locale inside SQL using this table.
 */
export const SUPPORTED_LOCALES_CANONICAL = [
  { locale: 'en-US', aliases: ['en', 'en-us'] },
  { locale: 'pt-PT', aliases: ['pt', 'pt-pt'] },
  { locale: 'es-ES', aliases: ['es', 'es-es'] },
  { locale: 'fr-FR', aliases: ['fr', 'fr-fr'] },
  { locale: 'de-DE', aliases: ['de', 'de-de'] },
] as const;
