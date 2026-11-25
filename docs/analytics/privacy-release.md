# Analytics containment release

## Destinations

All responses use `Referrer-Policy: no-referrer`. When replacing the containment revision, set `ANALYTICS_PRIVACY_PAUSE=true` (`_ANALYTICS_PRIVACY_PAUSE=true` with Cloud Build). The pause keeps vendor delivery, first-party receipt capture, and new aggregate and growth measurement off at runtime. The operations outbox and consent withdrawal remain available. OpenAI Ads pending rows retain their delivery state while expired raw context is cleared. The flag defaults to false for releases that already use first-party measurement.

Apply the additive analytics schema before deploying. The release defaults external GA4 and OpenAI Ads delivery to off. First-party counters on canonical production use `ANONYMOUS_ANALYTICS_ENABLED=true` and have no dependency on a vendor. They store UTC day, bounded surface, outcome and count. Confirmed document navigations count requests rather than people. The scheduled drain recomputes recent completed product totals from committed account, generation and payment records.

Browser GA4 and the optional ads Pixel require an explicit isolated origin, a separate test property and eligible public routes. Set `NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN` and `NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID` in the isolated build. Enable `NEXT_PUBLIC_GA_DEBUG` there for DebugView. An OpenAI Pixel audit also requires a separate `NEXT_PUBLIC_OPENAI_AUDIT_PIXEL_ID`. Production browser tags require a subsequent reviewed release supported by actual payload evidence.

Pass these public settings as Docker build arguments for the isolated image. Keep `ANALYTICS_AUDIT_API_SECRET` in the isolated runtime or Secret Manager. The normal production Cloud Build leaves the audit settings unset.

Set `ANALYTICS_DELIVERY_TARGET=audit`, the dedicated `ANALYTICS_AUDIT_API_SECRET` and `GA4_AUDIT_PROPERTY_ID` for `npm run ga4:smoke`. The app's configured base URL must match the audit origin. The probe validates the payload and waits for a uniquely named event in Realtime. Its identity needs read access to the audit property. Production server dispatch is separately configurable after approval through the Cloud Build substitutions `_ANALYTICS_DELIVERY_TARGET` and `_OPENAI_ADS_CAPI_DELIVERY_ENABLED`.

## Receipt and withdrawal

A confirmed Analytics grant creates a first-party receipt even without a vendor client ID. The browser renews its HttpOnly cookie on observation, with a 30-day inactivity window. The same receipt can acquire a valid test-stream client and session later. Its first-party fallback identifier stays in the restricted database.

Withdrawal marks the receipt revoked and suppresses undelivered rows. An already-dispatching Measurement Protocol request finishes or times out before receipt revocation is acknowledged. The next request has to acquire a current receipt independently. Reporting should distinguish missing consent, observed missing session, no genuine GA client and delivery failures. A consent-mode export cannot measure the unobserved pre-grant gap directly.

Apply migration `0054_signup_outbox_privacy` before deploying the updated signup writers. It replaces legacy signup keys in place with a deterministic SHA-256 digest and clears the stored GA outbox user ID. A database trigger applies the same transformation to inserts from older revisions, so they still conflict on the existing signup. Keep the migration in place on rollback. An older attribution-link revision can miss the pending status if its recovery request races a delivery claim. Keep `ANALYTICS_DELIVERY_TARGET=off` until attribution-link traffic reaches the updated revision. The shared drain continues to publish story requests.

## Release evidence

- Run unit and isolated browser fixtures. The isolated browser spec captures every attempted tag request and checks that granting consent does not replay earlier click identifiers or create vendor traffic.
- To rehearse migration `0053_analytics_privacy_growth_v2` against the immediately preceding tracked schema, run `GROWTH_MIGRATION_BASE=5ca373c8f61e9a17d6ba675ccc547700a23510d9 bash scripts/analytics/run-growth-fixture.sh`. The command initializes disposable loopback PostgreSQL and applies the exact SQL.
- With an approved isolated deployment, run `RUN_ANALYTICS_NETWORK_AUDIT=1 npm run test:e2e -- analytics.audit.mobile.spec.ts`. The base URL must match the audit origin. Capture network requests and DebugView with synthetic credential, URL, auth-return, title and external-link sentinels. Verify full-page load, reload, navigation, referrer and consent changes. Repeat when enabling an automatic measurement feature. Run the server probe separately.
- For a disposable loopback browser audit against an approved test stream, set `RUN_ANALYTICS_NETWORK_AUDIT=1` and `NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID` when running `npm run test:e2e:isolated -- analytics.audit.mobile.spec.ts`. The fixture enables DebugView, uses synthetic Clerk and PostgreSQL data, and restricts browser analytics traffic to the specified test stream. It leaves Measurement Protocol credentials unset.
- Confirm the next complete daily BigQuery export and reconcile seven days against restricted Cloud SQL transaction truth and outbox state. Record timezone, cutoff, property and stream, exclusions, GA4 key events, Google Ads conversion actions and campaign goal overrides. Keep purchase as the primary purchase goal.
- For historical triage, run read-only checks inside each authorized data source and return grouped counts by time and affected destination or field. Check current, expired and revoked private-link patterns across location, referrer, title, encoded redirects, click URLs, automatic events, top-level user IDs and nested parameters. Keep raw records in their authorized store. Record the incident owner's remediation decisions, including credential rotation, data retention and any action on historical vendor records.
- Roll back feature toggles while retaining the privacy barriers. Keep operational product requests and business records usable. Verify generation, payment, login and reading independently after any rollback.
