# Database Layer – Agent Guide

## Schema Maintenance

- Domain schemas live in `src/db/schema`. Group related tables/enums by feature (stories, payments, credits, etc.) and re-export them from `schema/index.ts`.
- Generate SQL migrations with `npm run db:generate` after changing the schema. Commit the generated files under `drizzle/` to keep CI and deployments reproducible.
- Keep enum or helper definitions (`enums.ts`) aligned with any TypeScript counterparts in `src/types`.

## Runtime Access

- `src/db/index.ts` initializes Drizzle lazily using the shared pool from `@/lib/database-config`. Reuse this entry point; do not create ad-hoc `Pool` instances in feature code.
- Respect the build-time guard (`NEXT_PHASE`) so static generation does not hit the database. When adding new runtime modules, check `process.env.NEXT_PHASE` and provide safe fallbacks similar to the existing pattern.

## Services & Testing

- Business logic that reads/writes data belongs in `src/db/services`. Expose small, typed functions that hide raw SQL details from the rest of the app.
- Co-locate Jest specs (see `*.test.ts`) for every service to ensure queries remain stable as the schema evolves.
- Prefer Drizzle query helpers over raw SQL. If raw SQL is unavoidable, encapsulate it in a service and document the reasons in-code.

## Tooling Scripts

- `migrate.ts`, `reset.ts`, and `seed.ts` are entry points for CLI workflows invoked via npm scripts. Keep them idempotent and environment-aware (they load `.env.local`).
- `db:seed` is currently a no-op placeholder. Update both the script and this documentation if a real seed routine is introduced.
- `db:setup` (reset + push) is destructive—never run it in shared environments without confirmation.
