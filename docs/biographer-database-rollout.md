# Biographer database recovery and testing plan

Prepared 2026-11-17 on `codex/biographer-production-migration-recovery`, in
`/Users/andreaperavieira/Developer/Mythoria/biographer-phase-1/mythoria-webapp`.
This document records the original preparation plan. The user subsequently authorized execution: `0050` is now applied. See the [execution record](biographer-migration-applied-2026-11-17.md) and [local testing guide](biographer-local-testing.md). Production application deployment and public feature activation remain off.

## What the investigation established

The previously unmatched production ledger entry is legitimate:

| Evidence                                        | Value                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Production ledger ID                            | `127`                                                              |
| Journal timestamp                               | `1794870554717`                                                    |
| Migration                                       | `0049_openai_ads_conversions`                                      |
| SHA256                                          | `17b86a084750860cc2d27ff1dd57650b250f85b05dcf3756f907ec71aa4c0203` |
| Introducing master commit                       | `69c0a94a0016321718f559dbed7d5a5482e588f4`                         |
| Master incorporated into this working directory | `f6508e3e`                                                         |

The checksum matches the production record exactly. The original feature branch was behind master and independently generated a different `0049`, with a timestamp before the Ads migration. Drizzle therefore skipped the missing Biographer foundations and would have started a dependent migration. This was a branch-history collision, not evidence of an unidentified production write.

The original `0049_biographer_phase_one` through `0056_biographer_session_expiry` had no matching applied records or public Biographer objects in the checked shared database. They have been replaced **only on this recovery branch**. Their SQL remains in the earlier feature branches for history. Do not use those old branches to migrate. If another environment has applied any original feature migration, stop: this consolidated recovery is not its upgrade path.

Master's deployed migrations `0000–0049`, including the Ads SQL and snapshot, are preserved. No production ledger entry is deleted, renamed, backdated or fabricated. Historical discrepancies for `0010`, `0011`, `0017`, `0022` and `0028` remain a separate audit; this change does not rerun or rewrite them.

## The new migration sequence

Run `npm run db:generate -- --name biographer_complete` against the merged schema and master's `0049` snapshot. This generated:

- `0050_biographer_complete`, journal timestamp `1794923488014`.
- SQL SHA256 `0f531d4392cbafcd9b18f20b63ee80687a1f758c77048f760947fddbf1ba4350`.
- Ten new tables, 17 foreign keys, three named unique indexes, and the `contextual-storyteller` enum value.

The migration creates the **final schema for both phases**. Collaboration stays off during single-author testing. It does not update/delete customer rows, alter existing columns, drop existing tables or replace existing indexes. It avoids the former incremental `payload NOT NULL` change by creating that column correctly from the beginning.

The only existing tables referenced by new foreign keys are `authors` and `stories`. PostgreSQL must acquire locks on them; writes can briefly wait. An additive migration is not a zero-downtime guarantee. The enum is added transactionally and must not be used in data writes until commit.

### Guarded migration tool

`npm run db:biographer` is **read-only by default**. It checks the pinned SQL hashes, journal ordering, exact production head, Ads baseline objects, required referenced keys and absence of any partial Biographer schema. Changed SQL/history, an already-applied migration, partial objects or a different head cause refusal.

The separately activated apply path:

1. Requires `--apply`, exact `--confirm-database` and an operator-supplied `--backup-id`.
2. Pins `search_path=public`; configures a 2-second lock timeout and 30-second statement timeout.
3. Opens one transaction with a 60-second transaction timeout and 15-second idle-in-transaction timeout.
4. Takes a cooperative advisory lock and exclusive migration-ledger lock, then rechecks the state.
5. Runs only the pinned `0050` SQL, inserts its real checksum/timestamp, verifies expected tables/columns/validated FKs/indexes/enum and its ledger record, and commits.
6. Rolls back on errors before commit. If the connection disappears around commit, use read-only postflight to determine the outcome; do not blindly retry.

**The backup reference is recorded, not verified by this tool.** An operator must verify success, freshness and the recovery procedure separately. The tool's catalog postflight checks object names/presence; pinned generated SQL and the offline rehearsal establish definitions. It does not compare every live type/default/index predicate or verify application-role grants.

**Freeze other deployments and migration commands during the window.** An advisory/ledger lock does not stop a generic Drizzle process that already read the old head. Do not run `db:migrate`, `db:push`, `db:reset`, `db:setup`, seeds or fixture suites against the shared database as an alternative to this tool.

## Validation without another Cloud SQL database

A new Google Cloud SQL instance or database is not required. Use free local PostgreSQL for destructive tests, then a controlled manual smoke test on the existing shared database after a separately approved migration.

The prepared offline rehearsal uses temporary PGlite, an embedded PostgreSQL 17.5 engine. It never imports production environment files, a network PostgreSQL client or production data. Reproduce it with:

```sh
npm install --prefix /private/tmp/mythoria-biographer-pglite --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.4.6
npm run db:biographer:rehearse -- --pglite-module=/private/tmp/mythoria-biographer-pglite/node_modules/@electric-sql/pglite
```

This builds a synthetic master schema from the snapshot, adds a synthetic author/story, executes the exact migration and verifies:

- The generated SQL matches the master-to-feature snapshot difference.
- All ten tables and 17 validated foreign keys are created.
- An injected error rolls back the new enum, tables and ledger insert.
- An existing synthetic story remains unchanged.
- The owner-only unique index rejects a second owner but permits multiple contributors; contributor consent remains nullable.

Two pre-existing snapshot index predicates serialize `true` as `$1`; the rehearsal normalizes only those synthetic master-baseline predicates to match the existing `0017` SQL. The new migration is executed unchanged.

This is SQL execution evidence, **not a Cloud SQL or concurrent-session rehearsal**. Production is PostgreSQL 17.10. Real locks, migration-role/runtime-role permissions, callback connectivity and provider behavior need their own checks. For automated end-to-end fixtures and concurrent sessions, use PostgreSQL 17 on this Mac (Docker or Homebrew) with synthetic data and isolated storage/provider mocks; it has no additional Google database charge. Do not copy the production environment file into the local test setup or restore customer data to it.

## Controlled rollout on the existing shared database

1. **Prepare locally.** Review this branch, keep public feature activation off, pass lint/type checks/unit tests and the offline rehearsal. Verify no original feature migration was applied elsewhere. Record the exact `0050` checksum above.
2. **Agree a quiet window and freeze deploys/migrators.** Keep the current production app running. Neither database restart nor an app deployment is part of this migration. Inspect current locks and long transactions again; an earlier quiet snapshot is not a future guarantee.
3. **Establish recovery.** The observed latest successful backup completed 2026-11-17 at 01:38:32 UTC, with retention configured to 15 backups; PITR was disabled. Obtain/verify a fresh successful backup and a documented recovery decision before applying. Backup storage may cost money; this does not provision another database. Enabling PITR is a separate infrastructure decision, not included here.
4. **Repeat read-only preflight from this exact directory.** The following command was verified against the shared production database, without `--apply`:

   ```sh
   npm run db:biographer -- --env-file=/Users/andreaperavieira/Developer/Mythoria/mythoria-webapp/.env.local
   ```

   Expected: exact `0049` head, Ads baseline present, no Biographer schema, and only `0050_biographer_complete` pending. Stop on any refusal and investigate; do not bypass the pinned guards.

5. **Apply only after separate authorization.** The future command shape is below. The environment file must deliberately target the verified existing instance. Replace the backup placeholder with the independently verified backup ID. Do not execute this as part of plan preparation:

   ```sh
   npm run db:biographer -- --env-file=/secure/path/to/migration.env --apply --confirm-database=mythoria_db --backup-id=VERIFIED_SUCCESSFUL_BACKUP_ID
   ```

6. **Verify and release the freeze.** Run read-only `npm run db:biographer -- --env-file=/secure/path/to/migration.env --postflight`. Verify runtime WebApp/Admin/SGW roles have the required grants on the new objects; the migration role owns new objects. Confirm existing sign-in, story read/create and payment/Ads paths remain healthy. Keep all Biographer public activation off.
7. **Test single-author interviewing locally.** Use the existing shared database only for a deliberate manual smoke test with a dedicated test author; a test author does not isolate the database. Run the WebApp and SGW feature worktrees locally, enable `BIOGRAPHER_ENABLED=true` locally and leave production flags unchanged. Keep `BIOGRAPHER_COLLABORATION_ENABLED=false`. Start with text/save/resume and refresh recovery; then one short Gemini 3.8 Live avatar conversation, pause/reconnect and retained transcript/audio checks. Confirm private GCS IAM/prefixes, exact allowed origins, callback secret/reachability, ADC/project/model/avatar access and a small provider budget first. Never point cleanup at the production bucket.
8. **Separate book-generation testing.** Initially stop before proposal approval/generation. Approval creates a shared private story; generation can debit real credits, publish to production queues, write generated assets, trigger notifications and ad/analytics events. Configure separate local service endpoints and test recipients, and explicitly review queue/storage/payment routes before testing that stage. Merely running the UI on localhost does not isolate those side effects. Never run destructive integration fixtures or automated concurrency tests against the shared database. Live API/storage usage may incur charges even without a new database.
9. **Test collaboration later.** Enable the collaboration flag only locally for dedicated invitees after Phase 1 passes. Check invite claim, return/resume, contributor isolation, owner progress/revision review, exclusions, revoke and closed access. Use real test addresses only, not customers. Each test contribution is real shared-database data.

For actual setup contracts see [biographer.md](biographer.md) and the SGW/Admin feature guides. No new migration for `workflows_db` or `backoffice_db` was identified in the checked feature branches.

## Rollback and remaining limits

Before commit, SQL/timeout/postflight failure aborts the transaction; determine commit state after any connection loss. After a successful commit, the preferred rollback is to turn local feature flags off and leave the additive schema in place. Do not drop the new tables, delete ledger records or try to remove the enum label. Existing app code continues using its existing values. Preserve any test recordings or diagnose failed writes before targeted, reviewed cleanup.

A full backup restore is an emergency operation with downtime/data-loss implications for unrelated writes since the backup; it is not the routine feature rollback. PITR being disabled makes that distinction especially important.

Public launch remains blocked on the unfinished automatic cancellation/refund handling for paid-book source deletion and the real provider/mobile/full-book checks listed in [biographer-validation.md](biographer-validation.md). A successful database migration alone does not establish launch readiness.

## Primary references

- [PostgreSQL 17 ALTER TABLE and lock requirements](https://www.postgresql.org/docs/17/sql-altertable.html).
- [PostgreSQL 17 connection defaults and timeouts](https://www.postgresql.org/docs/17/runtime-config-client.html).
- [PostgreSQL 17 enum changes](https://www.postgresql.org/docs/17/sql-altertype.html).
- [PGlite local embedded PostgreSQL](https://pglite.dev/docs/).
- [Cloud SQL backup and recovery overview](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups).
