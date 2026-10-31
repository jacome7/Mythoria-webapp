# Mythoria Web App – Agent Guide

## Purpose & Scope

This document is the single source of truth for agents working on the Mythoria web application. It describes how to set up the project, which quality checks must run before submitting work, and how to keep configuration and documentation in sync with the codebase.

## Technology Snapshot

- **Framework**: Next.js 16 (App Router, standalone output)
- **Language**: TypeScript 6 with strict compiler settings
- **Runtime**: Node.js 24.18.1 LTS (enforced through `package.json` engines, `.nvmrc`, `.node-version`, `.npmrc`, Dockerfile, and Cloud Build)
- **UI**: React 19, Tailwind CSS + DaisyUI, Next PWA integration
- **Internationalization**: `next-intl` with locale-specific route segments and JSON message bundles
- **Data Layer**: PostgreSQL via Drizzle ORM (schema in `src/db/schema`, SQL artifacts under `drizzle/`)
- **Testing & QA**: ESLint, TypeScript, Jest, Playwright, i18n parity scripts, Prettier

### Styling Best Practices

Following Next.js recommendations for CSS management:

- **Prefer Tailwind utility classes** for most styling needs (buttons, layouts, spacing, colors)
- **Use CSS Modules** (`*.module.css`) for component-specific custom styles when Tailwind utilities aren't sufficient
- **Avoid custom classes in `globals.css`** when working with client components and animations—CSS load order and specificity conflicts with Tailwind/DaisyUI can cause styles to not apply consistently
- **Use inline React styles** (`style` prop with `CSSProperties`) for dynamic animations and critical styles that must be guaranteed to apply (e.g., `ScrollFadeIn` component uses inline styles to avoid CSS loading issues)
- **Reserve `globals.css`** for truly global base styles (like font families) and theme customizations only

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

1. Use Node.js 24.18.1 LTS (`nvm use` reads `.nvmrc`) and install dependencies with `npm install`.
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
- Paid audiobook and self-print starts must go through `src/lib/product-generation.ts`; it owns the durable request, idempotent credit ledger keys, queue-confirmed requested event, and compensation contract.

IMPORTANT: We currently only have ONE database instance, used on both development and production. Any changes to the development also affects productions. Alert user if any migration can delete or drop any data or make the production environment with errors.

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
- During dependency or Next.js version upgrades, verify server-only packages that use gRPC (for example `@google-cloud/pubsub`, `google-gax`, `@grpc/grpc-js`) stay externalized via `serverExternalPackages` in `next.config.ts`. If not, workflow-triggering Pub/Sub publishes can fail at runtime with 500 errors such as `Failed to start ... workflow`.

## PR & Commit Guidelines

- Follow Conventional Commit messages (e.g., `feat: add X`, `fix: handle Y`).
- Include updated tests and documentation for any user-facing or behavioral change.
- Keep the working tree clean: run the commands above, stage intentional changes only, and ensure `git status` is clean before finishing.

## Referral platform v1 (2026-09-09)

See the [referral implementation and operations guide](docs/referrals.md) for this service's responsibilities, updated contracts, configuration, schema ownership and validation. The feature is implemented locally; production migration, deployment and pilot activation require their separate rollout checkpoints.

## Referral welcome email (2026-09-13)

The expanded owner welcome is implemented in `src/lib/referrals/invitation.ts` and the existing outbox drain. Keep initial invitation enqueue transactional and preserve recipient/delivery identity. Do not gate sending on live commission flags or first sign-in. See `docs/referrals.md` for retry/cancellation and isolated welcome integration test requirements.

## Story templates and optional guidance

See [the local contract](docs/story-templates.md) and [cross-service runbook](../docs/STORY_TEMPLATES.md). Both service flags default off. Keep draft/structure retries idempotent, private job polling owner-scoped, and existing pending jobs recoverable during rollback. SGW workflows migrations 0008 and 0009 were applied with authorization on 2026-09-19 after backup; see the [operation record](../docs/STORY_TEMPLATES_LOCAL_TEST_2026-09-19.md). Template entry and new guided requests also require the author’s `experimentalFeaturesEnabled` opt-in; preserve stored journeys and accepted job recovery when either gate is off. WebApp core migration 0044 was applied with authorization on 2026-10-27 after full backup; all existing authors were verified opted out. See the [opt-in migration record](../docs/EXPERIMENTAL_FEATURES_MIGRATION_2026-10-27.md). Future migrations need explicit authorization; never run integration fixtures against the production-shared development database.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Customer research surveys (2026-10-28)

See the [cross-service contract](../docs/SURVEYS.md). Survey definitions are code (`src/surveys/definitions`, contract `src/lib/surveys/definition-schema.ts`) published immutably with `npm run surveys:validate` / `npm run surveys:publish` (dry run; `-- --apply` writes). Changing wording, options or branching of a published version requires a new version file. Respondents answer via opaque HMAC links (`src/lib/surveys/tokens.ts`, `SURVEY_LINK_SECRET`) without login; reward redemption requires the invited author's Clerk session and goes through `startProductGeneration` with `funding: { type: 'survey_reward' }` (no credit debit, `funding_source = 'survey_reward'` — never count as paid). Migration `0045_survey_foundation` needs explicit authorization before it is applied.
