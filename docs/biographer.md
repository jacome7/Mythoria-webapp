# Story Whisperer

Story Whisperer opens from Step 2 of Tell Your Story. A single signed-in author can type, dictate an editable answer, have a live voice conversation with Gemini 3.8 Live, and attach photos. The wizard creates an ordinary story draft, with the regular character review, outline editor, persona selection and book pricing.

WebApp owns the interview, evidence, draft association, usage ledger and private media lifecycle. SGW assesses characters, setting and plot and runs the low-latency voice gateway. The customer workflow is described in the [local testing guide](biographer-local-testing.md). The internal Biographer API names remain for compatibility with the gateway and staff tools. Contributor APIs retain their participant scopes.

The readiness endpoint returns HTTP 409 with code `READINESS_REVISION_CHANGED` when the same interview advances during an assessment. The chat can retry that response against the current revision. The interview response includes `readinessNeedsRefresh` when saved material needs a fresh assessment, so the chat can update progress automatically on open. Progress from the current rubric can remain visible while a later revision is assessed. Continuing requires a successful assessment of the current revision and rubric. Opening a saved interview with outdated readiness triggers a fresh assessment of its existing material, even when the saved revision matches. Prior rubric results and their ready notices expire together. Within the current rubric, readiness stores `firstReadyTurnId` at the first completed author reply that reaches readiness and retains it on later assessments. The WebApp requires the assessment endpoint to return the current rubric version. Deploy the SGW assessment endpoint before the WebApp. Replacing the interview invalidates the old project ID and requires a reload.

New interviews store the Step 2 intent and the localized opening question with its four reply buttons in the existing JSON context. Text and live voice receive that opening and the saved conversation. Readiness uses the current interview revision and rubric version. Outline input pairs each author's reply with the question it answers, preserving approximate dates and creative choices. Unanswered questions and unselected buttons contribute no evidence.

Authors can revise typed and dictated text before submitting it. Sent replies appear as read-only messages. Live Voice streams microphone frames to Gemini through the gateway and saves the transcription. The browser does not archive those frames for recovery or upload them to Cloud Storage. An interrupted answer can be completed from saved partial text or discarded. A confirmed speech turn with no saved text needs to be repeated. Dictation uses its own temporary local recording and retry path.

Stopping Live Voice or switching to text releases the microphone immediately. The browser sends WebSocket `cancel` and an owner-scoped session DELETE with the current capture ID. The gateway stops the provider, drains already completed checkpoints, discards unfinished user and assistant turns, and releases the lease. After an unexpected disconnect, the browser checks the owner-scoped session GET until `settled` or its deadline and refreshes the saved transcript. Partial text from an active capture or pending checkpoint is displayed as part of the conversation. Recovery actions are available for an actual interruption and historical incomplete replies.

The live client waits up to 20 seconds for the gateway to confirm the final transcript before the outline handoff. In local development, the browser console records `outline-preparation-confirmed` with the elapsed time or `outline-preparation-timeout` with the elapsed time and deadline. These events contain no story or account data.

A successful typed reply returns the committed interview in the POST response, including on replay of a saved answer ID. The client can display the next question immediately. The structured `Story Whisperer reply timings` log measures the initial database transaction, the assessment request and the final transaction in milliseconds. These timings exclude browser rendering and carry no interview content or account identifiers.

## Data and operations

Submit stable answer IDs, and acknowledge only durable saves. On confirmed restart invalidate outstanding capture, pending uploads and the old interview identity. Keep existing wizard assets and the author's usage ledger. A live session reserves time from a locked author account. The initial pilot allowance is 10,800 seconds; a staff extension or pause applies across interviews.

The `Story Whisperer reset timings` log records milliseconds for closing the project and its live sessions, finding unsubmitted copies, deleting private files, and deleting database records. It records the outcome and failed stage without draft, project, or author IDs. Reset returns success after all required file cleanup and database deletion complete.

The Story Whisperer segment endpoint returns HTTP 410 for new live recording uploads so older clients can clear their upload queue without interrupting the conversation. Browsers with the new client no longer upload old queued segments. Previously stored recovery audio remains available until the existing deletion rules apply on transcription, discard, or seven days after capture. Cloud Scheduler retries failed deletion. Expired local recovery bytes are cleared when the browser next runs the local expiry check. Photos have a separate lifecycle. A private recovery bucket with soft delete or versioning enabled may retain inaccessible object versions past application deletion; align the bucket's retention settings before promising physical erasure.

For each environment, configure a recurring Cloud Scheduler POST to `/api/biographer/internal/expire-audio` on the web app, using the existing scheduler identity in `ANALYTICS_SCHEDULER_SERVICE_ACCOUNT` and a Google OIDC token with the WebApp origin as audience. Run every minute. The endpoint processes up to 100 turns per call. Monitor errors and the `more` flag for a sustained backlog. For local isolated testing, the endpoint also accepts the gateway's private callback header. Never print credentials in logs. Verify bucket privacy, the retention schedule and deletion permissions together.

### Production activation on 2026-11-23

Story Whisperer was enabled for signed-in users on the public WebApp. The activation used these Cloud Run revisions:

| Service                   | Revision                                             |
| ------------------------- | ---------------------------------------------------- |
| Story Generation Workflow | `story-generation-workflow-whisperer-candidate-1123` |
| WebApp                    | `mythoria-webapp-guide-validation-1123`              |
| Voice gateway             | `biographer-live-00005-mcd`                          |

The end-to-end check reached Gemini through the voice gateway. The signed-in author's transcript survived a page reload. The wizard then reached character review in Step 3 and the outline in Step 4. A bell mentioned only in the voice conversation appeared in the outline. After activation, the public UI exposed the Guide and a direct WebSocket connection received admission through the gateway's canonical WebApp callback.

The rollout began with the gateway private, the WebApp feature disabled and the retention job paused. The recovery bucket `mythoria-biographer-private-oceanic-beach-460916-n5` had uniform bucket-level access and public access prevention enforced. At staging, the WebApp and SGW shared the default compute runtime identity with project Editor and Secret Accessor roles.

Cloud Scheduler job `story-whisperer-expire-audio` in `europe-west9` was enabled for production-wide retention after the rollout check. The first scheduled attempt succeeded at 08:30 UTC on 2026-11-23. Its configured schedule is a POST every minute (`Europe/Lisbon`) to `https://mythoria-webapp-x2qrlilyyq-od.a.run.app/api/biographer/internal/expire-audio`. The OIDC audience is the same service's HTTPS origin and the caller is `analytics-scheduler@oceanic-beach-460916-n5.iam.gserviceaccount.com`.

### Future releases and rollback

1. Deploy the compatible SGW assessment revision first. Check its `BIOGRAPHER_ENABLED` flag, private bucket binding and compatibility with the gateway's interview and cancellation protocols.
2. Deploy a schema-compatible WebApp candidate before its Admin consumer. Check `BIOGRAPHER_LIVE_URL=wss://biographer-live-x2qrlilyyq-od.a.run.app/live`, `BIOGRAPHER_ALLOWED_ORIGINS=https://mythoria.pt`, the recovery bucket and the matching `BIOGRAPHER_INTERNAL_API_KEY` secret version (version `1` at activation). The WebApp flag controls admission for all authenticated users of that revision. Validate an enabled candidate before moving public traffic.
3. Confirm provider access, transcript persistence, cancel-to-text, outline handoff and reconnect. Verify that the retention Scheduler continues to reach its endpoint and monitor for a sustained backlog. Preserve its OIDC configuration and bucket permissions across releases.
4. To roll back, disable new WebApp admissions first and let existing sockets drain. Keep retention operating for already captured audio.

The standard WebApp Cloud Build manifest uses `gcloud run services update` with the new image, labels and `--update-env-vars APP_GIT_SHA=…`. This preserves the other runtime environment variables and Secret Manager bindings. For custom deployments, use incremental updates for individual settings. The `--set-env-vars` and `--set-secrets` forms replace their respective collections. Verify the resulting revision's bindings without printing secret values.

## Database release

Production migration ledger records `0050_biographer_complete` at ID 129 and `0051` at ID 130. The additive 0051 migration follows the applied 0050 Biographer schema. It introduces author accounts, independent staff audits, wizard interview bindings, repeatable handoffs, and author-scoped deletion markers that prevent old clients from reopening a deleted story. Drain any outstanding legacy live leases before cutover. New author accounts begin with the pilot allowance. Keep the public feature off until migration, grants, retention scheduling and provider smoke tests succeed. The [0050 migration record](biographer-migration-applied-2026-11-17.md) is historical. Do not rerun these migrations based only on this record; verify the ledger during any future rollout.
