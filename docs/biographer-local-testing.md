# Running the prepared local Biographer

Updated 2026-11-17. The production schema migration is applied; the production application was not deployed or enabled. No additional Cloud SQL database or instance was created.

## What is running

| Process            | Address                                | Purpose                                          |
| ------------------ | -------------------------------------- | ------------------------------------------------ |
| WebApp             | http://localhost:3000/en-US/biographer | Customer interview and memory review             |
| SGW API            | http://localhost:8080/health           | Interview/proposal and generation-step APIs      |
| SGW avatar gateway | ws://localhost:8082/live               | Gemini 3.8 Live connection and durable callbacks |

Admin and Notification Engine are not started. Admin is unnecessary for the customer interview. Notification Engine is needed only when testing notification delivery; it is not required to speak with the avatar. The local environment retains existing notification configuration for later explicit testing.

Both feature worktrees have their own `npm ci` installation, rather than dependency symlinks. Their ignored `.env.local` files are private, configured for the existing shared database, local API URLs, matching internal/API secrets and the private recording bucket. Collaboration is initially disabled. Google ADC authentication was repeated with the correct account and configured with the existing Mythoria quota project. These credentials refresh normally but may eventually need reauthentication.

The WebApp binds to `localhost`; SGW's existing listeners bind all interfaces. Gateway origins and API authentication remain enforced. Use the canonical `localhost` URLs above, rather than `127.0.0.1`, to keep Next's internal locale rewrite aligned with its listener.

## Start, inspect and stop

Run from the actual feature working directory:

```sh
cd /Users/andreaperavieira/Developer/Mythoria/biographer-phase-1/mythoria-webapp
npm run biographer:local -- status
```

If stopped, use `npm run biographer:local -- start`. To stop all three local processes, use `npm run biographer:local -- stop`. After editing local environment files, stop and start again when no interview is active. The launcher does not migrate, seed, reset, trigger a book workflow or start Admin/notifications. It refuses occupied ports belonging to other processes and checks matching local settings. Each child receives the validated local environment before fixed port/development overrides.

Private logs and process records are in `.biographer-local/` inside the WebApp. The directory and `.env.local` are ignored by Git. Do not share raw interview logs or credentials. Original service checkout environment files were not modified.

## First manual test

1. Open the WebApp link and sign in with your dedicated test author. You are using the real shared database; test entries are persistent data.
2. Create a project and consent. Start with a short text answer, refresh and check it is retained.
3. Start a live interview and allow microphone access. Speak briefly, pause, resume and confirm transcript/audio status. Refresh only after the interface confirms the archival queue is saved.
4. Add a non-sensitive test photo, check the caption/review flow, and verify playback of your own recording. Check reconnection and local pending-upload recovery without clearing browser storage.
5. Keep the initial test limited to interviewing and source review. The remaining stages below need separate configuration.

No author/project/turn fixtures were inserted by setup. Provider testing used a synthetic connection without sending memories, and the PDF test used synthetic local HTML.

## Remaining readiness limits

**Research and proposals:** no Brave API key or matching existing project secret was found. `BIOGRAPHER_RESEARCH_ENTITLEMENT_CONFIRMED=false` remains in the SGW local environment. Research-backed proposals fail closed. Once commercial retrieval/retention/downstream-use entitlement is established, put `BRAVE_SEARCH_API_KEY` in the SGW worktree's private `.env.local`, explicitly confirm entitlement, and restart SGW. Do not send the key through chat or set the entitlement flag without evidence.

**Full local book generation:** the current Google Cloud Workflow targets the deployed SGW URL. Starting generation from localhost does not make that workflow local, and can debit real credits/write shared requests/publish production work. A complete local orchestration path has not been implemented. Do not launch a paid generation expecting it to execute the new local Biographer code. The missing local orchestration is a separate engineering task; no cloud workflow/deployment was modified during this setup.

**Collaboration:** `BIOGRAPHER_COLLABORATION_ENABLED=false`. First finish the single-author test. Later collaboration testing needs a reachable trusted WebApp URL for invitees, matching allowed origins, and dedicated test participants.

**Public launch:** paid-book source deletion still needs cancellation/refund integration, and full narrative/ebook/audio/print/mobile acceptance remains outstanding. See [validation](biographer-validation.md).

## Checks actually performed

- Existing production homepage and `/api/health`: HTTP 200; database connected.
- Local Biographer page, WebApp `/api/health`, SGW `/health`, avatar root: HTTP 200; both application databases reachable from SGW.
- Corrected migration's exact postflight checks passed inside embedded PostgreSQL 17.5 rehearsal and against committed production state.
- Google ADC can read Gemini 3.8 Live metadata and has object create/get/delete permissions on the new private bucket.
- Two brief synthetic Gemini 3.8 Live EU connection checks used avatar `Ben`, voice `Puck`; the final check received Google's explicit setup acknowledgement and closed immediately (approximately four seconds). This verifies provider setup, not a complete authenticated browser conversation or dialect/media quality.
- Gateway rejected a disallowed origin and unauthenticated text without creating a project/provider session.
- Matching Puppeteer Chrome installed; a synthetic PDF rendered locally. Ghostscript initialization succeeded; existing ICC profiles are present.
- WebApp: 211 suites / 1,627 tests passed, 13 tests skipped; lint/typecheck passed. SGW typecheck and environment validation passed. WebApp environment parity reports the existing `STORY_TEMPLATES_ENABLED` manifest discrepancy only.

Private recording bucket: `mythoria-biographer-private-oceanic-beach-460916-n5`, Europe West 9, uniform access and public access prevention enforced; no public IAM binding. Existing public bucket policies were not changed. Actual model/storage/backup usage can incur charges; no new paid database was provisioned.
