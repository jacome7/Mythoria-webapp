# Referral welcome email: local validation, 2026-09-13

This records the initial local implementation checkpoint. No production deployment, Cloud Scheduler changes, shared database migrations or real email delivery was performed at that checkpoint. The subsequent authorized deployment, formatting fixes, scheduler activation and approved invitation delivery are recorded in the [production release record](referral-welcome-release-2026-09-13.md).

## Results

| Check                                                    | Result                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| WebApp lint/typecheck                                    | Passed                                                                                                |
| WebApp full unit suite                                   | 706 passed; 13 existing skipped tests                                                                 |
| WebApp production build                                  | Passed; 221 static pages generated                                                                    |
| WebApp locale parity and environment parity              | Passed                                                                                                |
| Notification Engine lint/typecheck/full unit suite/build | Passed; 70 tests                                                                                      |
| Notification Engine environment parity                   | Passed                                                                                                |
| Changed-file formatting and Git whitespace checks        | Passed; plain-text invitation paragraphs intentionally excluded from Glimmer formatting               |
| Welcome integration                                      | Passed on disposable local PostgreSQL clone, port 55439, mock notifications and outbound HTTP blocked |
| Email previews                                           | All five locales rendered at 390px and 900px with no horizontal overflow; HTML and plain text checked |

The integration test exercised real transactions and outbox transitions: normalized member deduplication, contact-only exclusion, Admin UI/MCP creation, rollback after invitation insertion, current versus future commission rates, additional invitations/resend request deduplication, suspended owner/inactive code deferral, provider failure/retry, completion without repeated sends and cancellation on closure. The deliberately simulated provider failure emitted the expected structured `notification_failed` retry log. The temporary clone and role were removed, and the local test cluster was stopped afterwards.

The sandbox initially blocked Next.js/tsx/Chromium subprocess creation. The affected checks passed when rerun with the required local subprocess permissions. WSL's systemd cluster start failed; the existing local PostgreSQL test cluster started directly and was stopped after testing. These were local execution issues, not application production errors.

## Existing formatting findings

Repository-wide formatting is not clean outside this change. WebApp reports `docs/referrals-records/referral-backup-2026-09-11.json` and `src/types/translation-keys.d.ts`. Notification Engine reports the 30 existing statement/payment-confirmation subject, HTML and text templates across five locales. Those files were not changed. Every changed source/Markdown/HTML/subject file passes the relevant formatter. The five invitation text templates preserve deliberate plain-text paragraph boundaries: the HTML/Glimmer formatter collapses them, so they have a narrowly scoped ignore rule and rendering tests instead.

## Production checkpoint

Deploy Notification Engine before WebApp, sequentially, only when authorized. Verify the actual serving revisions, image identity, traffic and health. Verify or provision the five-minute OIDC referral outbox drain with the existing configured audience and scheduler identity. Use one separately approved test recipient and confirm inbox receipt; mock acceptance and browser previews are not Gmail delivery or cross-mail-client evidence. Commission feature flags and owner allowlists remain a separate activation checklist.

See the [operating guide](referrals.md#referral-owner-welcome-email-2026-09-13) for the delivery contract and isolated test command.
