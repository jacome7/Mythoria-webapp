# Referral database backup and migration — 2026-09-11

> Historical record. For the current release status, see [the production release record](../referrals-release-2026-09-12.md).

The user-authorized backup and database migration work is complete. Application deployment and referral activation were not performed.

Documentation status: updated records are saved locally. Automatic approval review blocked copying these infrastructure/operational records to the canonical KnowledgeBase at `192.168.1.9`; explicit approval for that document payload and destination is pending. The remote documents remain at their earlier version. This did not block or roll back the completed database work.

## Full backup

- Project: `oceanic-beach-460916-n5`; Cloud SQL instance: `mythoria-db`; PostgreSQL 17; region `europe-west9`.
- Backup **1789159808627**, `ON_DEMAND`, location `eu`, verified **SUCCESSFUL** with `gcloud sql backups describe`.
- Started `2026-09-11T20:50:08.633Z`; completed `2026-09-11T20:51:19.610Z`, before the first migration write.
- Operation `d515a7da-e5cc-48c3-a0f9-77390000004d`; description `before-referral-migrations-2026-09-11`.
- Full-instance coverage includes `mythoria_db`, `backoffice_db`, `workflows_db` and `notification_engine_db`. This is a managed backup, not a local SQL export. No restore rehearsal was performed.
- Existing backup settings were preserved. Point-in-time recovery was reported disabled and was not enabled by this operation.

## Migration results

| Database                 | Result                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mythoria_db`            | Applied WebApp 0039–0043 through its native migrator; verified exact journal hashes.                                                                                                                                          |
| `backoffice_db`          | Applied generated/reviewed 0007 referral roles and recorded its hash; applied 0008 ownership-only migration through the native migrator.                                                                                      |
| `notification_engine_db` | Generated 0004_colorful_darkstar. Its varchar(255) column and exact unique pending/retry index already existed. Verified both, recorded the exact hash and ran the native migrator successfully without rebuilding the index. |
| `workflows_db`           | No newly generated schema changes. Verified existing enum labels for historical 0004/0005, recorded their missing hashes, and ran the native migrator successfully.                                                           |

Admin generation incorrectly included WebApp-owned credit tables. Removed the credit schema from Admin's generation inputs. The resulting generated removal was reviewed and converted to an ownership-only `SELECT 1` migration: **no table or data was dropped**. The legacy backoffice `author_credit_balances` table remains intact. Regeneration now reports no changes.

Admin's historical 0003–0006 files contain cross-database credit/pricing operations and already-existing manager/campaign objects. They were not replayed or falsely registered. The reviewed referral migration was applied directly and its actual journal entry advances the migrator past that obsolete mixed-ownership history. Do not reset the journal or blindly replay those files.

The workflow enum migrations are conditional and leave existing labels in place. Their labels already existed; their existing enum ordering was preserved.

Admin ignores its `drizzle` directory. Portable reviewed SQL is retained in `scripts/referral-roles.sql` and `scripts/referral-schema-ownership.sql`. Include the local generated journal/snapshots in deployment artifacts. Notification Engine ignores JSON broadly; its local `drizzle/meta/_journal.json` and `0004_snapshot.json` must accompany its generated SQL.

## Verification

- Verified database identity against the Cloud SQL endpoint before writes and backup success before migration.
- Core migration hashes 0029–0038 matched before migration. New migration hashes match live journals; exact hashes are in the companion preflight/catalog/postflight JSONL evidence.
- All four owned-schema generators report no additional changes. All four native migrators completed successfully.
- Eleven referral/promotion triggers enabled, three custom financial/exclusion constraints validated, twelve restrictive financial foreign keys present.
- Zero invalid public indexes across all four databases.
- Core counts unchanged: **885 authors, 204 payment orders, 817 stories**.
- Public catalog counts: core 40 → 58; backoffice 13 → 14; workflows unchanged at 3; notification unchanged at 9, including extension views.
- Admin lint, typecheck and environment parity passed after the configuration correction.
- A post-migration Cloud Logging query returned no ERROR-or-higher Cloud Run entries within its ten-minute window. This is a bounded observation, not end-to-end validation.
- No production fixtures, customer messages, real transfers, commits, pushes, application deployments or pilot activation were performed.

Evidence beside this record: `referral-backup-2026-09-11.json`, `referral-migration-preflight-2026-09-11.jsonl`, `referral-migration-catalog-2026-09-11.jsonl`, and `referral-migration-postflight-2026-09-11.jsonl`. These contain schema/aggregate evidence, not exported customer rows or credentials.

## Compatibility and next checkpoint

The restrictive foreign keys prevent the old account-deletion code from deleting financial records. Deploy the updated WebApp anonymization flow before treating deletion as fully operational for users with financial history. This consequence was reported before applying migrations.

Remaining work: application/security release preparation, external end-to-end validation, configured jobs and identities, seven consecutive clean shadow days, and explicit pilot activation. No backup restore was attempted; recovery would require a separate decision because all databases share the production instance.
