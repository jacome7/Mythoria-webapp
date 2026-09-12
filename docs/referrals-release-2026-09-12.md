# Referral production release — 2026-09-12

All four services were deployed sequentially and verified healthy with 100% traffic on the revisions below. Production referral capture, portal access and live commissions are enabled for the approved owner. Background schedules and the external journey matrix remain outstanding.

## Verified production revisions

| Service                   | Revision                              | Image source SHA                           | Successful Cloud Build                 |
| ------------------------- | ------------------------------------- | ------------------------------------------ | -------------------------------------- |
| Notification Engine       | `notification-engine-00061-fk9`       | `7764332dd599fd9ac1a6e506ef7553b19fe6f190` | `ffa0f08a-d220-4892-9e24-d6dade8aa968` |
| Story Generation Workflow | `story-generation-workflow-00132-xx2` | `27373ecaf028751d1aeaefbd703db0b6c219a6bc` | `c57e880e-2003-4413-be89-8202ed383c44` |
| WebApp                    | `mythoria-webapp-00230-q8t`           | `13a3f55a991d216f208ff007664dcdb592b5d82f` | `827f5661-c9ae-4622-8899-5a3f011c6782` |
| Admin                     | `mythoria-admin-00088-wz5`            | `12e16f56bef4dd3e77e851decc570e5f18b2788b` | `0fda66ce-5368-44d4-9aa0-265165b1fc93` |

The source snapshots were archived before building and then attached to their repository branches at release completion. Subsequent documentation and deployment-configuration commits do not change these image SHAs. SGW's separately updated runtime configuration already used `GOOGLE_GENAI_MODEL=gemini-3.8-flash` and `OPENAI_IMAGE_TOOL_MODEL=gpt-image-2.5-flare` at final verification; that matching local Cloud Build edit is included in the final source publication.

Admin initially retained 100% traffic on its previous pinned revision despite a successful build. The new revision was activated under a temporary tag, passed health and both MCP permission/domain-read checks, then received 100% traffic using `--to-latest`; the temporary tag was removed. Admin Cloud Build now explicitly promotes latest traffic so future releases do not silently remain pinned.

Live checks passed: HTTP 200 health for all four services; exact image SHA and ready revision; WebApp referral environment values and Admin secret references; relative `/r/RODRI` redirect; internal referral API rejection without authentication; authenticated owner metrics; management versus finance MCP tool isolation and domain reads on the canonical Admin URL; SEO checks for 211 canonical URLs; and GA4 Realtime confirmation of the standard delivery probe. The checked WebApp warnings were HTTP 401/404 responses, including deliberate negative probes and one malformed `/undefined/p/undefined` request, with no observed application 5xx error. These observations are bounded release smokes, not long-term monitoring or proof of customer payment/email delivery.

## Scope and configuration

The operator authorized stopping local Mythoria services, sequential production deployments of Notification Engine, Story Generation Workflow, WebApp and Admin, and publishing all reviewed local changes. Local WebApp, Admin and ngrok processes were stopped. Ubuntu synchronization was excluded.

The WebApp release enables `REFERRAL_PROGRAM_ENABLED`, `REFERRAL_CAPTURE_ENABLED`, `REFERRAL_COMMISSION_ENABLED` and `REFERRAL_PORTAL_ENABLED`, with `REFERRAL_MODE=live`. The commission allowlist contains owner `d279454a-c8b9-4a1e-8fc4-01e2fe1a88ac` (code `RODRI`). Other owners require an explicit allowlist update before live commissions accrue.

The OIDC audience is `https://mythoria-webapp-x2qrlilyyq-od.a.run.app`. Admin uses its attached service identity, `803421888801-compute@developer.gserviceaccount.com`; local impersonation configuration is not deployed. The trusted scheduler identity is `analytics-scheduler@oceanic-beach-460916-n5.iam.gserviceaccount.com`.

The operator separately approved the creation of `REFERRAL_MCP_MANAGEMENT_KEY` and `REFERRAL_MCP_FINANCE_KEY`. Independent credentials were created in Secret Manager, and Admin's Cloud Build binds both by default. Their values are absent from source control and this record.

## Validation and dependency maintenance

- WebApp: lint, typecheck, environment and locale parity passed; 688 tests passed, 13 skipped.
- Admin: lint, typecheck and environment parity passed; 84 tests passed.
- Story Generation Workflow: lint, typecheck, build and 220 tests passed.
- Notification Engine: lint, typecheck, environment parity, build and 64 tests passed.
- A preliminary WebApp build was cancelled before deployment after the dependency audit identified critical advisories. Compatible lockfile updates advanced WebApp and Admin to Next.js 16.3.5 and Admin authentication to next-auth 5.0.0-beta.32. Application checks were repeated successfully.
- The first Admin build failed while type-checking nested test files without Jest globals. Recursive Docker test exclusions and explicit TypeScript `node`/`jest` globals were added; type checking and all 84 tests passed again before the retry.

Production dependency audit results after those updates:

| Service                   | Critical | High | Moderate | Low |
| ------------------------- | -------: | ---: | -------: | --: |
| WebApp                    |        0 |    2 |       11 |   0 |
| Admin                     |        0 |    0 |        2 |   0 |
| Story Generation Workflow |        0 |    5 |       10 |   1 |
| Notification Engine       |        0 |    0 |        6 |   0 |

These are package audit findings, not evidence of exploitation. Remaining WebApp high findings concern `image-size` and the build dependency `serialize-javascript`; the former had no available fix in the audit, while the latter's proposed automated fix changes the PWA dependency outside the current version range. SGW high findings concern `@grpc/grpc-js`, `brace-expansion`, `form-data`, `protobufjs` and `sharp`. Address the remaining advisories in a focused dependency update with the appropriate image, PDF, storage and Pub/Sub regression checks. Build logs also include deprecated-package and package-manager notices; a healthy runtime does not mean all build warnings are resolved.

## Remaining operational work

1. Provision and verify the four referral Scheduler jobs in `europe-west9`: drain every five minutes, reconcile daily, mature after reconciliation, and close at 03:00 Europe/Lisbon on the first day of each month. Only the two existing analytics jobs were found during release preflight. The referral scheduler environment variable does not create these jobs.
2. Complete the external journey matrix: consented referral capture, a new Clerk account, hosted Stripe Checkout, webhook transport, commission reporting, refunds/disputes, invitation and statement delivery, and monthly settlement. Unit tests and read-only production smokes do not prove payment or email delivery. Use isolated Stripe test data for destructive/replay cases; do not insert fixtures into the shared production database.
3. Configure authorized MCP clients securely with the appropriate management or finance credential. Deployment does not distribute secrets to clients.
4. Add future approved owners to the live commission allowlist; confirm active codes, effective terms, memberships and human Admin referral roles.
5. Operate payouts manually: collect required payout details through the existing external process, make the actual transfer, then record the payment reference and exact amount in Admin. The application does not execute bank transfers.

The operator requested live operation directly. The earlier runbook's seven-day shadow observation is not evidence collected by this release; monitor attribution, ledger reconciliation, retries and settlement exceptions accordingly.

See [the operating guide](referrals.md), [the historical cross-service contract](referrals-records/REFERRALS.md), and [the completed backup/migration record](referrals-records/REFERRALS_DATABASE_MIGRATION_2026-09-11.md). Historical records retain their original dated status and are superseded by the verified release results here.
