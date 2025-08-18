import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: true,
          ca: process.env.DB_SSL_CA,
          key: process.env.DB_SSL_KEY,
          cert: process.env.DB_SSL_CERT,
        }
      : { rejectUnauthorized: false },
    max: 1,
  });

  const client = await pool.connect();
  try {
    console.log('Dropping columns html_uri and pdf_uri from stories (IF EXISTS)...');
    await client.query('BEGIN');
    await client.query('ALTER TABLE "stories" DROP COLUMN IF EXISTS "html_uri"');
    await client.query('ALTER TABLE "stories" DROP COLUMN IF EXISTS "pdf_uri"');
    await client.query('COMMIT');

    // Verify columns are gone
    const { rows } = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'stories' AND column_name IN ('html_uri','pdf_uri')"
    );
    if (rows.length === 0) {
      console.log('Success: Columns html_uri and pdf_uri are not present.');
    } else {
      console.warn('Warning: Some columns still present:', rows.map(r => r.column_name));
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error while dropping columns:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
