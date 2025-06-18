import { pgTable, unique, uuid, varchar, timestamp, integer, boolean, foreignKey, jsonb, text, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const addressType = pgEnum("address_type", ['billing', 'delivery'])
export const characterRole = pgEnum("character_role", ['protagonist', 'antagonist', 'supporting', 'mentor', 'comic_relief', 'love_interest', 'sidekick', 'narrator', 'other'])
export const creditEventType = pgEnum("credit_event_type", ['initialCredit', 'creditPurchase', 'eBookGeneration', 'audioBookGeneration', 'printOrder', 'refund', 'voucher', 'promotion'])
export const paymentProvider = pgEnum("payment_provider", ['stripe', 'paypal', 'revolut', 'other'])
export const runStatus = pgEnum("run_status", ['queued', 'running', 'failed', 'completed', 'cancelled'])
export const stepStatus = pgEnum("step_status", ['pending', 'running', 'failed', 'completed'])
export const storyStatus = pgEnum("story_status", ['draft', 'writing', 'published'])

// New enums for story attributes
export const targetAudience = pgEnum("target_audience", [
  'children_0-2',     // Babies/Toddlers
  'children_3-6',     // Preschoolers
  'children_7-10',    // Early Elementary
  'children_11-14',   // Middle Grade
  'young_adult_15-17', // Young Adult
  'adult_18+',        // Adults
  'all_ages'          // All Ages
])

export const novelStyle = pgEnum("novel_style", [
  'adventure',
  'fantasy',
  'mystery',
  'romance',
  'science_fiction',
  'historical',
  'contemporary',
  'fairy_tale',
  'comedy',
  'drama',
  'horror',
  'thriller',
  'biography',
  'educational',
  'poetry',
  'sports_adventure'
])

export const graphicalStyle = pgEnum("graphical_style", [
  'cartoon',
  'realistic',
  'watercolor',
  'digital_art',
  'hand_drawn',
  'minimalist',
  'vintage',
  'comic_book',
  'anime',
  'pixar_style',
  'disney_style',
  'sketch',
  'oil_painting',
  'colored_pencil'
])

export const leads = pgTable("leads", {
	leadId: uuid("lead_id").defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notifiedAt: timestamp("notified_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("leads_email_unique").on(table.email),
]);

export const pricing = pgTable("pricing", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceCode: varchar("service_code", { length: 50 }).notNull(),
	credits: integer().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isMandatory: boolean("is_mandatory").default(false).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("pricing_service_code_unique").on(table.serviceCode),
]);

export const authors = pgTable("authors", {
	authorId: uuid("author_id").defaultRandom().primaryKey().notNull(),
	clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 120 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	fiscalNumber: varchar("fiscal_number", { length: 40 }),
	mobilePhone: varchar("mobile_phone", { length: 30 }),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	preferredLocale: varchar("preferred_locale", { length: 5 }).default('en'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("authors_clerk_user_id_unique").on(table.clerkUserId),
	unique("authors_email_unique").on(table.email),
]);

export const addresses = pgTable("addresses", {
	addressId: uuid("address_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	type: addressType().notNull(),
	line1: varchar({ length: 255 }).notNull(),
	line2: varchar({ length: 255 }),
	city: varchar({ length: 120 }).notNull(),
	stateRegion: varchar("state_region", { length: 120 }),
	postalCode: varchar("postal_code", { length: 20 }),
	country: varchar({ length: 2 }).notNull(),
	phone: varchar({ length: 30 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "addresses_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const events = pgTable("events", {
	eventId: uuid("event_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id"),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	payload: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "events_author_id_authors_author_id_fk"
		}).onDelete("set null"),
]);

export const storyVersions = pgTable("story_versions", {
	storyVersionId: uuid("story_version_id").defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	versionNumber: integer("version_number").notNull(),
	textJsonb: jsonb("text_jsonb").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "story_versions_story_id_stories_story_id_fk"
		}).onDelete("cascade"),
]);

export const characters = pgTable("characters", {
	characterId: uuid("character_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id"),
	name: varchar({ length: 120 }).notNull(),
	type: varchar({ length: 60 }),
	role: characterRole(),
	passions: text(),
	superpowers: text(),
	physicalDescription: text("physical_description"),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "characters_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const credits = pgTable("credits", {
	creditId: uuid("credit_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	balance: integer().default(0).notNull(),
	lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "credits_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const paymentMethods = pgTable("payment_methods", {
	paymentMethodId: uuid("payment_method_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	provider: paymentProvider().notNull(),
	providerRef: varchar("provider_ref", { length: 255 }).notNull(),
	brand: varchar({ length: 60 }),
	last4: varchar({ length: 4 }),
	expMonth: integer("exp_month"),
	expYear: integer("exp_year"),
	billingDetails: jsonb("billing_details"),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "payment_methods_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const payments = pgTable("payments", {
	paymentId: uuid("payment_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	paymentMethodId: uuid("payment_method_id"),
	shippingCodeId: uuid("shipping_code_id"),
	amount: integer().notNull(),
	currency: varchar({ length: 3 }).default('usd').notNull(),
	status: varchar({ length: 50 }).notNull(),
	providerPaymentId: varchar("provider_payment_id", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "payments_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethods.paymentMethodId],
			name: "payments_payment_method_id_payment_methods_payment_method_id_fk"
		}),
]);

export const shippingCodes = pgTable("shipping_codes", {
	shippingCodeId: uuid("shipping_code_id").defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	addressId: uuid("address_id").notNull(),
	carrier: varchar({ length: 120 }),
	trackingCode: varchar("tracking_code", { length: 120 }).notNull(),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "shipping_codes_story_id_stories_story_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.addressId],
			name: "shipping_codes_address_id_addresses_address_id_fk"
		}).onDelete("cascade"),
]);

export const authorCreditBalances = pgTable("author_credit_balances", {
	authorId: uuid("author_id").primaryKey().notNull(),
	totalCredits: integer("total_credits").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "author_credit_balances_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const creditLedger = pgTable("credit_ledger", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	amount: integer().notNull(),
	creditEventType: creditEventType("credit_event_type").notNull(),
	purchaseId: uuid("purchase_id"),
	storyId: uuid("story_id"),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "credit_ledger_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "credit_ledger_story_id_stories_story_id_fk"
		}).onDelete("set null"),
]);

export const stories = pgTable("stories", {
	storyId: uuid("story_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	plotDescription: text("plot_description"),
	storyLanguage: varchar("story_language", { length: 5 }).default('en-US').notNull(),
	synopsis: text(),
	place: text(),
	additionalRequests: text(),
	targetAudience: targetAudience("target_audience"),
	novelStyle: novelStyle("novel_style"),
	graphicalStyle: graphicalStyle("graphical_style"),
	chapterCount: integer("chapter_count").default(6).notNull(),
	status: storyStatus().default('draft'),
	features: jsonb(),
	deliveryAddress: jsonb("delivery_address"),
	dedicationMessage: text("dedication_message"),
	mediaLinks: jsonb("media_links"),
	htmlUri: text("html_uri"),
	pdfUri: text("pdf_uri"),
	audiobookUri: jsonb("audiobook_uri"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	storyGenerationStatus: runStatus("story_generation_status"),
	storyGenerationCompletedPercentage: integer("story_generation_completed_percentage").default(0),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "stories_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const storyGenerationRuns = pgTable("story_generation_runs", {
	runId: uuid("run_id").defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	gcpWorkflowExecution: text("gcp_workflow_execution"),
	status: runStatus().default('queued').notNull(),
	currentStep: varchar("current_step", { length: 120 }),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "story_generation_runs_story_id_stories_story_id_fk"
		}).onDelete("cascade"),
]);

export const storyCharacters = pgTable("story_characters", {
	storyId: uuid("story_id").notNull(),
	characterId: uuid("character_id").notNull(),
	role: characterRole(),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "story_characters_story_id_stories_story_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.characterId],
			name: "story_characters_character_id_characters_character_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.storyId, table.characterId], name: "story_characters_story_id_character_id_pk"}),
]);

export const storyGenerationSteps = pgTable("story_generation_steps", {
	runId: uuid("run_id").notNull(),
	stepName: varchar("step_name", { length: 120 }).notNull(),
	status: stepStatus().default('pending').notNull(),
	detailJson: jsonb("detail_json"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.runId],
			foreignColumns: [storyGenerationRuns.runId],
			name: "story_generation_steps_run_id_story_generation_runs_run_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.runId, table.stepName], name: "story_generation_steps_run_id_step_name_pk"}),
]);
