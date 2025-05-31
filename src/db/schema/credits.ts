import { pgTable, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { authors } from './authors';
import { stories } from './stories';
import { creditEventTypeEnum } from './enums';

// -----------------------------------------------------------------------------
// Credits domain
// -----------------------------------------------------------------------------

// Credit Ledger - Insert only table for all credit operations
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  amount: integer("amount").notNull(), // Can be positive or negative
  creditEventType: creditEventTypeEnum("credit_event_type").notNull(),
  purchaseId: uuid("purchase_id"), // FK to purchases table (to be created later)
  storyId: uuid("story_id").references(() => stories.storyId, { onDelete: 'set null' }), // Can be null
});

// Materialized view for author credit balances
// This will be auto-refreshed and provides fast access to current credit balances
// Note: This is defined as a table in Drizzle but is actually created as a materialized view in SQL
export const authorCreditBalances = pgTable("author_credit_balances", {
  authorId: uuid("author_id").primaryKey().references(() => authors.authorId, { onDelete: 'cascade' }),
  totalCredits: integer("total_credits").notNull().default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedger.$inferInsert;

export type AuthorCreditBalance = typeof authorCreditBalances.$inferSelect;
export type NewAuthorCreditBalance = typeof authorCreditBalances.$inferInsert;
