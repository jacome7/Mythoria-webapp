import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { CreationObservation } from '@/lib/growth/creation';
import { analyticsAttributions } from './analytics';
import { authors } from './authors';
import { paymentOrders } from './payments';
import { stories } from './stories';

export const creationObservations = pgTable(
  'creation_observations',
  {
    outlineId: uuid('outline_id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'cascade' }),
    receiptId: uuid('receipt_id').references(() => analyticsAttributions.attributionId, {
      onDelete: 'cascade',
    }),
    snapshot: jsonb('snapshot').$type<CreationObservation>().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('creation_observations_story_idx').on(table.storyId, table.acceptedAt),
    index('creation_observations_receipt_idx').on(table.receiptId),
  ],
);

export const creationDraftOpens = pgTable(
  'creation_draft_opens',
  {
    draftRef: uuid('draft_ref').primaryKey(),
    receiptId: uuid('receipt_id')
      .notNull()
      .references(() => analyticsAttributions.attributionId, { onDelete: 'cascade' }),
    option: varchar('option', { length: 16 }).notNull(),
    entryKind: varchar('entry_kind', { length: 16 }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('creation_draft_opens_receipt_idx').on(table.receiptId),
    index('creation_draft_opens_time_idx').on(table.openedAt),
  ],
);

export const qualifiedShareOpens = pgTable(
  'qualified_share_opens',
  {
    openId: uuid('open_id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'cascade' }),
    receiptId: uuid('receipt_id')
      .notNull()
      .references(() => analyticsAttributions.attributionId, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => authors.authorId, { onDelete: 'cascade' }),
    method: varchar('method', { length: 16 }).notNull(),
    scope: varchar('scope', { length: 16 }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('qualified_share_opens_story_browser_unique').on(table.storyId, table.receiptId),
    uniqueIndex('qualified_share_opens_story_author_unique').on(table.storyId, table.authorId),
    index('qualified_share_opens_buyer_idx').on(table.authorId, table.openedAt),
  ],
);

export const shareFirstPayments = pgTable('share_first_payments', {
  orderId: uuid('order_id')
    .primaryKey()
    .references(() => paymentOrders.orderId, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .unique()
    .references(() => authors.authorId, { onDelete: 'cascade' }),
  storyId: uuid('story_id').references(() => stories.storyId, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
});
