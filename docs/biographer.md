# Story Whisperer

Story Whisperer opens from Step 2 of Tell Your Story. A single signed-in author can type, dictate an editable answer, have a live voice conversation with Gemini 3.8 Live, and attach photos. The wizard creates an ordinary story draft, with the regular character review, outline editor, persona selection and book pricing.

WebApp owns the interview, evidence, draft association, usage ledger and private media lifecycle. SGW assesses characters, setting and plot and runs the low-latency voice gateway. The customer workflow is described in the [local testing guide](biographer-local-testing.md). The internal Biographer API names remain for compatibility with the gateway and staff tools. Contributor APIs retain their participant scopes.

The readiness endpoint returns HTTP 409 with code `READINESS_REVISION_CHANGED` when the same interview advances during an assessment. The chat can retry that response against the current revision. The interview response includes `readinessNeedsRefresh` when saved material needs a fresh assessment, so the chat can update progress automatically on open. Progress from the current rubric can remain visible while a later revision is assessed. Continuing requires a successful assessment of the current revision and rubric. Opening a saved interview with outdated readiness triggers a fresh assessment of its existing material, even when the saved revision matches. Prior rubric results and their ready notices expire together. Within the current rubric, readiness stores `firstReadyTurnId` at the first completed author reply that reaches readiness and retains it on later assessments. The WebApp requires the assessment endpoint to return the current rubric version. Deploy the SGW assessment endpoint before the WebApp. Replacing the interview invalidates the old project ID and requires a reload.

New interviews store the Step 2 intent and the localized opening question with its four reply buttons in the existing JSON context. Text and live voice receive that opening and the saved conversation. Readiness uses the current interview revision and rubric version. Outline input pairs each author's reply with the question it answers, preserving approximate dates and creative choices. Unanswered questions and unselected buttons contribute no evidence.

Authors can revise typed and dictated text before submitting it. Sent replies appear as read-only messages. An interrupted voice reply can be completed by typing or recovering a saved transcription.

Stopping Live Voice or switching to text releases the microphone immediately. The browser sends WebSocket `cancel` and an owner-scoped session DELETE with the current capture ID. The gateway stops the provider, drains already completed checkpoints, discards unfinished user and assistant turns, and releases the lease. The WebApp rejects late uploads for discarded turns and removes their audio in the background. An unexpected disconnect still preserves recoverable audio.

The live client waits up to 20 seconds for the gateway to confirm the final transcript before the outline handoff. In local development, the browser console records `outline-preparation-confirmed` with the elapsed time or `outline-preparation-timeout` with the elapsed time and deadline. These events contain no story or account data.

A successful typed reply returns the committed interview in the POST response, including on replay of a saved answer ID. The client can display the next question immediately. The structured `Story Whisperer reply timings` log measures the initial database transaction, the assessment request and the final transaction in milliseconds. These timings exclude browser rendering and carry no interview content or account identifiers.

## Data and operations

Submit stable answer IDs, and acknowledge only durable saves. On confirmed restart invalidate outstanding capture, pending uploads and the old interview identity. Keep existing wizard assets and the author's usage ledger. A live session reserves time from a locked author account. The initial pilot allowance is 10,800 seconds; a staff extension or pause applies across interviews.

The `Story Whisperer reset timings` log records milliseconds for closing the project and its live sessions, finding unsubmitted copies, deleting private files, and deleting database records. It records the outcome and failed stage without draft, project, or author IDs. Reset returns success after all required file cleanup and database deletion complete.

Private recovery audio expires seven days after capture. The API denies expired reads/uploads, deletes audio after a final transcript commits, and retries failed deletion through the retention sweep. Closed browsers purge expired local recovery bytes on their next execution. Photos have a separate lifecycle. A private recovery bucket with soft delete or versioning enabled may retain inaccessible object versions past application deletion; align the bucket's retention settings before promising physical erasure.

Before enabling a pilot, provision a recurring Cloud Scheduler POST to `/api/biographer/internal/expire-audio` on the web app, using the existing scheduler identity in `ANALYTICS_SCHEDULER_SERVICE_ACCOUNT` and a Google OIDC token with the WebApp origin as audience. Run every minute. The endpoint processes up to 100 turns per call. Monitor errors and the `more` flag for a sustained backlog. For local isolated testing, the endpoint also accepts the gateway's private callback header. Never print credentials in logs. Verify bucket privacy, the retention schedule and deletion permissions together.

For a new environment with the scheduler identity configured, provision the job once during rollout. Set the shell variables to that environment's project, region, WebApp HTTPS origin, and scheduler account.

```sh
gcloud scheduler jobs create http story-whisperer-expire-audio \
  --project="$PROJECT_ID" --location="$REGION" --schedule="* * * * *" \
  --uri="$WEBAPP_ORIGIN/api/biographer/internal/expire-audio" --http-method=POST \
  --oidc-service-account-email="$SCHEDULER_ACCOUNT" --oidc-token-audience="$WEBAPP_ORIGIN"
```

## Database release

The additive 0051 migration follows the applied 0050 Biographer schema. It introduces author accounts, independent staff audits, wizard interview bindings, repeatable handoffs, and author-scoped deletion markers that prevent old clients from reopening a deleted story. Drain any outstanding legacy live leases before cutover. New author accounts begin with the pilot allowance. Keep the public feature off until migration, grants, retention scheduling and provider smoke tests succeed. The [0050 migration record](biographer-migration-applied-2026-11-17.md) is historical. Use the normal reviewed deployment procedure for 0051.
