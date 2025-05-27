import { Pool } from "pg";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

async function resetDatabase() {
  console.log("🗑️ Resetting database - dropping all tables...");
  
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
  });
  
  try {
    // Drop all tables and types in the correct order (considering foreign key constraints)
    const dropQueries = [
      // Drop tables that reference other tables first
      'DROP TABLE IF EXISTS story_characters CASCADE;',
      'DROP TABLE IF EXISTS shipping_codes CASCADE;',
      'DROP TABLE IF EXISTS payments CASCADE;',
      'DROP TABLE IF EXISTS payment_methods CASCADE;',
      'DROP TABLE IF EXISTS addresses CASCADE;',
      'DROP TABLE IF EXISTS story_versions CASCADE;',
      'DROP TABLE IF EXISTS events CASCADE;',
      'DROP TABLE IF EXISTS credits CASCADE;',
      'DROP TABLE IF EXISTS characters CASCADE;',
      'DROP TABLE IF EXISTS stories CASCADE;',
      'DROP TABLE IF EXISTS authors CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;', // Drop old users table if it exists
      
      // Drop custom types
      'DROP TYPE IF EXISTS story_status CASCADE;',
      'DROP TYPE IF EXISTS address_type CASCADE;',
      'DROP TYPE IF EXISTS payment_provider CASCADE;',
      
      // Drop the drizzle migration table
      'DROP TABLE IF EXISTS __drizzle_migrations CASCADE;'
    ];
    
    for (const query of dropQueries) {
      try {
        await pool.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        // Ignore errors for tables that don't exist
        console.log(`ℹ️ Skipped: ${query} (table/type doesn't exist)`);
      }
    }
    
    console.log("✅ Database reset completed successfully!");
    
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
