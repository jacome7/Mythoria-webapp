# Mythoria Web App – Agent Guide

## Purpose & Scope

This document is the single source of truth for agents working on the Mythoria web application. It describes how to set up the project, which quality checks must run before submitting work, and how to keep configuration and documentation in sync with the codebase.

## Technology Snapshot

- **Framework**: Next.js 15 (App Router, standalone output)
- **Language**: TypeScript 5 with strict compiler settings
- **Runtime**: Node.js 22+ (enforced through `package.json` engines and Dockerfile)
- **UI**: React 19, Tailwind CSS + DaisyUI, Next PWA integration
- **Internationalization**: `next-intl` with locale-specific route segments and JSON message bundles
- **Data Layer**: PostgreSQL via Drizzle ORM (schema in `src/db/schema`, SQL artifacts under `drizzle/`)
- **Testing & QA**: ESLint, TypeScript, Jest, Playwright, i18n parity scripts, Prettier

## Repository Layout Highlights

- `src/app` – App Router entry points (server components by default, locale-prefixed routes, offline fallbacks)
- `src/components` – Reusable UI building blocks (`'use client'` when interactivity is required)
- `src/lib` – Server-side utilities (authentication, analytics, workflow clients, pub/sub helpers, manifest helpers)
- `src/utils` – Pure utility helpers and co-located unit tests
- `src/db` – Drizzle schema, services, and database scripts (migrate/reset/seed)
- `src/messages` – Locale-specific translation bundles (JSON namespaces per feature)
- `src/types` – Shared TypeScript types and the auto-generated `translation-keys.d.ts`
- `scripts` – Tooling for env validation, i18n maintenance, and deployment support
- `docs` – High-level product and architecture documentation

## Local Environment Setup

1. Use Node.js 22 or newer (`nvm use 22` if needed) and install dependencies with `npm install`.
2. Copy environment variables into `.env.local` (see **Environment Variables** below) and keep them aligned with `env.manifest.ts`.
3. Validate the configuration by running `npm run check:env`; resolve all reported mismatches.
4. Start the development server with `npm run dev` (Turbopack enabled). The app runs at `http://localhost:3000` by default.
5. When adding new dependencies, prefer `npm install` (package-lock is committed).

## Environment Variables

- `env.manifest.ts` is the canonical manifest that describes every variable, its scopes (dev/build/runtime/public), and whether it is a secret. Update this file whenever environment requirements change.
- Sync `.env.local`, deployment manifests (e.g., `cloudbuild.yaml`), and Docker build args with the manifest. Use `npm run check:env` after every change to confirm parity.
- `NEXT_PUBLIC_SUPPORTED_LOCALES` controls the locales exposed by the router. Defaults come from `src/config/locales.ts` but should remain consistent across runtime and build environments.
- Keep secrets out of the repository. Non-public values belong in Secret Manager or your local `.env.local` only.

## Database Workflow (Drizzle ORM)

- Schema definitions live in `src/db/schema`. Update `schema/index.ts` to re-export new tables/enums so Drizzle migrations and services can import them.
- Generate SQL migrations with `npm run db:generate` and commit the resulting files under `drizzle/`.
- Apply migrations locally with `npm run db:migrate` (uses `.env.local` credentials) or `npm run db:push` for schema synchronization.
- `npm run db:reset` drops application tables and enums; `npm run db:setup` performs a reset followed by a push. Use cautiously.
- `npm run db:studio` launches the Drizzle Studio inspector. `npm run db:seed` is currently a no-op placeholder; keep it updated if a real seed workflow is introduced.
- Services under `src/db/services` should be covered by Jest tests co-located in the same directory.

## Development & Quality Checklist

Run these commands after making code changes and before committing or opening a PR:

- `npm run lint` – ESLint (flat config via `eslint.config.mjs`)
- `npm run typecheck` – TypeScript `tsc --noEmit`
- `npm run test` – Jest unit tests (includes React Testing Library and server-side utilities)
- `npm run format` – Prettier validation (run this after every code change; use `npm run format:fix` if issues pop up)
- `npm run i18n:parity` – Ensures locale bundles remain aligned with `en-US`
- `npm run i18n:keys` – Regenerates `src/types/translation-keys.d.ts` after modifying source translations
- `npm run test:e2e` – Playwright tests (requires `npm run dev` running separately; auth state auto-refreshes unless `SKIP_AUTH_SETUP=1`)
- `npm run test:e2e:anon` – Anonymous Playwright smoke suite for missing translation detection (sets `SKIP_AUTH_SETUP=1` automatically)
- `npm run check:env` – Validate environment parity when env-related files change

Only run the localization, env, or database commands when you touch the corresponding areas, but ensure CI-critical checks (`lint`, `typecheck`, `test`) are green for every change set.

## Localization Workflow

- `src/messages/en-US` is the source-of-truth locale. Mirror file names across every locale directory. HTML fragments (e.g., legal pages) also require parity.
- Use `useTranslations`/`getTranslations` from `next-intl` with typed keys from `TranslationKey` to avoid runtime typos.
- After editing translations:
  - Run `npm run i18n:keys` to refresh the generated union type.
  - Run `npm run i18n:parity` to detect missing or extra keys across locales.
  - Optionally prune unused keys with `npm run i18n:prune:pt-PT:common` (or adjust the locale/namespace parameters as needed).
- Keep the allowlist in `src/messages/i18n-keep.json` updated if certain keys must never be pruned.

## Playwright & PWA Notes

- Playwright stores auth state in `tests/playwright/.auth/user.json`. Force regeneration with `REFRESH_AUTH=1` if credentials expire. Anonymous suites bypass auth state by setting `SKIP_AUTH_SETUP=1`.
- The application ships with a PWA offline fallback located at `/offline`. Middleware bypasses locale redirects for that route—preserve this behavior when adding new middleware logic.

## Deployment

- Production builds use `npm run build` (standalone output) followed by `npm run start` for local verification.
- Google Cloud Run deployment is handled via `npm run deploy:production` (Cloud Build). Update Docker build args and environment substitutions alongside manifest changes.

## PR & Commit Guidelines

- Follow Conventional Commit messages (e.g., `feat: add X`, `fix: handle Y`).
- Include updated tests and documentation for any user-facing or behavioral change.
- Keep the working tree clean: run the commands above, stage intentional changes only, and ensure `git status` is clean before finishing.
