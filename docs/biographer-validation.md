# Biographer implementation validation

Updated 2026-11-17. Both phases are implemented in development branches. Production schema migration is applied; public production activation remains off. Local single-author testing is configured.

## Branches and entry points

- `codex/biographer-phase-1`: authenticated single-author interviews, local recording recovery, review and generation handoff.
- `codex/biographer-phase-2`: builds on Phase 1 with named contributors, fragment-only invite/return links, scoped guest interviews, People & Memories and exact-revision review.
- Customer entry: `/{locale}/biographer`. Admin operations: `/biographer` in the Admin service.
- See [the implementation and rollout guide](biographer.md) for contracts and configuration.

## Checks performed

- Web App: full Jest suite (189 suites / 1,489 tests passed; 2 suites / 13 tests skipped), strict TypeScript, full ESLint and five-locale parity.
- SGW: full mocked suite, strict TypeScript, ESLint and build. Localhost socket tests use a mocked Google client; no paid provider request is part of this suite.
- Admin: full Jest suite (43 suites / 411 tests passed; 1 suite / 13 tests skipped), TypeScript and ESLint.
- Web App production compilation and static page generation passed using `next build --webpack`. The default Turbopack build cannot resolve the shared external node_modules symlink in these isolated worktrees. Standalone tracing warns about external shared dependencies; this is not a verified deployable worktree image. Use a normal local npm install in CI/container builds.
- An independent Astra review found and guided fixes for pause/checkpoint races, failed local write recovery, cross-tab contributor binding, stale proposal/review revisions, private image telemetry and closed-participant transcription admission. Focused regression tests cover those corrections.

### Migration recovery branch checks (2026-11-17)

- Merged WebApp master `f6508e3e` into the existing feature working directory. Resolved the unpublished migration-number collision while preserving deployed master's `0049` SQL and snapshot exactly.
- Full merged WebApp Jest suite: 211 suites / 1,625 tests passed; 2 suites / 13 tests skipped. The new master Step 5 Ads tests now mock the story-scoped pricing URL introduced by Biographer.
- Full ESLint, strict TypeScript, Prettier and five-locale parity passed. Environment parity reports missing local runtime settings because the feature worktree intentionally has no production environment file; it is not a configured end-to-end test server.
- The guarded read-only production preflight passed, including the applied Ads baseline and only `0050_biographer_complete` pending. No apply command was run.
- An embedded PostgreSQL 17.5 rehearsal executed the exact generated SQL and verified atomic rollback, ten tables, 17 validated foreign keys, unchanged synthetic existing story and owner/contributor uniqueness behavior. This does not establish Cloud SQL concurrent-lock or runtime-role behavior.
- An independent Astra review checked the recovery code and repeated the offline rehearsal; it required an explicit search path, deployment/migration freeze and runtime-role grant verification. The code/runbook include those corrections.

## Not validated or activated

After the earlier preparation checks above, the user explicitly authorized migration and local setup. See the [execution record](biographer-migration-applied-2026-11-17.md): `0050` committed and separate postflight passed. The first attempt rolled back because the verifier mishandled a digit-containing column and shortened constraint names; the corrected exact postflight passed locally before retry. Full merged tests now pass 1,627 tests. Local runtime configuration and Google ADC are in place; the WebApp, SGW API and avatar gateway respond successfully. A bounded synthetic Gemini 3.8 Live avatar handshake succeeded. No production application deployment, public activation or shared-database fixture suite was run.

The [local testing guide](biographer-local-testing.md) covers interviews and proposals without an external research dependency. Local full-book orchestration remains separate. Authenticated browser conversation, real recording recovery, dialect/media quality and full narrative acceptance still require manual verification. The PostgreSQL 17.5 embedded rehearsal verifies SQL, exact postflight, transactional rollback, existing synthetic-story preservation and owner/contributor constraints without another Cloud SQL database.

Before launch, use free local PostgreSQL with synthetic data for concurrent claim/lease/upload tests. A dedicated manual smoke test on the shared database is a separate controlled step after migration authorization; do not run fixtures or destructive suites there. Verify private GCS IAM, exact Gemini 3.8 Live EU/avatar access, mobile streaming playback, wake-lock lifecycle, dialect quality, actual modality costs and a full approximately 20,000-word ebook/audio/print journey.

Paid-book source deletion currently fails closed and directs the owner to support. Automatic cancellation and credit compensation for source deletion is unfinished; do not enable public rollout until that policy and implementation are completed. Orphan cleanup is implemented as a separate dry-run-by-default command, but has not been executed against a real bucket/database.

## Memory-based proposals update

The active WebApp and SGW feature branch is `codex/biographer-memory-proposals`. New proposals require saved memories and creator preferences, with optional story setting and no search API dependency. New external-evidence arrays are empty; approved older snapshots are preserved. UI setting guidance is updated in all five locales. The launcher invokes `npm run dev` for WebApp and SGW and `npm run dev:biographer-live` for the gateway. No migration or production deployment was needed for this update. All 70 SGW suites / 447 tests and all 211 WebApp suites / 1,627 tests passed, with the existing 13 WebApp skips; locale parity passed. Full local paid-book dispatch remains unconfigured.
