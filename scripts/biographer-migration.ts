import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import {
  assertPreconditions,
  buildPlan,
  HEAD_TAG,
  MIGRATION_TAG,
  type JournalEntry,
  type MigrationPlan,
} from '../src/lib/biographer-migration-plan';

function args() {
  const values: Record<string, string> = {};
  let apply = false;
  let verify = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === '--apply') {
      if (apply) throw new Error('Duplicate --apply');
      apply = true;
      continue;
    }
    if (arg === '--postflight') {
      if (verify) throw new Error('Duplicate --postflight');
      verify = true;
      continue;
    }
    const match = arg.match(/^--(env-file|confirm-database|backup-id)=(.+)$/);
    if (!match || values[match[1]]) throw new Error('Invalid or duplicate argument');
    values[match[1]] = match[2];
  }
  if (apply && verify) throw new Error('Invalid combination of --apply and --postflight');
  if (apply && (!values['confirm-database'] || !values['backup-id']))
    throw new Error('Apply requires --confirm-database and --backup-id');
  if (!apply && (values['confirm-database'] || values['backup-id']))
    throw new Error('Confirmation options require --apply');
  return { apply, verify, values };
}

async function inspect(client: Client, plan: MigrationPlan) {
  const baseline = await client.query<{ ready: boolean }>(
    `SELECT to_regclass('public.ad_conversion_outbox') IS NOT NULL
      AND (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND
        ((table_name='analytics_attributions' AND column_name IN ('oppref','oppref_captured_at','obref'))
        OR (table_name='product_generation_requests' AND column_name='ad_context'))) = 4
      AND EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
        JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'
        AND t.typname='literary_persona' AND e.enumlabel='storyteller') AS ready`,
  );
  if (!baseline.rows[0].ready) throw new Error('Required applied master schema is missing');
  const ledger = await client.query<{ hash: string; created_at: string }>(
    'SELECT hash, created_at FROM drizzle.__drizzle_migrations',
  );
  const objects = await client.query<{
    name: string;
  }>(`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'biographer\\_%' ESCAPE '\\'
    UNION SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname LIKE 'biographer\\_%' ESCAPE '\\'
    UNION SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'biographer\\_%' ESCAPE '\\'`);
  const enums = await client.query(
    `SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='literary_persona' AND e.enumlabel='contextual-storyteller'`,
  );
  const keys = await client.query<{ key: string }>(
    `SELECT c.relname || '.' || a.attname AS key FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=i.indkey[0] WHERE n.nspname='public' AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indpred IS NULL AND i.indexprs IS NULL AND (c.relname,a.attname) IN (('authors','author_id'),('stories','story_id'))`,
  );
  assertPreconditions(
    ledger.rows,
    objects.rows.map((row) => row.name),
    enums.rowCount !== 0,
    keys.rows.map((row) => row.key),
    plan,
  );
}

async function postflight(client: Client, plan: MigrationPlan) {
  const tables = await client.query<{ name: string }>(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname = ANY($1::text[])`,
    [plan.tables],
  );
  const columns = await client.query<{ name: string }>(
    `SELECT c.relname || '.' || a.attname AS name FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname = ANY($1::text[]) AND a.attnum > 0 AND NOT a.attisdropped`,
    [plan.tables],
  );
  const indexes = await client.query<{ name: string }>(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_index i ON i.indexrelid=c.oid WHERE n.nspname='public' AND c.relname = ANY($1::text[]) AND i.indisvalid`,
    [plan.indexes],
  );
  const fks = await client.query<{ name: string }>(
    `SELECT c.relname || '.' || con.conname AS name FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f' AND con.convalidated AND c.relname = ANY($1::text[])`,
    [plan.tables],
  );
  for (const [expected, actual] of [
    [plan.tables, tables.rows],
    [plan.columns, columns.rows],
    [plan.indexes, indexes.rows],
    [plan.foreignKeys, fks.rows],
  ] as const) {
    const names = new Set(actual.map((row) => row.name));
    if (names.size !== expected.length || expected.some((name) => !names.has(name)))
      throw new Error('Migration postflight did not match the reviewed schema');
  }
  const enumResult = await client.query(
    "SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='literary_persona' AND e.enumlabel='contextual-storyteller'",
  );
  if (enumResult.rowCount !== 1) throw new Error('Migration enum postflight failed');
  const result = await client.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations WHERE hash=$1 AND created_at=$2',
    [plan.hash, plan.when],
  );
  if (result.rows[0].count !== '1') throw new Error('Migration ledger postflight failed');
}

async function main() {
  const { apply, verify, values } = args();
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')) as {
    entries: JournalEntry[];
  };
  const plan = buildPlan(
    journal.entries,
    readFileSync(`drizzle/${HEAD_TAG}.sql`, 'utf8'),
    readFileSync(`drizzle/${MIGRATION_TAG}.sql`, 'utf8'),
  );
  const loaded = config({
    path: resolve(values['env-file'] || '.env.local'),
    quiet: true,
    override: true,
  });
  if (loaded.error) throw new Error('Could not load environment file');
  if (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].some((name) => !process.env[name]))
    throw new Error('Required explicit database connection settings are missing');
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true,
            ca: process.env.DB_SSL_CA,
            key: process.env.DB_SSL_KEY,
            cert: process.env.DB_SSL_CERT,
          }
        : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 35000,
    options: `-c search_path=public -c statement_timeout=30000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=15000 -c default_transaction_read_only=${apply ? 'off' : 'on'}`,
  });
  await client.connect();
  try {
    const identity = await client.query<{ db: string; version: string }>(
      "SELECT current_database() AS db, current_setting('server_version_num') AS version",
    );
    if (Number(identity.rows[0].version) < 170000)
      throw new Error('PostgreSQL 17 or newer is required');
    if (apply && identity.rows[0].db !== values['confirm-database'])
      throw new Error('Database confirmation does not match');
    if (verify) {
      await postflight(client, plan);
      console.log(`Postflight passed for ${identity.rows[0].db}; no changes made.`);
      return;
    }
    if (!apply) {
      await inspect(client, plan);
      console.log(
        `Dry run passed for ${identity.rows[0].db}; pending ${MIGRATION_TAG} (${plan.hash}). No changes made.`,
      );
      return;
    }
    await client.query('BEGIN');
    try {
      await client.query(
        "SET LOCAL lock_timeout = '2s'; SET LOCAL statement_timeout = '30s'; SET LOCAL transaction_timeout = '60s'",
      );
      const lock = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_xact_lock(hashtext('mythoria-biographer-migration')) AS acquired",
      );
      if (!lock.rows[0].acquired) throw new Error('Migration advisory lock is held');
      await client.query('LOCK TABLE drizzle.__drizzle_migrations IN ACCESS EXCLUSIVE MODE');
      await inspect(client, plan);
      for (const statement of plan.statements) await client.query(statement);
      await client.query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [plan.hash, plan.when],
      );
      await postflight(client, plan);
      await client.query('COMMIT');
      console.log(
        `Migration committed for ${identity.rows[0].db}; operator-provided backup reference (not verified): ${values['backup-id']}`,
      );
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  // Do not print connection errors: drivers can include connection details.
  console.error(
    error instanceof Error &&
      /^(Unexpected|Incomplete|Partial|Required|Migration |Database confirmation|PostgreSQL|Could not load|Apply requires|Confirmation options|Invalid|Duplicate)/.test(
        error.message,
      )
      ? error.message
      : 'Migration check failed; no successful commit was reported.',
  );
  process.exitCode = 1;
});
