# Referral platform: operation and implementation

Updated: 2026-09-12. This is the WebApp's primary guide for operating referral codes, onboarding partners, understanding attribution and commissions, and diagnosing problems.

## Start here

- [How a referral works](#how-a-referral-works)
- [Commercial and attribution rules](#commercial-and-attribution-rules)
- [Onboard a referral owner](#onboard-a-referral-owner)
- [Configure local and production environments](#configure-local-and-production-environments)
- [Admin and partner permissions](#admin-and-partner-permissions)
- [Reporting definitions](#reporting-definitions)
- [Commission and settlement operations](#commission-and-settlement-operations)
- [Scheduled jobs and notifications](#scheduled-jobs-and-notifications)
- [Test the complete journey](#test-the-complete-journey)
- [Troubleshooting](#troubleshooting)
- [Implementation reference](#implementation-reference)
- [Deployment and rollback](#deployment-and-rollback)

## Current configuration and operational boundaries

The repository's `.env.local` and `cloudbuild.yaml` enable the program, capture, commissions and partner portal in **live** mode. Cloud Build passes all nine referral variables to the Cloud Run runtime. `scripts/deploy.ps1` uses that file; enabling a local variable alone does not configure production.

The current live owner allowlist contains `d279454a-c8b9-4a1e-8fc4-01e2fe1a88ac` (the RODRI pilot). **New owners must be added to the allowlist to receive live commission snapshots.** An empty allowlist does not mean all owners. Attribution can work while commission eligibility is disabled for an owner.

These are repository settings, not evidence of the current production revision. This documentation update does not deploy services, create Scheduler jobs, provision secrets or change IAM. Verify those resources during release. Earlier cross-service rollout records describe the original disabled/shadow phase; the enabled configuration above supersedes that phase for the next deployment.

The normal local development configuration uses the shared Cloud SQL database. Running the app on localhost does not isolate its data, payments or email delivery. Use a disposable database, Stripe test credentials and controlled recipients for financial fixtures and destructive tests.

Database migrations 0039-0043 were applied in the recorded 2026-09-11 operation after full backup `1789159808627`. Consult the [database operation record](referrals-records/REFERRALS_DATABASE_MIGRATION_2026-09-11.md) before changing schema; do not blindly replay historical migrations.

## How a referral works

1. A partner shares `https://mythoria.pt/r/RODRI`, or `http://localhost:3000/r/RODRI` for local testing.
2. `/r/:code` validates the code's format and redirects to the visitor's language, such as `/pt-PT?referral=RODRI`. The locale cookie takes precedence over the browser language. The redirect is relative, preserving localhost, LAN or tunnel origins instead of exposing the server's `0.0.0.0` listening address.
3. The client reads the candidate code into component state and removes it from the address bar. **No referral panel appears above the page.** The absence of a panel is intentional and does not indicate that capture failed.
4. Referral consent is checked separately from analytics and advertising consent. The existing cookie controls let the visitor accept or reject it. Only after consent does `/api/referrals/capture` validate the active owner/code, record a visit and set the anonymous attribution cookies.
5. When the visitor signs in or creates an account, the valid anonymous attribution can be linked to the customer account. The resulting account association works across devices. A previously created, unattributed account is not automatically backfilled just because tracking was subsequently enabled.
6. Eligible story creation and checkout capture immutable attribution snapshots. A successful eligible payment creates a commission using its checkout snapshot.
7. The owner sees visits, account-linking registrations, the story funnel, live purchase revenue, commissions and settlements in the partner portal. Admin sees the same canonical data through its internal API.

Opening a URL alone does not count as a recorded visit. Rejected consent, disabled capture, an inactive code or an abandoned page before capture can all result in no visit. Before consent, the candidate is only held in page memory; reload or navigation may lose it. Accept referral consent on the landing page before continuing a signup test.

## Commercial and attribution rules

| Rule                | Implemented behavior                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default commission  | 10%, stored as 1,000 basis points. Rates can be negotiated per owner.                                                                                   |
| Eligible purchase   | EUR credit-pack purchases, both first and repeat purchases, with an eligible referral snapshot.                                                         |
| Commission basis    | Authoritative Stripe Checkout `amount_total`: total paid after discounts, including applicable tax/shipping, without deducting payment fees.            |
| Rounding            | Integer cent arithmetic, rounded to the nearest cent. Example: EUR 49.99 at 10% produces EUR 5.00 commission.                                           |
| Anonymous window    | 90 days after the latest valid consented link. A later valid consented link can replace anonymous attribution.                                          |
| Account association | Persists across devices without the anonymous cookie's automatic expiry. One active customer assignment at a time.                                      |
| Customer changes    | Explicitly confirmed changes in Profile & Preferences affect future activity. They do not rewrite old stories, orders or commissions.                   |
| Partner eligibility | Active partner members cannot earn referral attribution as referred customers, including through another partner.                                       |
| Hold                | 30 days after payment, plus any review, dispute or reconciliation holds. Time alone does not guarantee payout eligibility.                              |
| Minimum payment     | EUR 20 net. Smaller balances and negative adjustments carry forward.                                                                                    |
| Settlement          | Monthly, closing the previous calendar month in Europe/Lisbon; suggested close time is day 1 at 03:00.                                                  |
| Payout              | Manual external bank transfer, followed by recording amount, reference and payment timestamp in Admin.                                                  |
| Retention           | Application policy retains financial history for ten years and longer when subject to a legal hold. This is an implementation policy, not legal advice. |

Referral codes are separate from promotional/discount codes. A referral link does not itself promise a discount. Their namespaces are reserved to avoid collisions.

Codes are normalized to uppercase, must contain 5-32 characters, start with a letter or digit, and otherwise use letters, digits, `_` or `-`. Codes cannot be renamed or deleted after first use. Terms have effective dates and cannot overlap; rate changes are prospective. Preserve the history rather than editing old financial records.

Suspending an owner retains existing customer associations but prevents new eligible checkout snapshots. Earlier valid snapshots keep their payment/retry handling. Reactivation affects future eligibility; closed owners cannot reopen. Revoking anonymous consent clears anonymous tracking without rewriting historical account associations or the ledger.

## Onboard a referral owner

1. Sign in to Admin and ensure your account has `referrals:manage`; see [permissions](#admin-and-partner-permissions).
2. Open `/referrals/owners/new`. Enter the display name, contact/invitation email, code, negotiated commission percentage, preferred language, and optional legal name/country.
3. Save and open the owner detail page. Verify status, code, membership email and current terms. Creation includes the specified member invitation; additional memberships can be invited from the detail page.
4. Copy the owner's UUID from the detail URL. Add it to `REFERRAL_PILOT_OWNER_IDS` locally and `_REFERRAL_PILOT_OWNER_IDS` in `cloudbuild.yaml`, preserving existing IDs in the comma-separated list. Restart the local process if needed; production needs a deployment/configuration update.
5. Ensure the notification outbox drain runs and the Notification Engine has the localized referral templates. A saved invitation is not proof that the email was delivered.
6. Have the invitee visit `/:locale/referrals`, use the invited email and complete Clerk verification. A verified eligible invitation becomes an active membership when the portal membership flow runs.
7. Confirm the portal opens, the negotiated rate and FAQ are correct, and the referral code is active. Test with a separate customer account, not the partner's own account.
8. Collect required payout/bank/tax information through the existing external business process before making payments. These details are not supplied through the referral environment variables.

The owner detail currently displays a production-domain sharing link. For local testing, use the same code with `http://localhost:3000/r/`. Do not confuse the partner portal URL (`/:locale/referrals`) with the public acquisition link (`/r/:code`).

## Configure local and production environments

`env.manifest.ts` lists the WebApp settings. Next.js reads `.env.local` during development. `cloudbuild.yaml` supplies production settings using `_VARIABLE_NAME` substitutions and runtime bindings.

| WebApp variable                      | Current local value                                                   | Next-deployment default / meaning                                            |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `REFERRAL_PROGRAM_ENABLED`           | `true`                                                                | `true`; enables new referral activity                                        |
| `REFERRAL_CAPTURE_ENABLED`           | `true`                                                                | `true`; forwards candidate codes and permits anonymous capture after consent |
| `REFERRAL_COMMISSION_ENABLED`        | `true`                                                                | `true`; permits eligible new checkout snapshots                              |
| `REFERRAL_PORTAL_ENABLED`            | `true`                                                                | `true`; partner access and menu discovery                                    |
| `REFERRAL_MODE`                      | `live`                                                                | `live`; shadow records are not partner payable earnings                      |
| `REFERRAL_PILOT_OWNER_IDS`           | Current active owner UUID                                             | Explicit comma-separated live owner UUID allowlist                           |
| `REFERRAL_INTERNAL_AUDIENCE`         | `http://localhost:3000`                                               | `https://mythoria-webapp-x2qrlilyyq-od.a.run.app`                            |
| `REFERRAL_ADMIN_SERVICE_ACCOUNT`     | `803421888801-compute@developer.gserviceaccount.com`                  | Same currently attached Admin identity                                       |
| `REFERRAL_SCHEDULER_SERVICE_ACCOUNT` | `analytics-scheduler@oceanic-beach-460916-n5.iam.gserviceaccount.com` | Exact trusted scheduled-job identity                                         |

The code's fallback flags are still false and its fallback mode is shadow if configuration is absent. Enabling flags does not convert historical shadow commissions into live commissions. The allowlist contains **owner UUIDs**, not codes or email addresses.

Admin requires the following corresponding settings:

| Admin variable                         | Configuration                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `WEBAPP_URL`                           | `http://localhost:3000` locally; the configured production WebApp base URL when deployed               |
| `REFERRAL_INTERNAL_AUDIENCE`           | Must exactly match WebApp's audience; it is the token's audience, not the Admin URL                    |
| `REFERRAL_IMPERSONATE_SERVICE_ACCOUNT` | Local development only: the same service account trusted by WebApp; ignored in production              |
| `REFERRAL_MCP_MANAGEMENT_KEY`          | Optional distinct credential for referral MCP management; empty disables that access                   |
| `REFERRAL_MCP_FINANCE_KEY`             | Optional distinct credential for referral MCP finance; must differ from management and legacy MCP keys |

Keep existing Clerk, Stripe, database, notification and fiscal credentials configured. `NEXT_PUBLIC_BASE_URL` must match the visitor's origin for customer mutation checks. A tunnel/LAN URL may require corresponding origin and authentication configuration; a working redirect alone does not prove authenticated POST requests work from that origin. No new referral-specific SGW or Notification Engine secrets are required.

Admin's deployment scripts support `-ReferralMcp` to attach the two Secret Manager bindings after those secrets exist. Their values must not be stored in Cloud Build substitutions. The ordinary partner/Admin UI does not require MCP to be enabled. See the [Admin guide](../../mythoria_admin/docs/referrals.md).

### Local service authentication

Admin sends Google-signed OIDC tokens to WebApp. WebApp verifies the audience and the exact verified service-account email. The customer's or manager's Clerk/Google session does not replace this service identity.

For local development, authenticate Application Default Credentials with the Google account granted ID-token permission:

```powershell
gcloud.cmd auth application-default login
```

A Google Cloud IAM administrator can grant the narrow ID-token permission on the target service account. Replace the member with the actual local ADC account; this may differ from the email used to sign in to Mythoria Admin:

```powershell
gcloud.cmd iam service-accounts add-iam-policy-binding `
  "803421888801-compute@developer.gserviceaccount.com" `
  --project="oceanic-beach-460916-n5" `
  --member="user:YOUR_LOCAL_GOOGLE_ACCOUNT" `
  --role="roles/iam.serviceAccountOpenIdTokenCreator"
```

This grants `iam.serviceAccounts.getOpenIdToken`. The application uses that ID-token flow directly. The CLI's `--impersonate-service-account` flow may also request access-token permission; do not broaden permissions just to make an unrelated CLI probe work. Restart Admin after changing local ADC/configuration. No service-account key file or authentication bypass is necessary.

Production uses the attached Admin service account. If replacing it with a dedicated identity, change the Cloud Run attachment and WebApp's trusted identity together. Staging needs its own consistent audience, identities and data configuration.

## Admin and partner permissions

There are two separate access models:

- **Admin operators:** allowed Google sign-in plus an explicit `backoffice_db.referral_admin_roles` row linked to the matching `managers` record. A legacy free-form `Admin` role is insufficient.
- **Partner users:** Clerk verified email plus an active membership, or an eligible invitation, on an active referral owner. Being a referred customer does not make someone an owner.

| Admin role         | Permissions                              |
| ------------------ | ---------------------------------------- |
| `referral_viewer`  | View                                     |
| `referral_manager` | View, manage owners, review commissions  |
| `finance`          | View, review, settle and record payments |
| `super_admin`      | All four permission groups               |

Record the identified grantor when assigning an Admin referral role. Apply only the approved scope. Missing permission displays an access-required message; expired sessions redirect to sign-in. REST and MCP operations enforce permissions independently of visible buttons.

An authorized database operator can grant a role in **backoffice_db**, after confirming the exact manager account. Replace the placeholders and choose the approved role from the table above:

```sql
INSERT INTO referral_admin_roles (manager_id, role, granted_by)
SELECT manager_id, 'referral_manager', 'AUTHORIZING_ADMIN_EMAIL'
FROM managers
WHERE email = 'TARGET_MANAGER_EMAIL'
ON CONFLICT (manager_id, role) DO NOTHING;

SELECT m.email, r.role, r.granted_by
FROM managers m
JOIN referral_admin_roles r ON r.manager_id = m.manager_id
WHERE m.email = 'TARGET_MANAGER_EMAIL';
```

If the manager does not exist, the insert grants nothing: create/verify the manager through the existing Admin management process first. Grant `super_admin` only when full access including settlement/payment operations is approved. Refresh the referral page after changing the binding. This is a shared-database access change, not a browser preference.

The top-right WebApp User Button shows a localized Referral portal link only for eligible partner users. Its `/api/referral-portal/access` check is private, uncached and read-only: it does not accept invitations or change attribution. The portal membership endpoint performs activation. Suspended owners/members cannot access the portal. Partners can switch between authorized memberships and never select arbitrary owner IDs to gain access.

## Reporting definitions

Overview and Owners in Admin show all-time totals from the WebApp owner-list API:

| Column / metric | Definition                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visits          | Number of stored consented visit records across the owner's codes, not raw redirect requests or unique people                                        |
| Unique visitors | Distinct anonymous visitor IDs; clearing cookies or using another device can produce another ID                                                      |
| Registrations   | Stored `registration` funnel events created on account linking; not exclusively newly created accounts                                               |
| New accounts    | Registration events with `new_account=true`; implementation marks an account fresh when linked within five minutes of its creation                   |
| Revenue         | Sum of `gross_amount_cents` on live commissions, in EUR; includes all commission statuses, before refund adjustments, and is not commission earnings |
| Commission      | The partner's commission amounts and their current status/balance, shown separately from purchase revenue                                            |
| Story funnel    | Deduplicated `story_started`, `story_generated`, and `story_published` events attributed through immutable story snapshots                           |

Registration events are deduplicated; repeated sign-ins are not repeated registrations. A confirmed manual reassignment does not imply a new anonymous visit. The owner-list metrics are independent aggregates, preventing visits and purchase joins from multiplying totals. An older backend without these fields displays unavailable values rather than false zeroes.

The partner portal supports date and other report filters. Its financial views show live records; shadow records remain available to administrative investigation and cannot be paid. Refresh the page after a test and check the selected membership/date range; do not assume a real-time push update.

Partner reports use owner-specific pseudonymous customer references. They do not reveal customer names/emails, story titles, prompts or content. GA4 is not the attribution ledger or the source of commission truth.

## Commission and settlement operations

At checkout creation, the WebApp checks the account assignment, owner/code status and validity, effective terms, self-referral exclusion, feature flags and live allowlist. It captures the owner, code, rate, mode, customer reference and terms version on the order **before** Stripe Checkout is created. Enabling commissions after an order was created does not retrofit that order's snapshot.

Payment completion uses the final Stripe total and atomically commits credit delivery, one commission per payment order, and durable follow-up work. Stable checkout-attempt IDs and database uniqueness prevent duplicate commissions when payment callbacks/webhooks retry. Missing final totals produce blocked/unvalued records rather than guessed amounts.

| State                    | Operational interpretation                                                      |
| ------------------------ | ------------------------------------------------------------------------------- |
| `pending`                | Accrued but waiting for hold/review/reconciliation eligibility                  |
| `blocked`                | Cannot proceed; investigate its reason/data before review                       |
| `approved`               | Eligible after the maturity/review checks; not proof of a bank transfer         |
| `payable`                | Allocated to an unpaid settlement                                               |
| `paid`                   | External payment was recorded against the settlement                            |
| `cancelled` / `reversed` | Cancelled entitlement or reversed financial exposure; inspect the event history |

Daily operation:

1. Drain provider/outbox retries and investigate repeated failures.
2. Reconcile Stripe, orders, commissions and fiscal records. A provider outage must not produce a clean report.
3. Run maturity after reconciliation. Eligible pending commissions need the 30-day hold elapsed, no blocking review/dispute and recent reconciliation.
4. Review blocked commissions through Admin with a reason. Do not edit ledger rows directly.

Monthly payment:

1. Reconcile before closing the prior calendar month in Europe/Lisbon.
2. Preview the settlement in Admin. Check signed carryover, the EUR 20 minimum, disputes/review holds and reconciliation freshness (within 48 hours).
3. Create the settlement. Its event allocations are recorded, and balances below the minimum carry forward.
4. Arrange the external bank transfer using the verified payout details.
5. Record the exact amount, bank reference and payment timestamp through Admin. The application records payment; it does not initiate a bank transfer.
6. Check statement/payment notification delivery and retain the reconciliation/payment evidence.

Refunds append cumulative, rounding-safe reversal differences. Disputes can hold or reverse earnings; a won dispute can reinstate the corresponding exposure. Refunds after payout become signed carryover adjustments. Financial changes/holds invalidate unpaid statements where required, so re-preview before payment. Do not delete events, overwrite old rates or manually reuse settlement allocations to repair discrepancies.

## Scheduled jobs and notifications

Feature flags do not schedule background processing. Ensure these authenticated HTTP jobs are provisioned and healthy before relying on automatic operations:

| POST endpoint                            | Suggested schedule (Europe/Lisbon)           | Purpose                                                                                                           |
| ---------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/api/internal/referrals/jobs/drain`     | Every five minutes                           | Retry provider payments and drain durable notification/follow-up work                                             |
| `/api/internal/referrals/jobs/reconcile` | Daily, before maturity; also after incidents | Reconcile provider/ledger/fiscal state; the HTTP endpoint uses the last 24 hours as its provider discovery window |
| `/api/internal/referrals/jobs/mature`    | Daily after reconciliation                   | Approve commissions that satisfy age and hold checks                                                              |
| `/api/internal/referrals/jobs/close`     | `0 3 1 * *`                                  | Close the prior month and create eligible settlements                                                             |

Use OIDC with the configured WebApp audience and `REFERRAL_SCHEDULER_SERVICE_ACCOUNT`. Keep job invocations serial where ordering matters, and investigate non-success responses. Do not assume these jobs exist just because an environment variable names a scheduler identity. Wider incident reconciliation may need the service-level date-range function rather than the fixed-window HTTP endpoint.

Notification Engine renders `referral-invitation`, `referral-statement` and `referral-payment-confirmation` in en-US, pt-PT, es-ES, fr-FR and de-DE. Outbox IDs and membership IDs provide delivery identity; retries must not create duplicate notifications. Inspect pending attempts and `nextAttemptAt` when email is delayed. Notification acceptance is not evidence of a bank transfer or inbox delivery.

The partner FAQ contains 14 localized answers covering sharing, consent, the 90-day window, existing/repeat customers, rates, discounts, prospective changes, status/holds, payment timing/minimum, refunds/disputes, self-referrals, privacy, details and support. Its questions and answers interpolate policy values and the owner's negotiated rate. No extra contact/privacy links appear below the FAQ.

## Test the complete journey

### Local functional smoke

1. Start WebApp on port 3000 and Admin on 3001 with their `.env.local` files loaded. Confirm the OIDC settings and Admin role.
2. Check the active owner, code, terms, invitation and live allowlist.
3. Use a fresh anonymous browser and open `/r/RODRI`. Expect a localized redirect carrying the candidate, followed by removal of the query parameter. Expect no referral banner.
4. Accept referral consent in the cookie controls before signup. In browser Network, confirm `/api/referrals/capture` succeeds. Cookies are HttpOnly, so inspect them in browser storage rather than JavaScript.
5. Create a separate test customer and complete onboarding. Confirm account attribution and refresh the owner report. A fresh link/signup should generate the expected visit and registration without exposing personal customer data.
6. Sign in as the owner separately and verify the User Button link, dashboard, membership selection and FAQ in each supported locale.
7. Reject referral consent in another fresh anonymous session. Confirm no capture and no corresponding attributed signup.

### Payment and resilience coverage

Use isolated data and Stripe test mode for checkout success/cancel/retry, duplicate or out-of-order webhooks, first/repeat purchases, negotiated rates, partial/full refunds, disputes, post-payout adjustments, fiscal failures and notification retries. Verify authoritative totals, one commission per order and immutable snapshots. Test the EUR 20 boundary, the 30-day hold, Lisbon month boundaries, suspended owners and omitted allowlist IDs. Do not change shared production timestamps to accelerate these tests.

Developer checks from this repository:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --runInBand
npm.cmd run i18n:parity
npm.cmd run check:env
```

`src/components/referrals` and the route tests cover menu/FAQ/redirect/consent behavior. `scripts/referral-integration.ts` requires an explicitly prepared disposable `referral_test*` database on loopback port 55439 through `REFERRAL_TEST_DATABASE_URL`; it rejects the normal shared database and does not load dotenv. `scripts/referral-stripe-sandbox.ts` additionally requires Stripe test credentials. See the [implementation record](referrals-records/REFERRALS_IMPLEMENTATION.md) for test boundaries and historical results. Passing unit tests is not production payment, job or email-delivery evidence.

## Troubleshooting

| Symptom                                             | Check / action                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/r/RODRI` reaches the homepage without attribution | Program/capture flags in the running process; referral consent; successful capture request; active code/owner. The candidate being removed from the URL is expected.                                                                            |
| Redirect uses `0.0.0.0`                             | Use the updated route with a relative Location header; restart/redeploy an older running version.                                                                                                                                               |
| No registration increment                           | Separate customer versus partner account, consent, capture/link success, completed onboarding, duplicate existing registration, selected owner/date filters and page refresh. Tracking enabled after signup does not automatically backfill it. |
| Visits work but commission is missing               | Commission flag, live owner UUID allowlist, active terms/code, non-partner customer, order snapshot created before payment and successful authoritative payment completion.                                                                     |
| Revenue stays zero                                  | Revenue uses live commission records. Inspect shadow mode, eligibility at checkout, payment success and filters. A visit or signup is not revenue.                                                                                              |
| Partner portal is 404                               | `REFERRAL_PORTAL_ENABLED` in the running process.                                                                                                                                                                                               |
| Partner cannot enter the portal                     | Invited verified email, active owner/member status, correct Clerk environment and selected membership.                                                                                                                                          |
| Admin says access required / Forbidden              | Explicit `referral_admin_roles` binding for the exact manager email; the legacy Admin role does not suffice.                                                                                                                                    |
| `Referral service is not configured`                | Admin's `WEBAPP_URL` and `REFERRAL_INTERNAL_AUDIENCE`; restart after changes.                                                                                                                                                                   |
| `iam.serviceAccounts.getOpenIdToken` denied         | Correct ADC account and its IAM grant on the impersonated Admin service account.                                                                                                                                                                |
| Internal API returns unauthorized                   | Exact token audience, verified service-account email and matching WebApp trust variables.                                                                                                                                                       |
| Customer mutation returns `forbidden_origin`        | `NEXT_PUBLIC_BASE_URL` versus the actual localhost/LAN/tunnel origin.                                                                                                                                                                           |
| Invitations or statements are not sent              | Outbox drain schedule, pending/error attempts, Notification Engine URL/key/templates and delivery evidence.                                                                                                                                     |
| Old commissions never become payable                | Reconciliation freshness, maturity job, hold age, disputes/review reasons, minimum balance and monthly close.                                                                                                                                   |
| Changes appear locally but not in production        | Deployment defaults are not the running revision. Verify deployed SHA, runtime environment, traffic, job configuration and smoke results.                                                                                                       |

Never fix financial discrepancies by deleting rows, restoring a pre-ledger backup over later payments, or disabling authentication.

## Implementation reference

| Area                      | Source / contract                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Policy and validation     | `src/lib/referrals/policy.ts`                                                                                                          |
| Database and invariants   | `src/db/schema/referrals.ts`, migrations 0039-0043; code/rate/ledger constraints and funnel triggers                                   |
| Domain operations         | `src/db/services/referrals.ts`: owners, assignments, checkout snapshots, accrual, review, refunds and settlement                       |
| Reporting                 | `src/db/services/referral-reporting.ts`; owner-list aggregate fields in `referrals.ts`                                                 |
| Payment integration       | `src/db/services/payment.ts` and the existing Stripe webhook/payment pipeline; see the cross-service contract for completion semantics |
| Public redirect           | `src/app/r/[code]/route.ts`                                                                                                            |
| Customer capture/settings | `src/components/referrals/ReferralCustomer.tsx`, `src/app/api/referrals/[...path]/route.ts`                                            |
| Partner identity          | `src/lib/referrals/portal.ts`; invitation activation and verified Clerk membership checks                                              |
| Partner UI                | `src/components/referrals/PartnerPortal.tsx`, `PartnerSignIn.tsx`, `ReferralFaq.tsx`                                                   |
| Partner read APIs         | `/api/referral-portal/access`, `/memberships`, `/summary`, `/visits`, `/conversions`, `/commissions`, `/settlements`, `/statement`     |
| Service command API       | `POST /api/internal/referrals/command`, `{ operation, input, actor }`; exact OIDC identity plus domain permissions                     |
| Background operations     | `src/lib/referrals/jobs.ts`, `src/app/api/internal/referrals/jobs/[job]/route.ts`                                                      |
| Admin facade              | `mythoria_admin/src/services/referrals.ts`, `/api/admin/referrals/*`, `/referrals/*`                                                   |

WebApp owns `mythoria_db` referral tables and calculations. Admin owns referral operator roles in `backoffice_db`; its UI and MCP call the WebApp domain rather than writing financial tables directly. SGW terminal request persistence feeds the WebApp-owned story completion trigger. Notification Engine owns message rendering and dispatch.

Important database guarantees include one commission per payment order, one active customer assignment, immutable payment/story snapshots, non-overlapping terms, append-only signed commission/audit events and retained settlement allocations. Customer deletion anonymizes permitted operational data while preserving restricted financial relationships and legal holds.

## Deployment and rollback

Before the next release, review the enabled flags and allowlist in `cloudbuild.yaml`, validate environment parity in both repositories, and confirm required identities, secrets, Stripe/Clerk configuration, notification templates and Scheduler jobs. Deploy the schema-compatible WebApp before the Admin that consumes new response fields. Verify ready revision/traffic, health, authenticated owner reports, consented attribution, payment completion and background-job evidence. No new migration is needed for the owner-table metrics.

To stop new activity, disable program/capture/commission flags and optionally hide the portal. Apply the change to the running environment as well as future deployment configuration. **Keep payment webhooks, provider reconciliation and durable retries operating for already captured orders.** Do not remove ledger tables or discard unpaid financial obligations. Reconcile and investigate before re-enabling.

Related records:

- [Production release and remaining operations](referrals-release-2026-09-12.md)
- [Cross-service contracts and original rollout runbook](referrals-records/REFERRALS.md)
- [Implementation and validation record](referrals-records/REFERRALS_IMPLEMENTATION.md)
- [Database backup/migration record](referrals-records/REFERRALS_DATABASE_MIGRATION_2026-09-11.md)
- [Admin referral operations and permissions](../../mythoria_admin/docs/referrals.md)
- [Environment manifest](../env.manifest.ts)
- [Production Cloud Build configuration](../cloudbuild.yaml)
