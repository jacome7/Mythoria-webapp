import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function markBaselineAsApplied() {
  try {
    console.log('🔄 Marking baseline migration as applied...');
    
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
    
    console.log('📋 Current migration status:');
    for (const migration of migrations.rows) {
      console.log(`  - ${migration.hash} (${new Date(Number(migration.created_at))})`);
    }
    
    console.log('✅ Baseline migration marked as applied');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

markBaselineAsApplied();
