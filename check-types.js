const { Pool } = require('pg');
const { getDatabaseConfig } = require('./src/lib/database-config.ts');

async function checkTypes() {
  const config = getDatabaseConfig();
  const pool = new Pool(config);
  
  try {
    const result = await pool.query("SELECT typname FROM pg_type WHERE typname LIKE '%address%' OR typname LIKE '%credit%';");
    console.log('Existing types:', result.rows);
    
    const enumResult = await pool.query("SELECT enumlabel FROM pg_enum pe JOIN pg_type pt ON pe.enumtypid = pt.oid WHERE pt.typname = 'address_type';");
    console.log('Address type values:', enumResult.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTypes();
