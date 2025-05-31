import { pgTable, uuid, varchar, timestamp, text, primaryKey } from "drizzle-orm/pg-core";
import { authors } from './authors';
import { stories } from './stories';

// -----------------------------------------------------------------------------
// Characters domain
// -----------------------------------------------------------------------------

// Characters
export const characters = pgTable("characters", {
  characterId: uuid("character_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").references(() => authors.authorId, { onDelete: 'cascade' }), // Can be null if character is generic
  name: varchar("name", { length: 120 }).notNull(),
  type: varchar("type", { length: 60 }), // boy, girl, dog, alien…
  passions: text("passions"),
  superpowers: text("superpowers"),
  physicalDescription: text("physical_description"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Junction table: story ↔ characters (many-to-many)
export const storyCharacters = pgTable("story_characters", {
  storyId: uuid("story_id").notNull().references(() => stories.storyId, { onDelete: 'cascade' }),
  characterId: uuid("character_id").notNull().references(() => characters.characterId, { onDelete: 'cascade' }),
  role: varchar("role", { length: 120 }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.storyId, table.characterId] }),
  };
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type StoryCharacter = typeof storyCharacters.$inferSelect;
export type NewStoryCharacter = typeof storyCharacters.$inferInsert;
