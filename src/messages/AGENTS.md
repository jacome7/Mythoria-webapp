# Messages & Localization – Agent Guide

## Directory Structure

- Each locale (`en-US`, `pt-PT`, `es-ES`, `fr-FR`, …) mirrors the same set of JSON (and occasional HTML) files. File names double as translation namespaces (e.g., `HomePage.json` → `HomePage` namespace).
- Treat `en-US` as the canonical source of truth. Add or rename keys there first, then propagate to every locale directory.
- Keep non-JSON artifacts (such as `termsAndConditions.html`) in sync across locales; middleware expects parity when rendering legal pages.

## Workflow

1. Update the relevant `en-US` file(s).
2. Copy the structure to the target locales, marking untranslated entries with TODO comments or fallback strings.
3. Run `npm run i18n:keys` to regenerate `src/types/translation-keys.d.ts`.
4. Run `npm run i18n:parity` to confirm no locale is missing or carrying extra keys.
5. Use `npm run i18n:prune:pt-PT:common` (or adjust arguments) to clean unused keys when removing strings. Add prefixes to `i18n-keep.json` if you must keep specific keys.

## Usage Guidelines

- Access translations through `next-intl` helpers (`useTranslations`, `getTranslations`). Avoid hardcoding strings in components.
- Store long-form rich text (markdown/HTML) in dedicated files to keep JSON manageable, as already done for legal documents.
- Never edit `src/types/translation-keys.d.ts` manually—it is generated.
