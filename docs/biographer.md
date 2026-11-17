# AI Biographer — Phase 1

Implementation branch: `codex/biographer-phase-1`. Phase 2 contributor invitations are not exposed by this release. Core schema is participant-ready but only the authenticated project owner has access.

## Configuration and rollout

Keep `BIOGRAPHER_ENABLED=false` until the generated additive migrations are reviewed and applied through the normal release process. Never use the shared development/production database for tests. Migrations in this branch are generated artifacts and have not been applied.

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

Run real isolated-database integration tests for admission contention, segment persistence failure and command idempotency; verify GCS privacy and gateway project entitlement. Confirm same question/answer survives reconnect and browser termination. Test 20,000-word output, persona/source preservation and independent paid-item compensation. Do not activate before operator pricing and research entitlement are configured.

## Source revisions and recovery

Each approved revision is stored in `biographer_book_versions` against its own story ID. A later edited proposal creates a different story and never changes an earlier paid snapshot. Source edits, photo captions and exclusions increment the project revision and invalidate the current proposal. Photo PATCH is `/projects/:projectId/photos/:assetId` with `caption` and/or `included`; approved reference images include only currently selected photos.

Saved audio creates a pending user response before its first acknowledged segment. An explicit `POST /projects/:projectId/turns/:turnId/transcribe` recovers an empty unedited transcript from ordered saved PCM via SGW. It does not inject archival audio into a live conversation; a failed job preserves the recording and a concurrent user correction or new segment aborts the commit.

Owner deletion is retryable and disables access before purging the private bucket prefix. The implementation refuses deletion when any related story has a paid request, requiring support intervention: cancellation and refund integration for that case is still a launch blocker. Source objects uploaded when a database commit fails may require reconciliation. A time-bounded orphan cleanup process and its safety checks must be implemented before activation.
