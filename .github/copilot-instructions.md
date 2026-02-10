# Copilot Instructions (Mythoria WebApp)

## Big picture

- Next.js 15 App Router + React 19, strict TS; customer-facing app wired to SGW, Notification Engine, and Admin services via REST + Pub/Sub. See [README.md](README.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Locale-first routing: every page lives under `src/app/[locale]` (en-US, pt-PT, es-ES, fr-FR, de-DE). `/offline` is the only non-locale route and must keep its middleware bypass.
- Server components by default; add `'use client'` only when hooks/browser APIs are required.

## Key conventions

- Imports use `@/` alias (tsconfig). Avoid deep relative paths.
- Middleware in [src/middleware.ts](src/middleware.ts) chains Clerk + next-intl. Preserve locale routing and `/offline` bypass behavior.
- Data access lives in `src/db/services`, not in components. Drizzle schema is in `src/db/schema`, and new tables/enums must be re-exported in `src/db/schema/index.ts`.
- Guard build-time execution for DB/network work with `process.env.NEXT_PHASE` (e.g., sitemap/static routes).

## Integrations & data flow

- SGW calls go through `src/lib/sgw-client.ts` (`sgwFetch`, `sgwUrl`, `sgwHeaders`).
- Pub/Sub topics live in `src/lib/pubsub.ts`.
- Auth + ownership checks: Clerk middleware and `src/lib/authorization.ts`.
- Story wizard state is server-side in `src/lib/story-session.ts` (e.g., `getCurrentStoryId()`, `setStep1Data()`).

## i18n specifics

- Source of truth is `src/messages/en-US`; mirror file structure across locales.
- Use `useTranslations`/`getTranslations` only; no hardcoded user strings.
- After changes: `npm run i18n:keys` then `npm run i18n:parity`. Update `src/messages/i18n-keep.json` if pruning.

## UI & styling

- Tailwind + DaisyUI. Prefer utilities; use CSS Modules for component-specific styles. Avoid adding custom classes to globals unless truly global.
- Use `next/image` everywhere; remote domains must be allowlisted in `next.config.ts`.
- Audio playback is centralized in `src/components/AudioPlayer` (`useAudioPlayer`, `AudioChapterList`).

## Env & workflows

- Env is manifest-driven: `env.manifest.ts` is canonical. Run `npm run check:env` after any env change.
- Dev: `npm run dev`. Pre-commit checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format`.
- DB: `npm run db:generate` then `npm run db:migrate` (or `db:push` for dev-only sync).
- E2E: `npm run test:e2e` (auth state in `tests/playwright/.auth/user.json`, refresh with `REFRESH_AUTH=1`).

## Voice & locale nuance

- Tone is clear and warm; emojis are rare. In pt-PT, address users as "voce" (not "tu").
