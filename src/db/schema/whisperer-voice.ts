import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authors } from './authors';

export const authorVoiceAccounts = pgTable('story_whisperer_voice_accounts', {
  authorId: uuid('author_id')
    .primaryKey()
    .references(() => authors.authorId, { onDelete: 'cascade' }),
  allowanceSeconds: integer('allowance_seconds').notNull().default(10800),
  liveSeconds: integer('live_seconds').notNull().default(0),
  liveEnabled: boolean('live_enabled').notNull().default(true),
});

// A reset may delete the interview. Keep the staff audit attached to the author.
export const authorVoiceActions = pgTable('story_whisperer_voice_actions', {
  requestId: uuid('request_id').primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => authors.authorId, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull(),
  actor: text('actor').notNull(),
  caller: text('caller').notNull(),
  operation: text('operation').notNull(),
  reason: text('reason').notNull(),
  payload: text('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
