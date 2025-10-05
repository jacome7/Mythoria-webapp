# Source Code – Agent Guide

## Architectural Conventions

- This project targets **Next.js App Router** semantics. Treat files in `src/app` as server components by default; add `'use client'` only where hooks, browser APIs, or interactive state are required.
- Prefer typed data flows. Imports from `@/types` and `src/db/schema` provide canonical shapes; avoid `any` and keep runtime schemas in `zod` modules.
- Leverage the `@/` path alias (configured in `tsconfig.json`) for internal imports to avoid brittle relative paths.

## Directory Guidelines

- `src/app` – Route handlers, layouts, and metadata functions. Locale is the first dynamic segment (`[locale]`). Keep shared layout concerns (e.g., StickyHeader/Footer wiring, metadata loaders) here.
- `src/components` – Client-facing UI widgets. Co-locate component-specific styles or helpers in subfolders when the surface grows (`ai-edit`, `image-editing-tab`, etc.). Components that require hooks must include `'use client'`.
- `src/lib` – Server utilities and integrations (auth, analytics, workflows, Pub/Sub, manifest helpers). Keep React-free modules here; expose pure or server-side functions only.
- `src/utils` – Pure helper functions (date formatting, enum normalization, storage utilities). Unit tests belong next to the implementation (`*.test.ts`).
- `src/db` – Drizzle ORM schema, services, and scripting entry points (`migrate.ts`, `reset.ts`, `seed.ts`). Services should remain framework-agnostic and covered by Jest.
- `src/messages` – `next-intl` translation bundles. Maintain parity across locales and regenerate typed keys (`npm run i18n:keys`) after changes.
- `src/types` – Reusable TypeScript interfaces. `translation-keys.d.ts` is generated—do not edit manually.
- `src/config` & `src/constants` – Keep configuration (locales, feature toggles) and static values separate from runtime logic.

## React & Styling Patterns

- Use functional components and hooks exclusively; no class components.
- Tailwind CSS (with DaisyUI) powers styling. Favor composition via utility classes and avoid inline styles unless dynamic values are required.
- Keep images served with `next/image` where possible. Remote sources must be allowlisted in `next.config.ts`.
- Re-export commonly used UI primitives through index files to simplify imports when appropriate.

## Internationalization

- Access translations with `useTranslations`/`getTranslations`. Translation namespaces mirror file names inside `src/messages/<locale>`.
- When adding strings, update **all** locale files and regenerate `TranslationKey` (`npm run i18n:keys`). Missing keys surface in CI via `npm run i18n:parity` and through anonymous Playwright smoke tests.
- Middleware (`src/middleware.ts`) coordinates Clerk auth and locale routing. Preserve the `/offline` bypass when modifying middleware behavior.

## Testing Expectations

- Co-locate Jest unit tests with implementation files using the `.test.ts`/`.test.tsx` suffix.
- UI behavior should be covered with React Testing Library or Playwright depending on scope. Complex server utilities (e.g., analytics, Pub/Sub) require deterministic tests with mocked dependencies.
- Keep Playwright fixtures in `tests/playwright`. Authenticated flows rely on the shared storage state defined in `playwright.config.ts`.

## Data & Services

- When extending Drizzle models, update `src/db/schema/index.ts` exports and generate migrations (`npm run db:generate`). Services in `src/db/services` should expose typed helpers for app components and maintain parity with the database schema.
- Cross-service integrations (workflow API, notification engine, Google Cloud) live under `src/lib`. Encapsulate external HTTP/SDK calls there to keep components declarative.

## Performance & Accessibility

- Prefer lazy data loading via Next.js streaming where available. Memoize expensive client computations with React hooks (`useMemo`, `useCallback`).
- Uphold accessibility: provide descriptive alt text, ARIA attributes, and keyboard-friendly interactions. DaisyUI themes already offer baseline semantics—extend responsibly.
