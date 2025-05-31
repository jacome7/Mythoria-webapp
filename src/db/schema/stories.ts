import { pgTable, uuid, varchar, timestamp, text, jsonb, integer } from "drizzle-orm/pg-core";
import { authors } from './authors';
import { storyStatusEnum } from './enums';

// -----------------------------------------------------------------------------
// Stories domain
// -----------------------------------------------------------------------------

// Stories
export const stories = pgTable("stories", {
  storyId: uuid("story_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  plotDescription: text("plot_description"),
  synopsis: text("synopsis"),
  place: text("place"), // Setting of the story (real or imaginary)
  additionalRequests: text("additionalRequests"), // Optional text area for mentioning products, companies, or specific details to include.
  targetAudience: varchar("target_audience", { length: 120 }),
  novelStyle: varchar("novel_style", { length: 120 }), // e.g. "kids book", "adventure"
  graphicalStyle: varchar("graphical_style", { length: 120 }),
  status: storyStatusEnum("status").default('draft'),
  features: jsonb("features"), // {"ebook":true,"printed":false,"audiobook":true}
  deliveryAddress: jsonb("delivery_address"), // Delivery address for printed books
  dedicationMessage: text("dedication_message"), // Personalized dedication message
  mediaLinks: jsonb("media_links"), // {"cover":"...","pdf":"...","audio":"..."}
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Story versions
export const storyVersions = pgTable("story_versions", {
  storyVersionId: uuid("story_version_id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.storyId, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(),
  textJsonb: jsonb("text_jsonb").notNull(), // Store story content snapshot
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type StoryVersion = typeof storyVersions.$inferSelect;
export type NewStoryVersion = typeof storyVersions.$inferInsert;
