import type { Client } from 'pg';
import type { MigrationPlan } from './biographer-migration-plan';

export async function postflight(client: Client, plan: MigrationPlan) {
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
  for (const [group, expected, actual] of [
    ['tables', plan.tables, tables.rows],
    ['columns', plan.columns, columns.rows],
    ['indexes', plan.indexes, indexes.rows],
    ['foreign keys', plan.foreignKeys, fks.rows],
  ] as const) {
    const names = new Set(actual.map((row) => row.name));
    if (names.size !== expected.length || expected.some((name) => !names.has(name)))
      throw new Error(`Migration postflight ${group} did not match the reviewed schema`);
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
