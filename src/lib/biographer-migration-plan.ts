import { createHash } from 'node:crypto';

export const HEAD_TAG = '0049_openai_ads_conversions';
export const HEAD_TIME = 1794870554717;
export const HEAD_HASH = '17b86a084750860cc2d27ff1dd57650b250f85b05dcf3756f907ec71aa4c0203';
export const MIGRATION_TAG = '0050_biographer_complete';
export const MIGRATION_HASH = '0f531d4392cbafcd9b18f20b63ee80687a1f758c77048f760947fddbf1ba4350';

export type JournalEntry = { idx: number; tag: string; when: number };
export type LedgerRow = { hash: string; created_at: string | number };
export type MigrationPlan = {
  when: number;
  hash: string;
  statements: string[];
  tables: string[];
  columns: string[];
  indexes: string[];
  foreignKeys: string[];
};

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildPlan(
  entries: JournalEntry[],
  headSql: string,
  migrationSql: string,
): MigrationPlan {
  const head = entries.at(-2);
  const next = entries.at(-1);
  if (
    !head ||
    !next ||
    head.idx !== 49 ||
    head.tag !== HEAD_TAG ||
    head.when !== HEAD_TIME ||
    next.idx !== 50 ||
    next.tag !== MIGRATION_TAG ||
    next.when <= head.when ||
    entries.some(
      (entry, index) => entry.idx !== index || (index > 0 && entry.when <= entries[index - 1].when),
    )
  ) {
    throw new Error('Unexpected journal ordering or migration head');
  }
  if (sha256(headSql) !== HEAD_HASH || sha256(migrationSql) !== MIGRATION_HASH) {
    throw new Error('Migration SQL differs from the reviewed plan');
  }
  const statements = migrationSql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  const tables: string[] = [];
  const columns: string[] = [];
  const indexes: string[] = [];
  const foreignKeys: string[] = [];
  for (const statement of statements) {
    if (
      statement ===
      'ALTER TYPE "public"."literary_persona" ADD VALUE \'contextual-storyteller\' BEFORE \'storyteller\';'
    )
      continue;
    const table = statement.match(/^CREATE TABLE "(biographer_[a-z_]+)" \(([\s\S]+)\);$/);
    if (table) {
      tables.push(table[1]);
      for (const match of table[2].matchAll(/^\s*"([a-z_][a-z0-9_]*)"\s/gm))
        columns.push(`${table[1]}.${match[1]}`);
      continue;
    }
    const fk = statement.match(
      /^ALTER TABLE "(biographer_[a-z_]+)" ADD CONSTRAINT "(biographer_[a-z_]+)" FOREIGN KEY \("[a-z_]+"\) REFERENCES "public"\."(biographer_[a-z_]+|authors|stories)"\("[a-z_]+"\) ON DELETE (?:cascade|set null) ON UPDATE no action;$/,
    );
    if (fk) {
      // PostgreSQL stores identifiers at most 63 bytes; these names are restricted to ASCII.
      foreignKeys.push(`${fk[1]}.${fk[2].slice(0, 63)}`);
      continue;
    }
    const index = statement.match(
      /^CREATE UNIQUE INDEX "(biographer_[a-z_]+)" ON "(biographer_[a-z_]+)" USING btree \([\s\S]+\)(?: WHERE [\s\S]+)?;$/,
    );
    if (index) {
      indexes.push(index[1]);
      continue;
    }
    throw new Error('Unexpected SQL in reviewed migration');
  }
  if (
    tables.length !== 10 ||
    new Set(tables).size !== 10 ||
    foreignKeys.length !== 17 ||
    new Set(foreignKeys).size !== foreignKeys.length ||
    indexes.length !== 3 ||
    statements.length !== 31
  ) {
    throw new Error('Incomplete migration plan');
  }
  return {
    when: next.when,
    hash: sha256(migrationSql),
    statements,
    tables,
    columns,
    indexes,
    foreignKeys,
  };
}

export function assertPreconditions(
  ledger: LedgerRow[],
  objectNames: string[],
  enumPresent: boolean,
  referencedKeys: string[],
  plan: MigrationPlan,
): void {
  const latest = ledger.filter((row) => Number(row.created_at) === HEAD_TIME);
  if (
    ledger.length === 0 ||
    Math.max(...ledger.map((row) => Number(row.created_at))) !== HEAD_TIME ||
    latest.length !== 1 ||
    latest[0].hash !== HEAD_HASH ||
    ledger.some((row) => Number(row.created_at) === plan.when || row.hash === plan.hash)
  ) {
    throw new Error('Unexpected migration ledger head or already applied migration');
  }
  if (objectNames.length || enumPresent)
    throw new Error('Partial or existing Biographer schema detected');
  if (
    !referencedKeys.includes('authors.author_id') ||
    !referencedKeys.includes('stories.story_id')
  ) {
    throw new Error('Required referenced unique keys are missing');
  }
}
