import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local', quiet: true });

const POSTFLIGHT = process.argv.includes('--postflight');
const EXPECTED_PREVIOUS_MIGRATION = 'drizzle/0037_dizzy_the_hood.sql';
const EXPECTED_CURRENT_MIGRATION = 'drizzle/0038_lethal_baron_zemo.sql';
const EXPECTED_COLUMNS = [
  ['authors', 'email_status'],
  ['authors', 'email_status_updated_at'],
  ['authors', 'acquisition_campaign_recipient_id'],
  ['payment_orders', 'email_campaign_recipient_id'],
] as const;

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false,
  });
  await client.connect();
  try {
    const identity = await client.query(
      `select current_database() as database, inet_server_addr()::text as server_address,
              current_schema() as schema`,
    );
    const columns = await client.query(
      `select table_name, column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and (table_name, column_name) in (
           ('authors', 'email_status'),
           ('authors', 'email_status_updated_at'),
           ('authors', 'acquisition_campaign_recipient_id'),
           ('payment_orders', 'email_campaign_recipient_id')
         )
       order by table_name, column_name`,
    );
    const counts = await client.query(
      `select
         (select count(*)::bigint from authors) as authors,
         (select count(*)::bigint from payment_orders) as payment_orders`,
    );
    const journal = await client.query(
      `select id, hash, created_at
       from drizzle.__drizzle_migrations
       order by id desc
       limit 3`,
    );
    const expectedMigration = POSTFLIGHT ? EXPECTED_CURRENT_MIGRATION : EXPECTED_PREVIOUS_MIGRATION;
    const expectedHash = createHash('sha256').update(readFileSync(expectedMigration)).digest('hex');
    const foundColumns = new Set(
      columns.rows.map((row) => `${String(row.table_name)}.${String(row.column_name)}`),
    );
    const expectedColumnCount = POSTFLIGHT ? EXPECTED_COLUMNS.length : 0;
    const verified =
      identity.rows[0]?.database === process.env.DB_NAME &&
      columns.rows.length === expectedColumnCount &&
      (POSTFLIGHT ||
        EXPECTED_COLUMNS.every(([table, column]) => !foundColumns.has(`${table}.${column}`))) &&
      journal.rows[0]?.hash === expectedHash;

    console.log(
      JSON.stringify(
        {
          verified,
          phase: POSTFLIGHT ? 'postflight' : 'preflight',
          identity: identity.rows,
          rowCounts: counts.rows,
          columns: columns.rows,
          latestMigrations: journal.rows,
          expectedMigration,
        },
        null,
        2,
      ),
    );
    if (!verified) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
