# Referral platform implementation record

> Historical record. For the current release status, see [the production release record](../referrals-release-2026-09-12.md).

Updated 2026-09-11. Approved scope: complete referral v1, documentation, and the five-language partner FAQ. Local implementation is delivered. The authorized database backup and migrations are complete; application deployment and pilot activation remain pending. See [the database operation record](REFERRALS_DATABASE_MIGRATION_2026-09-11.md).

## Delivery checklist

- [x] Canonical schema and reviewable migrations 0039–0043
- [x] Referral domain, financial ledger, settlements, reconciliation
- [x] Customer capture, consent, profile, checkout, story attribution
- [x] Admin permissions, APIs, pages, MCP principals and tools
- [x] Partner OTP portal, reporting, printable statement detail, 14 FAQ answers in five locales
- [x] Forty-five notification template files and story-generation reporting
- [x] Cross-service/service documentation, privacy copy and canonical KnowledgeBase documents
- [x] Changed-file formatting, lint, typecheck, build, tests, locale and environment checks
- [x] Isolated PostgreSQL and bounded Stripe sandbox API validation
- [ ] Hosted Checkout, Clerk OTP and controlled external notification end-to-end matrix
- [ ] Baseline dependency security remediation before release
- [x] Full Cloud SQL backup and reviewed production migrations (2026-09-11)
- [ ] Application deployment, seven-day shadow validation, explicit pilot activation

## Boundaries

The normal development database is shared with production. Never run reset,
push, seed or integration fixtures against it. Reviewed migrations were applied
on 2026-09-11 following explicit authorization and a successful full backup. No commit, push,
deployment, external invitation, real transfer, or pilot activation is implied by
local development. Preserve the existing untracked WebApp attachments directory.

The existing Notification Engine `.env.production` edit was preserved. Stripe
sandbox objects created for this task were fully refunded/expired; no live payment
or customer notification was sent.

## Validation evidence

| Service                   | Passed suites | Passed tests | Gates                                                                                                        |
| ------------------------- | ------------: | -----------: | ------------------------------------------------------------------------------------------------------------ |
| WebApp                    |           116 |          677 | Changed-file format, lint with zero warnings, typecheck, production build, locale parity, environment parity |
| Admin                     |            17 |           75 | Changed-file format, lint, typecheck, production build, environment parity                                   |
| Story Generation Workflow |            43 |          220 | Changed-file format, lint, typecheck, build, environment validation                                          |
| Notification Engine       |            17 |           64 | Changed-file format, lint, typecheck, build, environment validation/parity, localized template rendering     |

Total: 1,036 passing unit tests. WebApp retains two existing skipped suites
(FAQ Service and deprecated webhook route), containing 13 skipped tests. They are
excluded from the passing count. The full external Playwright matrix was not run
against the production-shared development configuration.

PostgreSQL 16 isolation: WSL Ubuntu-24.04, cluster `referral-test`, loopback port
55439, database `referral_test_verified`. The baseline schema was exported from
WebApp commit `64c577adda09db7ac8df97979ecead054ea74d28`; migrations 0039–0043 then
applied with `ON_ERROR_STOP=1`. Historical migrations cannot bootstrap an empty
database. Two export-only partial-index placeholders were resolved to their
declared boolean values in the fixture. Production SQL was not altered to fit the
fixture. PostgreSQL emitted identifier-length notices but no migration errors.

The domain integration script passed concurrent duplicate accrual, settlement and
paid confirmation; shared code conflicts/first-use immutability; overlapping terms
rejection; immutable payment/story snapshots and ledger; prospective reassignment;
partial-refund carryover; late refunds invalidating unpaid statements; shadow
exclusion; unknown-total blocking; cancelled-commission adjustment rejection;
owner-scoped statement reads; funnel deduplication; suspension; and financial
deletion restrictions. Admin's reviewed role SQL also applied to separate
`referral_test_admin` with a minimal UUID manager-table fixture.

From WebApp, supply `REFERRAL_TEST_DATABASE_URL`, then run
`npx.cmd tsx scripts/referral-integration.ts`. Only loopback port 55439 and database
names beginning `referral_test` are accepted. Fixture rows remain locally for
inspection. Start the cluster with
`wsl.exe -d Ubuntu-24.04 -u root -- pg_ctlcluster --skip-systemctl-redirect 16 referral-test start`
and stop it after use. Never substitute the ordinary application database URL.

`scripts/referral-stripe-sandbox.ts` used test credentials, local database fixtures
and fiscal/email stubs. It verified actual Checkout amount retrieval, a successful
separate test PaymentIntent, unpaid-session safety, locally signed event replay,
concurrent domain completion with one credit grant/commission, and actual
partial/full refund retrieval. Both test PaymentIntents were fully refunded and
both unused sessions expired. This does not establish hosted Checkout completion,
webhook delivery transport, external fiscal issuance or mailbox receipt.

An npm security audit reports 27 WebApp dependency findings (15 moderate, 11 high,
1 critical, including Next.js). Auditing the unmodified HEAD package manifest and
lock in isolation returned the same counts and affected package names: these
findings predate this feature, and the Winston addition introduced no newly
reported affected package. Framework/dependency security remediation remains a
release prerequisite; passing lint/build/tests does not clear these findings.

## Remaining release matrix

1. Isolated Clerk/Stripe/notification configuration: invited account creation,
   email OTP, verified-email matching, membership switching/revocation and
   cross-owner denial.
2. Desktop/mobile keyboard flows in all five locales: consent accepted/rejected/
   revoked across authentication, profile changes, filters, statements and FAQ.
3. Hosted Checkout success/cancel/network retry and genuine duplicate/out-of-order
   webhook delivery; repeated refunds and dispute won/lost after payout.
4. Fiscal failure/recovery, notification retries/delivery, account anonymization,
   month-end/minimum boundaries and approved deployment/security review.
5. Production migration/deployment/jobs/identities with flags off, seven consecutive
   clean shadow days, then explicit pilot activation. Shadow history remains
   permanently excluded from live payouts.

## Documentation

The cross-service guide is `docs/REFERRALS.md`. Each service has
`docs/referrals.md`, linked from its README, AGENTS and relevant existing API,
architecture, deployment or service documentation. The specification, operational
guide and this validation record are mirrored under canonical Ubuntu KnowledgeBase
`concepts/growth` and the Windows KnowledgeBase document copies.

## Confirmed policies

10% default, versioned negotiated rates, full Stripe Checkout amount_total,
EUR credit purchases, latest consented anonymous link, 90 days, persistent account
association, explicit prospective replacement, 30-day hold, EUR 20 minimum,
monthly close at 03:00 Europe/Lisbon on the first. Suspension retains associations.
Bank details remain external. Referral consent is independent from GA4. Financial
retention follows the existing ten-year policy with legal holds. WebApp owns the
domain; Admin UI and MCP share its authenticated API. MCP finance credentials are
separate. Shadow entries can never become live payable commissions.
