import { pgTable, uuid, timestamp, integer, varchar, jsonb, decimal } from "drizzle-orm/pg-core";
import { aiActionTypeEnum } from "./enums";

// -----------------------------------------------------------------------------
// Token Usage Tracking Table
// -----------------------------------------------------------------------------

export const tokenUsageTracking = pgTable("token_usage_tracking", {
  tokenUsageId: uuid("token_usage_id").defaultRandom().primaryKey().notNull(),
  authorId: uuid("author_id").notNull(), // Not a foreign key - keep record even if author is deleted
  storyId: uuid("story_id").notNull(), // Not a foreign key - keep record even if story is deleted
  action: aiActionTypeEnum().notNull(),
  aiModel: varchar("ai_model", { length: 100 }).notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  estimatedCostInEuros: decimal("estimated_cost_in_euros", { precision: 10, scale: 6 }).notNull(),
  inputPromptJson: jsonb("input_prompt_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Token Usage Tracking Types
// -----------------------------------------------------------------------------

export type InsertTokenUsage = typeof tokenUsageTracking.$inferInsert;
export type SelectTokenUsage = typeof tokenUsageTracking.$inferSelect;
