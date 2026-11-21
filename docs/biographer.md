# Story Whisperer

Story Whisperer opens from Step 2 of Tell Your Story. A single signed-in author can type, dictate an editable answer, have a live voice conversation with Gemini 3.8 Live, and attach photos. The wizard creates an ordinary story draft, with the regular character review, outline editor, persona selection and book pricing.

WebApp owns the interview, evidence, draft association, usage ledger and private media lifecycle. SGW assesses characters, setting and plot and runs the low-latency voice gateway. The customer workflow is described in the [local testing guide](biographer-local-testing.md). The internal Biographer API names remain for compatibility with the gateway and staff tools. Contributor APIs retain their participant scopes.

## Data and operations

Submit stable answer IDs, and acknowledge only durable saves. On confirmed restart invalidate outstanding capture, pending uploads and the old interview identity. Keep existing wizard assets and the author's usage ledger. A live session reserves time from a locked author account. The initial pilot allowance is 10,800 seconds; a staff extension or pause applies across interviews.

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
