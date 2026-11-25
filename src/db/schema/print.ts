import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  boolean,
  integer,
  numeric,
  uniqueIndex,
  index,
  date,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { addresses } from './authors';
import { printRequestStatusEnum, printProviderIntegrationEnum } from './enums';

// -----------------------------------------------------------------------------
// Print domain
// -----------------------------------------------------------------------------

// Print Providers
export const printProviders = pgTable('print_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(), // Display name for UI
  companyName: varchar('company_name', { length: 255 }).notNull(),
  vatNumber: varchar('vat_number', { length: 50 }),
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 30 }),
  address: text('address').notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  city: varchar('city', { length: 120 }).notNull(),
  country: varchar('country', { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  prices: jsonb('prices').notNull(), // JSON with pricing structure
  integration: printProviderIntegrationEnum('integration').notNull().default('email'),
  availableCountries: jsonb('available_countries').notNull(), // Array of ISO 3166-1 alpha-2 country codes
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Print Requests
export const printRequests = pgTable('print_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull(), // Not FK - story can be deleted but print request persists
  authorId: uuid('author_id').notNull(), // Author who placed the request - for admin tracking
  pdfUrl: text('pdf_url').notNull(), // Public accessible URL to download PDF
  status: printRequestStatusEnum('status').notNull().default('requested'),
  shippingId: uuid('shipping_id').references(() => addresses.addressId, { onDelete: 'set null' }), // FK to addresses table
  printProviderId: uuid('print_provider_id')
    .notNull()
    .references(() => printProviders.id, { onDelete: 'restrict' }),
  printingOptions: jsonb('printing_options').notNull(), // JSON with selected printing options (serviceCode, credits, title, chapterCount, etc.)
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  printedAt: timestamp('printed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type PrintProvider = typeof printProviders.$inferSelect;
export type NewPrintProvider = typeof printProviders.$inferInsert;

export type PrintRequest = typeof printRequests.$inferSelect;
export type NewPrintRequest = typeof printRequests.$inferInsert;

export const printFulfillmentSettings = pgTable('print_fulfillment_settings', {
  id: varchar('id', { length: 20 }).primaryKey(),
  defaultProvider: varchar('default_provider', { length: 12 }).notNull().default('none'),
  maxEurPerCopy: numeric('max_eur_per_copy', { precision: 10, scale: 2 }).notNull().default('0'),
  updatedBy: varchar('updated_by', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const printFulfillments = pgTable(
  'print_fulfillments',
  {
    printRequestId: uuid('print_request_id')
      .primaryKey()
      .references(() => printRequests.id),
    authorId: uuid('author_id').notNull(),
    intentId: uuid('intent_id').notNull(),
    ticketId: uuid('ticket_id'),
    provider: varchar('provider', { length: 12 }).notNull(),
    binding: varchar('binding', { length: 12 }).notNull(),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    proofVersion: integer('proof_version').notNull().default(1),
    runId: uuid('run_id').notNull(),
    copies: integer('copies').notNull(),
    creditsSpent: integer('credits_spent').notNull(),
    shippingSnapshot: jsonb('shipping_snapshot').notNull(),
    emailVariables: jsonb('email_variables').notNull(),
    proof: jsonb('proof'),
    proofSentAt: timestamp('proof_sent_at', { withTimezone: true }),
    quote: jsonb('quote'),
    vendor: jsonb('vendor'),
    nextLuluCostCheckAt: timestamp('next_lulu_cost_check_at', { withTimezone: true }),
    holdReason: text('hold_reason'),
    lastError: text('last_error'),
    approvedBy: varchar('approved_by', { length: 255 }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('print_fulfillment_intent_idx').on(table.authorId, table.intentId),
    uniqueIndex('print_fulfillment_ticket_idx').on(table.ticketId),
    index('print_fulfillment_lulu_cost_retry_idx')
      .on(table.nextLuluCostCheckAt, table.printRequestId)
      .where(sql`${table.provider} = 'lulu' AND ${table.status} = 'submitted'`),
  ],
);

export type PrintFulfillment = typeof printFulfillments.$inferSelect;

export const printFulfillmentCosts = pgTable(
  'print_fulfillment_costs',
  {
    printRequestId: uuid('print_request_id')
      .primaryKey()
      .references(() => printFulfillments.printRequestId),
    luluJobId: varchar('lulu_job_id', { length: 32 }).notNull().unique(),
    jobCreatedAt: timestamp('job_created_at', { withTimezone: true }).notNull(),
    amountExclTax: numeric('amount_excl_tax').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    amountEur: numeric('amount_eur', { precision: 18, scale: 2 }),
    fxRate: numeric('fx_rate'),
    fxRateDate: date('fx_rate_date'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('print_fulfillment_cost_job_created_idx').on(table.jobCreatedAt),
    check('print_fulfillment_cost_native_amount_check', sql`${table.amountExclTax} >= 0`),
    check('print_fulfillment_cost_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'print_fulfillment_cost_fx_check',
      sql`(${table.amountEur} IS NULL AND ${table.fxRate} IS NULL AND ${table.fxRateDate} IS NULL)
        OR (${table.amountEur} IS NOT NULL AND ${table.amountEur} >= 0 AND ${table.fxRate} IS NOT NULL
            AND ${table.fxRate} > 0 AND ${table.fxRateDate} IS NOT NULL)`,
    ),
  ],
);
