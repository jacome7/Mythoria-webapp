import { readFileSync } from 'node:fs';
import {
  assertPreconditions,
  buildPlan,
  HEAD_HASH,
  HEAD_TIME,
  type JournalEntry,
} from './biographer-migration-plan';

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')) as {
  entries: JournalEntry[];
};
const head = readFileSync('drizzle/0049_openai_ads_conversions.sql', 'utf8');
const migration = readFileSync('drizzle/0050_biographer_complete.sql', 'utf8');
const plan = buildPlan(journal.entries, head, migration);
const ledger = [{ hash: HEAD_HASH, created_at: HEAD_TIME }];
const keys = ['authors.author_id', 'stories.story_id'];

test('reviewed plan creates foundation before foreign keys and indexes', () => {
  expect(plan.tables).toHaveLength(10);
  expect(plan.statements[0]).toContain('ALTER TYPE');
  expect(plan.statements[1]).toContain('CREATE TABLE');
  expect(plan.statements[11]).toContain('ADD CONSTRAINT');
  expect(plan.statements.at(-1)).toContain('CREATE UNIQUE INDEX');
  expect(() => assertPreconditions(ledger, [], false, keys, plan)).not.toThrow();
});

test('rejects a collision, modified SQL, unexpected head and partial schema', () => {
  const entries = journal.entries.map((entry) => ({ ...entry }));
  entries[49].tag = '0049_biographer_phase_one';
  expect(() => buildPlan(entries, head, migration)).toThrow();
  expect(() => buildPlan(journal.entries, head, `${migration}\n`)).toThrow();
  expect(() =>
    assertPreconditions([{ hash: 'wrong', created_at: HEAD_TIME }], [], false, keys, plan),
  ).toThrow();
  expect(() =>
    assertPreconditions(
      [...ledger, { hash: 'later', created_at: plan.when + 1 }],
      [],
      false,
      keys,
      plan,
    ),
  ).toThrow();
  expect(() => assertPreconditions(ledger, ['biographer_projects'], false, keys, plan)).toThrow();
  expect(() => assertPreconditions(ledger, [], true, keys, plan)).toThrow();
  expect(() => assertPreconditions(ledger, [], false, ['authors.author_id'], plan)).toThrow();
});
