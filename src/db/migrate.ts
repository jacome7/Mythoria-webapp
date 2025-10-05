import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
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
    max: 1, // Use only 1 connection for migrations
  });

  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
