# Referral owner welcome release — 2026-09-13

This release publishes the expanded five-language owner welcome and durable invitation delivery behavior. Notification Engine is deployed first, followed by WebApp. Admin and Story Generation Workflow do not require deployments for this change. No database migration or new secret is required.

## Validation

Both repositories passed format, lint, typecheck, production build, full unit suites and environment parity. WebApp locale parity passed. Unit totals: WebApp 706 passed, Notification Engine 70 passed; WebApp retains 13 existing skipped tests. Isolated local PostgreSQL integration passed with mock email and blocked outbound HTTP, including transaction rollback, Admin/MCP creation, current/future rates, invitation deduplication and outbox retry/completion/cancellation. The fixture now sets explicit due times to avoid Windows/WSL clock differences.

The pre-existing formatting findings from the earlier [local validation record](referral-welcome-validation-2026-09-13.md) were resolved for this release. Plain-text referral templates retain intentional paragraph boundaries and are excluded from HTML/Glimmer formatting; their rendered output remains tested. No unrelated dependency upgrades were made.

## Immutable deployment evidence

| Service             | Source commit                              | Cloud Build                            | Serving revision                |
| ------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------- |
| Notification Engine | `0646cd536cf2b3ce199ef3b73ec4da82b1e73468` | `493fcb2e-bdd0-4a62-85e6-410f147a4855` | `notification-engine-00062-ptg` |
| WebApp              | `8d5565e322c27aa907ad8d5127db126bd73f0aed` | `0f5be482-6c57-4d6b-ba7e-4745274ecc3c` | `mythoria-webapp-00231-2n9`     |

The images were built from archived Git snapshot commits. Final documentation and the operator scheduler setup script are committed afterwards; they do not change application image contents.

Notification Engine was verified Ready at 100% traffic with `/health` returning 200 and its expected source SHA/image digest. Authenticated production previews passed for all five welcome locales and the legacy invitation payload without sending email. An initial preview request with only the API-key header received 401; the retry using the WebApp's normal bearer plus API-key headers passed. The checked new-revision error-log window contained no errors.

WebApp was verified Ready at 100% traffic with `/api/health` returning 200 and the expected source SHA. Production SEO smoke passed for 211 canonical URLs. All four referral enable flags remain true, mode remains live and the RODRI owner allowlist is preserved. Its checked new-revision error-log window contained no errors. These bounded checks do not establish long-term monitoring or validate unrelated paid journeys.

Image digests: Notification Engine `sha256:60ec38eb57103a48743f9673517177b2a04b9eb1294fbc804cfea08045d7dc15`; WebApp `sha256:5dfcb06b76e727e87996c24e5c1732cebb705923cf6e3f225da6b01e0681fcee`.

## Automatic delivery checkpoint

Production inspection found no referral outbox drain schedule and one pending invitation for owner code `RODRI`. The user explicitly approved delivery to that recipient. The schedule was created and enabled, then invoked to process the existing invitation. Notification `da47602b-0ae0-48e1-b8ed-9a9f8a5827d4` is `sent` after one attempt, with code `RODRI`, assigned rate `10%`, provider `Gmail` and provider message ID `1a09cccb9d3711ce`. Gmail acceptance is confirmed; recipient inbox receipt is not independently confirmed. No duplicate invitation was created. The pending outbox is empty, and the following scheduled run succeeded.

The repeatable setup command is `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-referral-drain.ps1`. It creates or updates `mythoria-referral-outbox-drain` to POST every five minutes in Europe/Lisbon, using the configured scheduler service account and exact WebApp OIDC audience. It resumes the job if paused. Review queued work before first activation. This job does not create the separate reconciliation, maturity or monthly-close schedules.
