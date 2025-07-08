import { pgTable, index, uuid, varchar, integer, numeric, jsonb, timestamp, unique, text, boolean, foreignKey, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accessLevel = pgEnum("access_level", ['view', 'edit'])
export const addressType = pgEnum("address_type", ['billing', 'delivery'])
export const aiActionType = pgEnum("ai_action_type", ['story_structure', 'story_outline', 'chapter_writing', 'image_generation', 'image_edit', 'story_review', 'character_generation', 'story_enhancement', 'audio_generation', 'content_validation', 'test'])
export const audiobookStatus = pgEnum("audiobook_status", ['generating', 'completed', 'failed'])
export const characterRole = pgEnum("character_role", ['protagonist', 'antagonist', 'supporting', 'mentor', 'comic_relief', 'love_interest', 'sidekick', 'narrator', 'other'])
export const collaboratorRole = pgEnum("collaborator_role", ['editor', 'viewer'])
export const creditEventType = pgEnum("credit_event_type", ['initialCredit', 'creditPurchase', 'eBookGeneration', 'audioBookGeneration', 'printOrder', 'refund', 'voucher', 'promotion', 'textEdit', 'imageEdit'])
export const graphicalStyle = pgEnum("graphical_style", ['cartoon', 'realistic', 'watercolor', 'digital_art', 'hand_drawn', 'minimalist', 'vintage', 'comic_book', 'anime', 'pixar_style', 'disney_style', 'sketch', 'oil_painting', 'colored_pencil'])
export const novelStyle = pgEnum("novel_style", ['adventure', 'fantasy', 'mystery', 'romance', 'science_fiction', 'historical', 'contemporary', 'fairy_tale', 'comedy', 'drama', 'horror', 'thriller', 'biography', 'educational', 'poetry', 'sports_adventure'])
export const paymentEventType = pgEnum("payment_event_type", ['order_created', 'order_updated', 'payment_initiated', 'payment_completed', 'payment_failed', 'payment_cancelled', 'webhook_received', 'credits_added', 'refund_initiated', 'refund_completed'])
export const paymentMethodType = pgEnum("payment_method_type", ['card', 'revolut_pay', 'apple_pay', 'google_pay'])
export const paymentOrderStatus = pgEnum("payment_order_status", ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'])
export const paymentProvider = pgEnum("payment_provider", ['stripe', 'paypal', 'revolut', 'other'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'])
export const printProviderIntegration = pgEnum("print_provider_integration", ['email', 'api'])
export const printRequestStatus = pgEnum("print_request_status", ['requested', 'in_printing', 'packing', 'shipped', 'delivered', 'cancelled', 'error'])
export const runStatus = pgEnum("run_status", ['queued', 'running', 'failed', 'completed', 'cancelled'])
export const storyRating = pgEnum("story_rating", ['1', '2', '3', '4', '5'])
export const storyStatus = pgEnum("story_status", ['draft', 'writing', 'published'])
export const targetAudience = pgEnum("target_audience", ['children_0-2', 'children_3-6', 'children_7-10', 'children_11-14', 'young_adult_15-17', 'adult_18+', 'all_ages'])
export const transactionType = pgEnum("transaction_type", ['purchase', 'bonus', 'refund'])


export const tokenUsageTracking = pgTable("token_usage_tracking", {
	tokenUsageId: uuid("token_usage_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	storyId: uuid("story_id").notNull(),
	action: aiActionType().notNull(),
	aiModel: varchar("ai_model", { length: 100 }).notNull(),
	inputTokens: integer("input_tokens").notNull(),
	outputTokens: integer("output_tokens").notNull(),
	estimatedCostInEuros: numeric("estimated_cost_in_euros", { precision: 10, scale:  6 }).notNull(),
	inputPromptJson: jsonb("input_prompt_json").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("token_usage_action_idx").using("btree", table.action.asc().nullsLast().op("enum_ops")),
	index("token_usage_ai_model_idx").using("btree", table.aiModel.asc().nullsLast().op("text_ops")),
	index("token_usage_author_action_idx").using("btree", table.authorId.asc().nullsLast().op("enum_ops"), table.action.asc().nullsLast().op("uuid_ops")),
	index("token_usage_author_id_created_at_idx").using("btree", table.authorId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("token_usage_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("token_usage_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("token_usage_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
]);

export const leads = pgTable("leads", {
	leadId: uuid("lead_id").defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notifiedAt: timestamp("notified_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("leads_email_unique").on(table.email),
]);

export const printProviders = pgTable("print_providers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 120 }).notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	vatNumber: varchar("vat_number", { length: 50 }),
	emailAddress: varchar("email_address", { length: 255 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 30 }),
	address: text().notNull(),
	postalCode: varchar("postal_code", { length: 20 }),
	city: varchar({ length: 120 }).notNull(),
	country: varchar({ length: 2 }).notNull(),
	prices: jsonb().notNull(),
	integration: printProviderIntegration().default('email').notNull(),
	availableCountries: jsonb("available_countries").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const printRequests = pgTable("print_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	pdfUrl: text("pdf_url").notNull(),
	status: printRequestStatus().default('requested').notNull(),
	shippingId: uuid("shipping_id"),
	printProviderId: uuid("print_provider_id").notNull(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	printedAt: timestamp("printed_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	printingOptions: jsonb("printing_options").notNull(),
	authorId: uuid("author_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shippingId],
			foreignColumns: [addresses.addressId],
			name: "print_requests_shipping_id_addresses_address_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.printProviderId],
			foreignColumns: [printProviders.id],
			name: "print_requests_print_provider_id_print_providers_id_fk"
		}).onDelete("restrict"),
]);

export const pricing = pgTable("pricing", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceCode: varchar("service_code", { length: 50 }).notNull(),
	credits: integer().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
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
	index("authors_clerk_user_id_idx").using("btree", table.clerkUserId.asc().nullsLast().op("text_ops")),
	index("authors_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("authors_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("authors_last_login_at_idx").using("btree", table.lastLoginAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(last_login_at IS NOT NULL)`),
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
	index("addresses_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("addresses_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
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
	index("story_versions_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("story_versions_story_id_version_idx").using("btree", table.storyId.asc().nullsLast().op("int4_ops"), table.versionNumber.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "story_versions_story_id_stories_story_id_fk"
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
	index("payment_methods_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("payment_methods_is_default_idx").using("btree", table.authorId.asc().nullsLast().op("bool_ops"), table.isDefault.asc().nullsLast().op("uuid_ops")).where(sql`(is_default = true)`),
	index("payment_methods_provider_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops")),
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
	index("payments_author_id_created_at_idx").using("btree", table.authorId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("payments_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("payments_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("payments_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
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
	index("credit_ledger_author_id_created_at_idx").using("btree", table.authorId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("credit_ledger_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("credit_ledger_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("credit_ledger_event_type_idx").using("btree", table.creditEventType.asc().nullsLast().op("enum_ops")),
	index("credit_ledger_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")).where(sql`(story_id IS NOT NULL)`),
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

export const characters = pgTable("characters", {
	characterId: uuid("character_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id"),
	name: varchar({ length: 120 }).notNull(),
	type: varchar({ length: 60 }),
	passions: text(),
	superpowers: text(),
	physicalDescription: text("physical_description"),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	role: characterRole(),
}, (table) => [
	index("characters_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("characters_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("characters_role_idx").using("btree", table.role.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "characters_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const stories = pgTable("stories", {
	storyId: uuid("story_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	plotDescription: text("plot_description"),
	synopsis: text(),
	place: text(),
	additionalRequests: text(),
	targetAudience: targetAudience("target_audience"),
	novelStyle: novelStyle("novel_style"),
	graphicalStyle: graphicalStyle("graphical_style"),
	status: storyStatus().default('draft'),
	features: jsonb(),
	deliveryAddress: jsonb("delivery_address"),
	dedicationMessage: text("dedication_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	storyGenerationStatus: runStatus("story_generation_status"),
	storyGenerationCompletedPercentage: integer("story_generation_completed_percentage").default(0),
	storyLanguage: varchar("story_language", { length: 5 }).default('en-US').notNull(),
	htmlUri: text("html_uri"),
	pdfUri: text("pdf_uri"),
	audiobookUri: jsonb("audiobook_uri"),
	chapterCount: integer("chapter_count").default(6).notNull(),
	slug: text(),
	isPublic: boolean("is_public").default(false),
	isFeatured: boolean("is_featured").default(false),
	featureImageUri: text("feature_image_uri"),
	audiobookStatus: audiobookStatus("audiobook_status"),
}, (table) => [
	index("stories_author_id_created_at_idx").using("btree", table.authorId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("stories_author_id_status_idx").using("btree", table.authorId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("stories_author_id_updated_at_idx").using("btree", table.authorId.asc().nullsLast().op("timestamptz_ops"), table.updatedAt.desc().nullsFirst().op("uuid_ops")),
	index("stories_generation_status_idx").using("btree", table.storyGenerationStatus.asc().nullsLast().op("enum_ops")),
	index("stories_is_featured_idx").using("btree", table.isFeatured.asc().nullsLast().op("bool_ops")).where(sql`(is_featured = true)`),
	index("stories_is_public_idx").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")).where(sql`(is_public = true)`),
	index("stories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")).where(sql`(slug IS NOT NULL)`),
	index("stories_status_created_at_idx").using("btree", table.status.asc().nullsLast().op("enum_ops"), table.createdAt.asc().nullsLast().op("enum_ops")),
	index("stories_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "stories_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const aiEdits = pgTable("ai_edits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	storyId: uuid("story_id").notNull(),
	action: varchar({ length: 20 }).notNull(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
}, (table) => [
	index("ai_edits_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("ai_edits_author_action_idx").using("btree", table.authorId.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("uuid_ops")),
	index("ai_edits_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("ai_edits_requested_at_idx").using("btree", table.requestedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "ai_edits_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.storyId],
			name: "ai_edits_story_id_stories_story_id_fk"
		}).onDelete("cascade"),
]);

export const shareLinks = pgTable("share_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	accessLevel: accessLevel("access_level").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revoked: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("share_links_active_idx").using("btree", table.storyId.asc().nullsLast().op("timestamptz_ops"), table.expiresAt.asc().nullsLast().op("uuid_ops")).where(sql`(revoked = false)`),
	index("share_links_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("share_links_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
]);

export const paymentOrders = pgTable("payment_orders", {
	orderId: uuid("order_id").defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	amount: integer().notNull(),
	currency: varchar({ length: 3 }).default('eur').notNull(),
	status: paymentOrderStatus().default('pending').notNull(),
	provider: paymentProvider().notNull(),
	providerOrderId: varchar("provider_order_id", { length: 255 }),
	providerPublicId: varchar("provider_public_id", { length: 255 }),
	creditBundle: jsonb("credit_bundle").notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("payment_orders_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("payment_orders_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("payment_orders_provider_order_id_idx").using("btree", table.providerOrderId.asc().nullsLast().op("text_ops")),
	index("payment_orders_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.authorId],
			name: "payment_orders_author_id_authors_author_id_fk"
		}).onDelete("cascade"),
]);

export const paymentEvents = pgTable("payment_events", {
	eventId: uuid("event_id").defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	eventType: paymentEventType("event_type").notNull(),
	data: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payment_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("payment_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("enum_ops")),
	index("payment_events_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [paymentOrders.orderId],
			name: "payment_events_order_id_payment_orders_order_id_fk"
		}).onDelete("cascade"),
]);

export const creditPackages = pgTable("credit_packages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	credits: integer().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	popular: boolean().default(false).notNull(),
	bestValue: boolean("best_value").default(false).notNull(),
	icon: varchar({ length: 50 }).default('FaShoppingCart').notNull(),
	key: varchar({ length: 50 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("credit_packages_key_unique").on(table.key),
]);

export const storyRatings = pgTable("story_ratings", {
	ratingId: uuid("rating_id").defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	userId: uuid("user_id"),
	rating: storyRating().notNull(),
	feedback: text(),
	isAnonymous: boolean("is_anonymous").default(true).notNull(),
	includeNameInFeedback: boolean("include_name_in_feedback").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const storyCharacters = pgTable("story_characters", {
	storyId: uuid("story_id").notNull(),
	characterId: uuid("character_id").notNull(),
	role: characterRole(),
}, (table) => [
	index("story_characters_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("uuid_ops")),
	index("story_characters_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
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

export const storyCollaborators = pgTable("story_collaborators", {
	storyId: uuid("story_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: collaboratorRole().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("story_collaborators_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
	index("story_collaborators_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	primaryKey({ columns: [table.storyId, table.userId], name: "story_collaborators_story_id_user_id_pk"}),
]);
