const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const getDatabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCI = process.env.CI === 'true';

  if (isProduction && process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  if (isCI) {
    return {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mythoria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
};

async function createStoryRatingsTable() {
  const pool = new Pool(getDatabaseConfig());
  
  try {
    console.log('Connecting to database...');
    await pool.connect();
    
    console.log('Reading SQL file...');
    const sqlPath = path.join(__dirname, 'create-story-ratings-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL...');
    await pool.query(sql);
    
    console.log('✅ Story ratings table created successfully!');
  } catch (error) {
    console.error('❌ Error creating story ratings table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createStoryRatingsTable();
