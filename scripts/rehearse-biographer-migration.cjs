/* Offline only: no dotenv, network database client, production data, or cloud resources. */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { generateMigration } = require('drizzle-kit/api');

async function main() {
  const arg = process.argv[2];
  if (process.argv.length !== 3 || !arg?.startsWith('--pglite-module=')) {
    throw new Error('Pass --pglite-module=/absolute/path/to/@electric-sql/pglite');
  }
  const { PGlite } = require(resolve(arg.slice('--pglite-module='.length)));
  const baseline = JSON.parse(readFileSync('drizzle/meta/0049_snapshot.json', 'utf8'));
  const target = JSON.parse(readFileSync('drizzle/meta/0050_snapshot.json', 'utf8'));
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')).entries;
  const entry = journal.at(-1);
  assert.equal(entry.tag, '0050_biographer_complete');
  assert.equal(target.prevId, baseline.id);
  const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  assert.deepEqual(
    (await generateMigration(baseline, target)).map((s) => s.trim()),
    statements,
  );
  const empty = {
    ...baseline,
    id: '00000000-0000-0000-0000-000000000000',
    prevId: '00000000-0000-0000-0000-000000000000',
    tables: {},
    enums: {},
    schemas: {},
    sequences: {},
    roles: {},
    policies: {},
    views: {},
    _meta: { columns: {}, schemas: {}, tables: {} },
  };
  const db = new PGlite();
  const hash = createHash('sha256').update(sql).digest('hex');
  const headHash = createHash('sha256')
    .update(readFileSync('drizzle/0049_openai_ads_conversions.sql', 'utf8'))
    .digest('hex');
  const tables = Object.keys(target.tables).filter((name) => name.startsWith('public.biographer_'));
  const countBiographer = async () =>
    Number(
      (
        await db.query(
          "SELECT count(*) AS count FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'biographer_%'",
        )
      ).rows[0].count,
    );
  const hasEnum = async () =>
    Number(
      (
        await db.query(
          "SELECT count(*) AS count FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='literary_persona' AND e.enumlabel='contextual-storyteller'",
        )
      ).rows[0].count,
    );
  const apply = async () => {
    for (const statement of statements) await db.exec(statement);
    await db.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1,$2)', [
      hash,
      entry.when,
    ]);
  };
  try {
    const version = (await db.query('SHOW server_version_num')).rows[0].server_version_num;
    assert.equal(Math.floor(Number(version) / 10000), 17, 'Use a PostgreSQL 17 PGlite build');
    for (const generated of await generateMigration(empty, baseline)) {
      // Existing snapshots serialize eq(column, true) as a parameter. The deployed
      // 0017 SQL spells out true. Normalize only these two synthetic baseline indexes.
      let statement = generated;
      if (/^CREATE INDEX "stories_is_(public|featured)_idx"/.test(statement)) {
        statement = statement.replace(/ = \$1;/, ' = true;');
      }
      assert.doesNotMatch(statement, /\$\d+/, 'Unexpected parameter in synthetic baseline');
      await db.exec(statement);
    }
    await db.exec(
      'CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)',
    );
    await db.query('INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ($1,$2)', [
      headHash,
      journal.at(-2).when,
    ]);
    const author = (
      await db.query(
        "INSERT INTO authors (clerk_user_id,display_name,email) VALUES ('offline_rehearsal','Offline Author','offline@example.invalid') RETURNING author_id",
      )
    ).rows[0].author_id;
    const story = (
      await db.query(
        "INSERT INTO stories (author_id,title) VALUES ($1,'Existing offline story') RETURNING story_id",
        [author],
      )
    ).rows[0].story_id;
    const before = (
      await db.query('SELECT row_to_json(s) AS data FROM stories s WHERE story_id=$1', [story])
    ).rows;

    await db.exec('BEGIN');
    await apply();
    await assert.rejects(db.query('SELECT 1/0'), (error) => error.code === '22012');
    await db.exec('ROLLBACK');
    assert.equal(await countBiographer(), 0);
    assert.equal(await hasEnum(), 0);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations')).rows[0].n,
      1,
    );

    await db.exec(
      "BEGIN; SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='30s'; SET LOCAL transaction_timeout='60s'",
    );
    await apply();
    assert.equal(await countBiographer(), 10);
    assert.equal(await hasEnum(), 1);
    const fks = (
      await db.query(
        "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relname LIKE 'biographer_%' AND c.contype='f' AND c.convalidated",
      )
    ).rows[0].n;
    assert.equal(fks, 17);
    await db.exec('COMMIT');
    for (const table of tables) {
      const name = table.slice('public.'.length);
      const columns = (
        await db.query(
          'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
          ['public', name],
        )
      ).rows
        .map((row) => row.column_name)
        .sort();
      assert.deepEqual(columns, Object.keys(target.tables[table].columns).sort());
    }
    assert.deepEqual(
      (await db.query('SELECT row_to_json(s) AS data FROM stories s WHERE story_id=$1', [story]))
        .rows,
      before,
    );
    const project = (
      await db.query('INSERT INTO biographer_projects (author_id) VALUES ($1) RETURNING id', [
        author,
      ])
    ).rows[0].id;
    await db.query(
      "INSERT INTO biographer_participants (project_id,name,role) VALUES ($1,'Owner','owner')",
      [project],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO biographer_participants (project_id,name,role) VALUES ($1,'Second owner','owner')",
        [project],
      ),
      (error) => error.code === '23505',
    );
    await db.query(
      "INSERT INTO biographer_participants (project_id,name,role) VALUES ($1,'Contributor one','contributor'),($1,'Contributor two','contributor')",
      [project],
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM biographer_participants WHERE project_id=$1 AND consent_at IS NULL',
          [project],
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations WHERE hash=$1 AND created_at=$2',
          [hash, entry.when],
        )
      ).rows[0].n,
      1,
    );
    console.log(
      JSON.stringify(
        {
          ok: true,
          engine: `PostgreSQL ${version} (embedded, single connection)`,
          migration: entry.tag,
          hash,
          tables: tables.length,
          validatedForeignKeys: fks,
          rollbackVerified: true,
          existingStoryUnchanged: true,
          ownerUniquenessAndMultipleContributorsVerified: true,
          productionConnections: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
