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
    console.log('Normalizing characters.type values to allowed enum set...');
    await client.query('BEGIN');

    // Preview current distinct values
    const before = await client.query(`SELECT DISTINCT type FROM characters WHERE type IS NOT NULL ORDER BY 1`);
    console.log('Existing values:', before.rows.map(r => r.type));

    // Map various inputs to the final enum set for character_type used in migrations:
    // Final allowed set (per migrations):
    // 'Boy', 'Girl', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other'
    const sql = `
      UPDATE characters
      SET "type" = CASE
        WHEN lower(type) IN ('woman','women') THEN 'Woman'
        WHEN lower(type) IN ('man','men') THEN 'Man'
        WHEN lower(type) IN ('girl','girls') THEN 'Girl'
        WHEN lower(type) IN ('boy','boys') THEN 'Boy'
        WHEN lower(type) IN ('dog','dogs','puppy','puppies') THEN 'Dog'
        WHEN lower(type) IN ('dragon','dragons') THEN 'Dragon'
        WHEN lower(type) IN ('animal','animals','cat','cats','bird','birds','fish','fishes','horse','horses','cow','cows','lion','lions','tiger','tigers') THEN 'Animal'
        WHEN lower(type) IN ('fantasy creature','fantasy_creature','creature','monsters','monster','goblin','goblins','elf','elves','dwarf','dwarves','fairy','fairies') THEN 'Fantasy Creature'
        WHEN lower(type) IN ('baby','babies','toddler','toddlers','infant','infants') THEN 'Other'
        ELSE 'Other'
      END
      WHERE type IS NOT NULL;
    `;

    await client.query(sql);
    await client.query('COMMIT');

    const after = await client.query(`SELECT DISTINCT type FROM characters WHERE type IS NOT NULL ORDER BY 1`);
    console.log('Normalized values:', after.rows.map(r => r.type));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Normalization error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
