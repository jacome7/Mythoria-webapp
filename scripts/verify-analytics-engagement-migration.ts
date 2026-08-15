import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local', quiet: true });

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
      `select current_database() as database, inet_server_addr()::text as server_address`,
    );
    const columns = await client.query(
      `select table_schema, table_name, column_name, data_type
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'analytics_attributions'
         and column_name = 'engagement_time_msec'`,
    );
    const journal = await client.query(
      `select id, created_at from drizzle.__drizzle_migrations order by id desc limit 3`,
    );
    console.log(
      JSON.stringify(
        { identity: identity.rows, columns: columns.rows, journal: journal.rows },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
