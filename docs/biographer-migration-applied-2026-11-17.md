# Biographer production migration execution record

User explicitly authorized production migration and local setup on 2026-11-17 after reviewing the recovery plan. No application deployment, public Biographer activation or new Cloud SQL database was performed.

## Recovery point and preflight

- Existing instance: `mythoria-db`; database: `mythoria_db`; PostgreSQL 17.10.
- On-demand backup `1794924859426`, operation `46286b66-029c-461a-9fa2-51920000004d`, completed successfully at **2026-11-17 14:15:20 UTC**.
- No active Cloud Build deployment was observed. Final read-only SQL precheck at 14:16:45 UTC found original ledger head ID 127 (`0049_openai_ads_conversions`), no long/blocked transactions and no locks on the inspected existing affected tables. Required schema/reference privileges were present.
- Guarded preflight passed for exactly `0050_biographer_complete`. Existing backup restore was not rehearsed; PITR remains disabled.

## First attempt and verifier repair

The first attempt failed the runner's postflight and rolled back. A separate read-only session confirmed the original ledger head, zero Biographer tables and no new enum value. The ledger sequence consumed an ID during the aborted transaction; a later ID gap is expected and is not a partially applied migration.

Two verifier bugs were corrected locally: the column parser omitted the digit-containing `sha256` name, and expected foreign-key names did not account for PostgreSQL's 63-byte identifier limit. The generated migration SQL and SHA256 did not change. Tests now compare the complete planned column list with the snapshot and cover shortened constraint names. The CLI's exact postflight was extracted and run inside the embedded PostgreSQL rehearsal on both rollback and successful paths before retry.

## Successful application

The unchanged reviewed migration ran through the guarded transaction with 2-second lock, 30-second statement, 60-second transaction and 15-second idle-in-transaction timeouts. The transaction committed, followed by a separate read-only postflight that passed.

| Recorded field                       | Value                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| Migration                            | `0050_biographer_complete`                                         |
| Journal timestamp                    | `1794923488014`                                                    |
| SQL SHA256                           | `0f531d4392cbafcd9b18f20b63ee80687a1f758c77048f760947fddbf1ba4350` |
| Committed production ledger ID       | `129`                                                              |
| Independent catalog check            | 2026-11-17 14:27:17 UTC                                            |
| New tables                           | 10                                                                 |
| Validated foreign keys               | 17                                                                 |
| Blocked transactions at final sample | 0                                                                  |

The checked database role has CRUD access on all new tables. Production homepage and database health endpoint remained HTTP 200 afterward. This does not assert authenticated payment/story-generation acceptance; no real order, customer message or paid book generation was triggered.

Master's applied Ads migration and earlier ledger history were preserved. The migration itself creates new feature objects and adds an enum label; it does not update/delete customer rows. No rollback/drop script was run after commit. Runtime rollback remains feature-off with additive schema retained.

See [local testing](biographer-local-testing.md) for running processes, configuration and the remaining research/local-orchestration limitations.
