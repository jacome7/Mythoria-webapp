import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local', quiet: true });

const EXPECTED_PREVIOUS_MIGRATION = 'drizzle/0036_common_puck.sql';
const STORY_SHARE_COLUMNS = [
  'story_share_item_id',
  'story_share_method',
  'story_share_scope',
  'story_share_touched_at',
  'story_share_expires_at',
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
      `select column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'analytics_attributions'
         and column_name = any($1::text[])
       order by column_name`,
      [STORY_SHARE_COLUMNS],
    );
    const journal = await client.query(
      `select id, hash, created_at
       from drizzle.__drizzle_migrations
       order by id desc
       limit 3`,
    );
    const expectedPreviousHash = createHash('sha256')
      .update(readFileSync(EXPECTED_PREVIOUS_MIGRATION))
      .digest('hex');
    const latestHash = journal.rows[0]?.hash;
    const verified =
      identity.rows[0]?.database === process.env.DB_NAME &&
      columns.rows.length === 0 &&
      latestHash === expectedPreviousHash;
    console.log(
      JSON.stringify(
        {
          verified,
          identity: identity.rows,
          existingStoryShareColumns: columns.rows,
          latestMigrations: journal.rows,
          expectedPreviousMigration: EXPECTED_PREVIOUS_MIGRATION,
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
