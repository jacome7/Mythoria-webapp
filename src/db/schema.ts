import { pgTable, pgEnum, uuid, varchar, timestamp, text, boolean, jsonb, integer, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. Enumerated types
// -----------------------------------------------------------------------------
export const storyStatusEnum = pgEnum("story_status", ['draft', 'writing', 'published']);
export const addressTypeEnum = pgEnum("address_type", ['billing', 'delivery']);
export const paymentProviderEnum = pgEnum("payment_provider", ['stripe', 'paypal', 'revolut', 'other']);

// -----------------------------------------------------------------------------
// 2. Core tables
// ----------------------------------------------------------------------------

// 2.1 Authors (formerly users)
export const authors = pgTable("authors", {
  authorId: uuid("author_id").primaryKey().defaultRandom(), // Firebase UID
  displayName: varchar("display_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fiscalNumber: varchar("fiscal_number", { length: 40 }),
  mobilePhone: varchar("mobile_phone", { length: 30 }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  preferredLocale: varchar("preferred_locale", { length: 5 }).default('en'), // CHAR(5)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2.2 Payment methods
export const paymentMethods = pgTable("payment_methods", {
  paymentMethodId: uuid("payment_method_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  provider: paymentProviderEnum("provider").notNull(),
  providerRef: varchar("provider_ref", { length: 255 }).notNull(), // Stripe PM ID, PayPal token, etc.
  brand: varchar("brand", { length: 60 }), // “Visa”, “Mastercard”, …
  last4: varchar("last4", { length: 4 }), // CHAR(4)
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  billingDetails: jsonb("billing_details"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2.3 Addresses
export const addresses = pgTable("addresses", {
  addressId: uuid("address_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  type: addressTypeEnum("type").notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  stateRegion: varchar("state_region", { length: 120 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 2 }).notNull(), // CHAR(2)
  phone: varchar("phone", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2.4 Stories
export const stories = pgTable("stories", {
  storyId: uuid("story_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  plotDescription: text("plot_description"),
  synopsis: text("synopsis"),
  targetAudience: varchar("target_audience", { length: 120 }),
  novelStyle: varchar("novel_style", { length: 120 }), // e.g. “kids book”, “adventure”
  graphicalStyle: varchar("graphical_style", { length: 120 }),
  status: storyStatusEnum("status").default('draft'),
  features: jsonb("features"), // {"ebook":true,"printed":false,"audio":true}
  mediaLinks: jsonb("media_links"), // {"cover":"...","pdf":"...","audio":"..."}
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// CREATE INDEX idx_stories_author ON stories(author_id); // Drizzle creates indexes for FKs by default, explicit index can be added if needed for other columns or specific performance reasons.

// 2.5 Characters
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

// 2.6 Shipping codes (printed orders)
export const shippingCodes = pgTable("shipping_codes", {
  shippingCodeId: uuid("shipping_code_id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.storyId, { onDelete: 'cascade' }),
  addressId: uuid("address_id").notNull().references(() => addresses.addressId, { onDelete: 'cascade' }),
  carrier: varchar("carrier", { length: 120 }),
  trackingCode: varchar("tracking_code", { length: 120 }).notNull(),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

// -----------------------------------------------------------------------------
// 3. Suggested auxiliary tables
// -----------------------------------------------------------------------------
export const credits = pgTable("credits", {
  creditId: uuid("credit_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  balance: integer("balance").notNull().default(0),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  paymentId: uuid("payment_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.paymentMethodId),
  shippingCodeId: uuid("shipping_code_id").references(() => shippingCodes.shippingCodeId), // Optional link
  amount: integer("amount").notNull(), // Assuming amount in cents
  currency: varchar("currency", { length: 3 }).notNull().default("usd"), // ISO currency code
  status: varchar("status", { length: 50 }).notNull(), // e.g., 'pending', 'succeeded', 'failed'
  providerPaymentId: varchar("provider_payment_id", { length: 255 }), // Stripe Payment Intent ID, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storyVersions = pgTable("story_versions", {
  storyVersionId: uuid("story_version_id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.storyId, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(),
  textJsonb: jsonb("text_jsonb").notNull(), // Store story content snapshot
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  eventId: uuid("event_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").references(() => authors.authorId, { onDelete: 'set null' }), // Who performed the action
  eventType: varchar("event_type", { length: 100 }).notNull(), // e.g., 'story.created', 'user.login'
  payload: jsonb("payload"), // Event-specific data
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Relations (optional but good for type safety with Drizzle ORM queries)
// -----------------------------------------------------------------------------
export const authorsRelations = relations(authors, ({ many }) => ({
  paymentMethods: many(paymentMethods),
  addresses: many(addresses),
  stories: many(stories),
  characters: many(characters), // Characters an author created directly
  credits: many(credits),
  payments: many(payments),
  events: many(events),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  author: one(authors, {
    fields: [paymentMethods.authorId],
    references: [authors.authorId],
  }),
  payments: many(payments),
}));

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  author: one(authors, {
    fields: [addresses.authorId],
    references: [authors.authorId],
  }),
  shippingCodes: many(shippingCodes),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(authors, {
    fields: [stories.authorId],
    references: [authors.authorId],
  }),
  storyCharacters: many(storyCharacters),
  shippingCodes: many(shippingCodes),
  storyVersions: many(storyVersions),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  author: one(authors, { // If character is directly linked to an author
    fields: [characters.authorId],
    references: [authors.authorId],
  }),
  storyCharacters: many(storyCharacters),
}));

export const storyCharactersRelations = relations(storyCharacters, ({ one }) => ({
  story: one(stories, {
    fields: [storyCharacters.storyId],
    references: [stories.storyId],
  }),
  character: one(characters, {
    fields: [storyCharacters.characterId],
    references: [characters.characterId],
  }),
}));

export const shippingCodesRelations = relations(shippingCodes, ({ one }) => ({
  story: one(stories, {
    fields: [shippingCodes.storyId],
    references: [stories.storyId],
  }),
  address: one(addresses, {
    fields: [shippingCodes.addressId],
    references: [addresses.addressId],
  }),
}));

export const creditsRelations = relations(credits, ({ one }) => ({
  author: one(authors, {
    fields: [credits.authorId],
    references: [authors.authorId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  author: one(authors, {
    fields: [payments.authorId],
    references: [authors.authorId],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.paymentMethodId],
  }),
  shippingCode: one(shippingCodes, {
    fields: [payments.shippingCodeId],
    references: [shippingCodes.shippingCodeId],
  }),
}));

export const storyVersionsRelations = relations(storyVersions, ({ one }) => ({
  story: one(stories, {
    fields: [storyVersions.storyId],
    references: [stories.storyId],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  author: one(authors, {
    fields: [events.authorId],
    references: [authors.authorId],
  }),
}));

// -----------------------------------------------------------------------------
// Exported types for convenience
// -----------------------------------------------------------------------------
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type StoryCharacter = typeof storyCharacters.$inferSelect;
export type NewStoryCharacter = typeof storyCharacters.$inferInsert;

export type ShippingCode = typeof shippingCodes.$inferSelect;
export type NewShippingCode = typeof shippingCodes.$inferInsert;

export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type StoryVersion = typeof storyVersions.$inferSelect;
export type NewStoryVersion = typeof storyVersions.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
