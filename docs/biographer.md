# AI Biographer — Phases 1 and 2

Implementation branch: `codex/biographer-phase-2` builds on Phase 1. Contributor invitations are implemented but remain disabled until the separate collaboration flag is enabled after rollout checks.

The current working branch is `codex/biographer-production-migration-recovery`. Its consolidated `0050` is applied to the existing shared database after explicit authorization. Use the [local testing guide](biographer-local-testing.md); do not rerun the superseded branch migrations. Public production activation remains off.

## Configuration and rollout

Keep public production `BIOGRAPHER_ENABLED=false`. See [database recovery and testing](biographer-database-rollout.md): the recovery branch incorporates master and supersedes the unapplied original `0049–0056` feature artifacts with `0050_biographer_complete`, now applied after explicit authorization. Never run integration fixtures or destructive tests against the shared development/production database. The authorized manual local smoke test uses real shared data and needs the runbook's precautions; feature activation is local only.

Set `BIOGRAPHER_LIVE_URL` to the dedicated SGW gateway WSS URL, `BIOGRAPHER_INTERNAL_API_KEY` to the identical independent callback secret in both services, and `BIOGRAPHER_ALLOWED_ORIGINS` to exact comma-separated browser origins. No Google credentials or internal secret are sent to clients. Admin uses Google OIDC via `BIOGRAPHER_INTERNAL_AUDIENCE` and `BIOGRAPHER_ADMIN_SERVICE_ACCOUNTS`.

`BIOGRAPHER_STORAGE_BUCKET` must be a private GCS bucket with uniform bucket-level access and public access prevention. Cache-Control private does not establish bucket privacy: verify actual IAM before activation. This bucket is separate from public generated-content assets. Source-media replay always goes through owner-authorized API endpoints. Do not configure this as a bucket that grants allUsers access.

## Contracts

Owner API prefix: `/api/biographer/projects`. GET lists owner projects; POST requires locale and consent:true. GET/PATCH `/:projectId` reads/updates project context. POST `/turns` saves idempotent text responses; POST `/interview` saves before invoking SGW's adaptive next-question service. PATCH `/turns/:turnId` corrects a transcript or changes inclusion while preserving originalText. Changes invalidate the current proposal.

POST `/segments` accepts stable segment id, turnId, sequence, MIME, SHA-256, durationMs and base64 bytes. GCS conditional creation precedes metadata insertion; durable acknowledgment follows both. Retry reuses identifiers and verifies hash. The server does not claim an atomic transaction across GCS and PostgreSQL: deterministic object paths allow retry after partial failure. Reconcile orphaned objects before introducing deletion/retention automation. Uploaded recordings are private raw sources; audio can be saved before a transcript/turn is available.

POST `/sessions` issues a 60-second single-use ticket. Internal `/api/biographer/internal/admit` atomically consumes the ticket and reserves 60 seconds. Heartbeats every 20 seconds account elapsed time and reserve the next interval. Admission is project-serialized; crashed sessions conservatively consume their last reservation. Never extend a session after lease expiry. Stop/failure release reconciles unused allowance.

`/internal/checkpoint` stores provisional/final transcript events idempotently and protects user-corrected transcript versions. `/internal/lease` heartbeats/releases quota. Callbacks require the independent API key. Transcript observations do not mean audio is safely archived; the browser sends original audio through the segment API.

POST `/proposal` calls SGW with original included source turns, owner/project identifiers and context. POST `/approve` checks exact source revision and creates an author-owned private draft, captures an approved snapshot and returns storyId. SGW recognizes `[MYTHORIA_BIOGRAPHER_V1]` and retrieves `/api/biographer/internal/snapshot`. Normal generation pricing resolves product profile from this durable story association, not from a browser-supplied flag.

Admin command API `/api/internal/biographer/command` exposes listProjects, getProject, extendAllowance(additionalSeconds) and setLiveEnabled. It never returns transcripts. Mutation request IDs are audited and checked for conflicting reuse.

## Remaining release validation

Run real isolated-database integration tests for admission contention, segment persistence failure and command idempotency; verify GCS privacy and gateway project entitlement. Confirm same question/answer survives reconnect and browser termination. Test 20,000-word output, persona/source preservation and independent paid-item compensation. Do not activate before operator pricing is configured. Proposals use memories and optional author-provided setting; no external search subscription is required.

## Source revisions and recovery

Each approved revision is stored in `biographer_book_versions` against its own story ID. A later edited proposal creates a different story and never changes an earlier paid snapshot. Source edits, photo captions and exclusions increment the project revision and invalidate the current proposal. Photo PATCH is `/projects/:projectId/photos/:assetId` with `caption` and/or `included`; approved reference images include only currently selected photos.

Saved audio creates a pending user response before its first acknowledged segment. An explicit `POST /projects/:projectId/turns/:turnId/transcribe` recovers an empty unedited transcript from ordered saved PCM via SGW. It does not inject archival audio into a live conversation; a failed job preserves the recording and a concurrent user correction or new segment aborts the commit.

Owner deletion is retryable and disables access before purging the private bucket prefix. The implementation refuses deletion when any related story has a paid request, requiring support intervention: cancellation and refund integration for that case is still a launch blocker. Source objects uploaded when a database commit fails may require reconciliation. Run `npm run biographer:cleanup-orphans` to preview orphan candidates; `npm run biographer:cleanup-orphans -- --apply` deletes only objects older than 24 hours after checking asset and segment references under the project lock. Each delete uses a generation precondition. Do not run against the shared production bucket during tests.

## Phase 2 collaboration

`BIOGRAPHER_COLLABORATION_ENABLED` defaults off. Set `BIOGRAPHER_PUBLIC_URL` to the trusted HTTPS application origin before use. Invitation and return secrets are URL fragments and are exchanged only via `POST /api/biographer/access`; contributor requests require a scoped HttpOnly cookie and project/participant intent headers. An invite is claimed once, while its separate return capability can be rotated; rotation/revocation terminates existing participant sessions. The owner can review source turns and assets, exclude material, and mark exact contribution revisions reviewed. The core project model remains authoritative.

Do not activate Phase 2 until migrations 0054–0056 are reviewed and applied in a controlled rollout. Verify real isolated-database invitation races, quota contention, signed admission and revocation, mobile playback, owner review and contributor privacy. The live gateway remains restricted to scoped participant admission.
