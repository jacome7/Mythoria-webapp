# Biographer implementation validation

Updated 2026-11-17. Both phases are implemented in development branches; activation remains off.

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

## Not validated or activated

No migration, deployment, feature activation or shared/production database fixture was run. Worktrees intentionally do not inherit production environment files; environment checks report missing runtime configuration. Authenticated Playwright coverage is authored but has not been run against an isolated, configured server.

Before launch, provision an isolated database, review/apply migrations there and run real concurrent claim/lease/upload tests. Verify private GCS IAM, licensed research entitlement, exact Gemini 3.8 Live EU/avatar access, mobile streaming playback, wake-lock lifecycle, dialect quality, actual modality costs and a full approximately 20,000-word ebook/audio/print journey.

Paid-book source deletion currently fails closed and directs the owner to support. Automatic cancellation and credit compensation for source deletion is unfinished; do not enable public rollout until that policy and implementation are completed. Orphan cleanup is implemented as a separate dry-run-by-default command, but has not been executed against a real bucket/database.
