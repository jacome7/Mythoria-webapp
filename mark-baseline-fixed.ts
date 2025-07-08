import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

async function markBaselineAsApplied() {
  console.log("🔄 Marking baseline migration as applied...");
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === "production" 
      ? {
          rejectUnauthorized: true,
          ca: process.env.DB_SSL_CA,
          key: process.env.DB_SSL_KEY,
          cert: process.env.DB_SSL_CERT,
        }
      : { rejectUnauthorized: false },
    max: 1,
  });
  
  const db = drizzle(pool);
  
  try {
    // Insert the baseline migration record
    await db.execute(sql`
      INSERT INTO drizzle_migrations (hash, created_at) 
      VALUES (
        md5('0000_consolidated_baseline'), 
        EXTRACT(EPOCH FROM NOW()) * 1000
      )
      ON CONFLICT (hash) DO NOTHING
    `);
    
    // Show current migration status
    const migrations = await db.execute(sql`
      SELECT hash, created_at 
      FROM drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log("📋 Current migration status:");
    for (const migration of migrations.rows) {
      console.log(`  - ${migration.hash} (${new Date(Number(migration.created_at))})`);
    }
    
    console.log("✅ Baseline migration marked as applied");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

markBaselineAsApplied();
