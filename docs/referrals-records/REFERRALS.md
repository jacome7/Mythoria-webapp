# Mythoria referral platform v1

> Historical record. For the current release status, see [the production release record](../referrals-release-2026-09-12.md).

Updated: 2026-09-09. Status: local implementation; production rollout is not activated.

## Commercial rules

- EUR credit-pack purchases, including first and repeat purchases, earn a default 10% commission. Each owner can have negotiated, prospectively effective rates in basis points.
- Commission basis is the full authoritative Stripe Checkout `amount_total`, including tax and shipping, after any checkout discount. There is no deduction for fees. Integer arithmetic rounds to the nearest cent.
- The latest valid, explicitly consented anonymous link wins for 90 days. Account linking persists across devices. A customer can explicitly replace their association for future activity in Profile & Preferences; historical checkout and story snapshots remain unchanged.
- Referral attribution has a separate consent preference. Clearing cookies stops anonymous capture; it does not rewrite existing account associations or financial records. A manually confirmed account association does not require anonymous tracking cookies.
- Active partner members cannot be referred customers. Suspension retains existing customer associations, prevents new eligible checkout snapshots, and preserves commissions from earlier snapshots. Reactivation affects future eligibility. Closed owners cannot reopen.
- Commissions mature after 30 days, subject to review, dispute and reconciliation holds. Monthly settlement closes the previous month on day 1 at 03:00 Europe/Lisbon. The minimum net payment is EUR 20; smaller balances and negative adjustments carry forward.
- Transfers are manual. Finance records the exact amount, bank reference and payment timestamp. Bank and tax payout details are collected through the existing external process.
- Financial records follow the existing ten-year retention policy and any longer legal hold. Account deletion anonymizes operational identities while retaining financial history. There is no automatic financial purge.

## Ownership and architecture

The WebApp owns all referral data and business logic in `mythoria_db`. Its domain services are in `src/db/services/referrals.ts` and reporting in `referral-reporting.ts`. Admin and MCP invoke its authenticated internal API. They do not independently calculate or write commissions.

Admin owns only `referral_admin_roles` in `backoffice_db`. Shared schema mirrors are refreshed using each repository's sync script. SGW continues recording terminal generation requests; WebApp-owned database triggers record referral funnel completion independently of analytics consent. Notification Engine owns localized email rendering and durable notification delivery.

### Main records and invariants

| Record                            | Purpose                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Owners, memberships, codes, terms | Partner identity, invitation-bound Clerk access, reserved code namespace and non-overlapping negotiated rate periods |
| Visits and assignments            | Opaque 90-day visitor IDs, one active assignment per customer, explicit assignment history                           |
| Payment snapshots                 | Immutable owner, code, terms, rate, mode and pseudonymous customer reference captured before Stripe session creation |
| Commissions and commission events | One commission per payment order; append-only signed financial events; mutable status/balance projections            |
| Settlements and items             | Exact immutable event allocation, one active allocation per event, carryover and bank payment confirmation           |
| Provider inbox and outbox         | Provider event dedupe/leases, retries and durable invitation/payment/fiscal work                                     |
| Funnel and reconciliation         | Pseudonymous conversion metrics, provider/ledger/fiscal mismatch reports                                             |

Migrations enforce code reservation across promotional and referral codes, rate period exclusion, immutable ledger/audit/payment snapshots, and restricted financial foreign keys. Referral codes cannot be deleted or renamed after first use. Released allocations are retained when a pending settlement is invalidated.

Payment completion atomically commits credits, referral accrual and durable follow-up work. Stable client checkout attempt IDs map retries to one local order and one Stripe idempotency key. The first/repeat classification used by reporting is computed at completion under the customer lock. The checkout snapshot also retains its earlier classification for historical context.

Refunds use cumulative provider amounts and append only the rounding-safe difference from previous reversals. Lost disputes add charge exposure capped at the original charge; a subsequently won dispute can reinstate the corresponding amount. Refunds and disputes after payment become signed carryover adjustments. Any financial change or hold invalidates pending statements before another payment can be recorded. Missing final Stripe totals create unvalued blocked commissions, never estimated commission amounts.

### Funnel contract

`registration` records account linking and marks fresh accounts separately. `story_started`, `story_generated`, and `story_published` are deduplicated by story and event kind. Story snapshots are taken at story creation. Completion is recorded by a trigger on `story_generation_requests.status = completed`, so SGW does not need an independent attribution writer or GA4 consent. Partner DTOs contain no names, emails, titles, prompts or story content. Customer references are unique per owner.

## Public and partner routes

All customer/partner JSON responses are private and no-store. Customer mutations require the expected same origin. Invalid or inactive codes do not replace valid existing attribution.

| Method and route                       | Contract                                                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /r/:code`                         | Temporary redirect to the localized entry page. No cookies are written before referral consent. The client removes the candidate from the address bar.                                   |
| `POST /api/referrals/capture`          | `{ code, locale, requestId: UUID }`; referral consent v3 required; sets opaque HttpOnly, SameSite=Lax attribution cookies                                                                |
| `POST /api/referrals/clear`            | Clears both anonymous cookies, including while capture is disabled                                                                                                                       |
| `GET /api/referrals/me`                | Authenticated current customer association; links a valid consented visit when needed                                                                                                    |
| `POST /api/referrals/link`             | Same authenticated linking behavior                                                                                                                                                      |
| `POST /api/referrals/me/change`        | `{ code, confirmed: true }`; prospective change only                                                                                                                                     |
| `POST /api/payments/stripe/checkout`   | Existing credit-package contract plus required stable UUID `checkoutAttemptId`                                                                                                           |
| `GET /:locale/referrals`               | Invitation-bound Clerk partner portal, excluded from indexing                                                                                                                            |
| `GET /api/referral-portal/memberships` | Only the authenticated partner's active memberships                                                                                                                                      |
| `GET /api/referral-portal/:action`     | `summary`, `visits`, `commissions`, `settlements`, `conversions`, `statement`; optional selected membership validated on every request; statement requires `id` and enforces owner scope |

Report filters: `page` (from 1), `limit` (1–100), `from`/`to` (ISO timestamps; inclusive start/exclusive end), commission `status`, `purchase=first|repeat`, supported `locale`, and uppercase two-letter `country`. Financial data exposed to partners is live mode only. The dashboard shows visits, unique visitors, registrations, story funnel, revenue, first/repeat purchases, balances and payment history. Statements can be printed from the portal.

The portal FAQ contains 14 localized answers covering sharing, consent and 90-day attribution, existing/repeat customers, full Stripe basis and negotiated rate, promo-code distinction, prospective changes, status/holds, monthly payment and minimum, refunds/disputes, self-referrals/suspension, customer privacy, payout details/code changes, and support. Rate and policy amounts are populated from protected owner data and the shared policy constants.

Cancelled commissions reject new manual adjustments; exact retries of previously recorded adjustments remain idempotent. Referral request/job failures use Winston JSON records with service/component, timestamp and safe error codes. Long-blocked commissions and negative balances emit financial-review alerts without customer payloads or credentials.

## Admin and MCP

Admin pages: `/referrals`, `/referrals/owners`, `/referrals/owners/new`, `/referrals/owners/:id`, `/referrals/commissions`, `/referrals/settlements`, `/referrals/reconciliation`. The existing Admin header links to Referrals.

Admin REST routes under `/api/admin/referrals` support owner creation/update, status, future terms, invitations/member suspension, commission review/adjustment, settlement preview/create/paid and reconciliation history. Server permissions are checked independently of visible UI controls. Authentication alone grants no referral role.

| Role/principal     | Permissions                            |
| ------------------ | -------------------------------------- |
| `referral_viewer`  | view                                   |
| `referral_manager` | view, manage, review                   |
| `finance`          | view, review, settle                   |
| `super_admin`      | all four                               |
| MCP management key | view, manage                           |
| MCP finance key    | view, review, settle                   |
| Legacy MCP key     | existing tools only; no referral tools |

Fourteen MCP tools share the domain API: `create_referral_owner`, `get_referral_owner`, `list_referral_owners`, `update_referral_owner`, `set_referral_owner_status`, `set_referral_owner_rate`, `invite_referral_owner_member`, `list_referral_commissions`, `review_referral_commission`, `create_referral_commission_adjustment`, `preview_referral_settlement`, `create_referral_settlement`, `mark_referral_settlement_paid`, `get_referral_reconciliation`. Only authorized tools are registered. SSE sessions are bound to their credential principal. Adjustment and invitation request IDs make retries explicit; paid confirmation requires identical amount, reference and date on repeat calls.

The protected WebApp endpoint is `POST /api/internal/referrals/command` with `{ operation, input, actor }`. Google-signed OIDC tokens must have the configured audience and exact verified Admin service-account email. Actor IDs and permissions come from the authenticated Admin server, never browser-supplied permissions. Scheduler endpoints use a separate configured service identity.

## Configuration and jobs

| Variable                                                   | Service / behavior                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `REFERRAL_PROGRAM_ENABLED`                                 | WebApp, default false; new referral activity                                        |
| `REFERRAL_CAPTURE_ENABLED`                                 | WebApp, default false; anonymous capture                                            |
| `REFERRAL_COMMISSION_ENABLED`                              | WebApp, default false; new commission snapshots                                     |
| `REFERRAL_PORTAL_ENABLED`                                  | WebApp, default false; partner portal access                                        |
| `REFERRAL_MODE`                                            | WebApp, `shadow` default or `live`                                                  |
| `REFERRAL_PILOT_OWNER_IDS`                                 | WebApp, comma-separated owner UUID allowlist; live capture excludes unlisted owners |
| `REFERRAL_INTERNAL_AUDIENCE`                               | WebApp and Admin, exact WebApp OIDC audience                                        |
| `REFERRAL_ADMIN_SERVICE_ACCOUNT`                           | WebApp, exact trusted Admin identity                                                |
| `REFERRAL_SCHEDULER_SERVICE_ACCOUNT`                       | WebApp, exact trusted Scheduler identity                                            |
| `WEBAPP_URL`                                               | Existing Admin variable, WebApp base URL                                            |
| `REFERRAL_MCP_MANAGEMENT_KEY` / `REFERRAL_MCP_FINANCE_KEY` | Admin Secret Manager credentials; distinct from each other and legacy key           |

Keep the existing Clerk, Stripe, notification, fiscal, database and base URL configuration. No additional SGW/Notification Engine secrets are required. Configure Clerk email verification for the partner email-code flow. No referral bank details are stored in these environment variables or applications.

Cloud Scheduler jobs are deployment configuration to create only at the authorized rollout checkpoint, using OIDC and Europe/Lisbon:

| Endpoint `POST /api/internal/referrals/jobs/…` | Suggested schedule                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `drain`                                        | Every five minutes: provider retries, invitations/statements, payment email/fiscal follow-up, Clerk deletion retries |
| `reconcile`                                    | Daily before maturity and monthly close; also after incidents                                                        |
| `mature`                                       | Daily after reconciliation                                                                                           |
| `close`                                        | `0 3 1 * *`; previous calendar month                                                                                 |

Reconciliation independently discovers paid Stripe sessions in its declared creation window and checks all completed local referral snapshots against Stripe, ledger balances, refund/dispute state, settlements and fiscal issuance. It retains mismatch reports and structured failure logs. Provider outages cannot create a clean report. Refresh reconciliation within 48 hours before approving or paying a statement. Investigate failed inbox/outbox rows and stale leases; do not manually replay transfers or edit ledger rows.

Notification templates: `referral-invitation`, `referral-statement`, `referral-payment-confirmation`, each in HTML/text/subject for all five locales. Variables: `name`, `portalUrl`, `amount`, `periodEnd`. Entity identity is outbox ID plus membership ID. `credits-added` is deduplicated per payment order. Delivery acknowledgement means accepted by Notification Engine, not bank transfer or mailbox receipt.

## Migration, rollout and rollback

Database checkpoint completed on 2026-09-11: full Cloud SQL backup 1789159808627 succeeded; core 0039–0043 and Admin referral/ownership migrations are applied; notification/workflow journals were reconciled against verified existing schema. See [the database operation record](REFERRALS_DATABASE_MIGRATION_2026-09-11.md). Deployment, external validation and activation below remain pending.

1. Review WebApp generated migrations `0039`–`0043`, custom invariants in `0041`, and snapshot/journal changes. Check `btree_gist` support, normalized promo-code collisions and existing financial FK names. Use a backup and the service's approved migration process. The normal development DB is production-shared: never run local fixtures there.
2. Admin's generated migration directory is ignored by the repository. The reviewed, referral-only generated SQL is preserved in `mythoria_admin/scripts/referral-roles.sql`. Apply it to `backoffice_db` through the existing reviewed SQL procedure, not a blind replay of ignored historical migrations. Grant explicit manager role rows with a recorded grantor. No roles are seeded automatically.
3. Synchronize upstream schema mirrors, deploy schema-compatible services with flags off, deploy notification templates, and provision distinct OIDC/MCP identities. Verify health and deny-by-default permissions.
4. Configure jobs and Stripe test webhook events, enable shadow capture/commission in the test environment, and complete the matrix below. Stripe sandbox, Clerk invitations and notification delivery need their isolated test configuration; do not use real bank transfers or production recipients.
5. Run seven consecutive clean shadow days. Check provider counts, commission basis, duplicated/missing events, refunds/disputes, fiscal issuance, settlement sums and retry queues daily. Record evidence; seven reports generated on one day are not seven days.
6. Obtain the explicit pilot activation decision, set the live owner allowlist and flags, and verify the real consumer journey and finance handoff. Historical shadow rows remain shadow and cannot enter settlements.

Rollback: disable capture/commission/program flags for new activity and hide the portal if needed. Keep webhook processing, provider reconciliation and outbox retries alive for orders already captured. Do not drop financial tables or restore a pre-ledger database snapshot over later payments. Invalidate unpaid statements via review/adjustment and investigate before resuming.

## Validation and remaining rollout evidence

Local unit suites cover policy arithmetic, DST month boundaries, consent compatibility, authenticated story ownership, MCP credential separation, and 45 rendered localized referral email files. The isolated PostgreSQL integration suite exercises concurrency, code uniqueness and first-use immutability, rate overlap prevention, immutable snapshots and ledger, idempotent accrual/settlement/payment, refund carryover, blocked totals, prospective reassignment, funnel dedupe, suspension and financial deletion restrictions.

Run `scripts/referral-integration.ts` with `REFERRAL_TEST_DATABASE_URL` pointing to a prepared disposable database named `referral_test*` on loopback port 55439. The script rejects remote hosts and other database names, never loads dotenv, and intentionally leaves fixture rows for inspection. Provision the baseline plus new migrations first. Do not use a real Stripe or notification configuration for fixture runs.

`scripts/referral-stripe-sandbox.ts` additionally requires an `sk_test_` Stripe key and the same isolated database guard. It stubs email/fiscal delivery, creates an unpaid Checkout Session and a separate successful test PaymentIntent, verifies that the latter cannot complete the unpaid session, then exercises domain completion with a local fixture and real sandbox refunds. Locally signed event fixtures test replay, not Stripe webhook transport or hosted Checkout completion. Completed sandbox payments were fully refunded and unused sessions expired. See [the implementation record](REFERRALS_IMPLEMENTATION.md) for dated validation and outstanding release evidence.

Release matrix still requires external test evidence: OTP invite acceptance and membership switching/revocation; desktop/mobile keyboard flows in every locale; consent accepted/rejected/revoked across auth; Stripe checkout success/cancel/network retry and duplicate/out-of-order signed webhooks; partial/full/multiple refunds and dispute won/lost after payout; fiscal failure/recovery; settlement month-end and minimum boundaries; account deletion with retained ledgers; and controlled notification retries. Production migrations, publishing/deployment, seven-day shadow observation and pilot activation remain separate explicit rollout checkpoints.
