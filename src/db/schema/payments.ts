import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { authors } from './authors';
import { paymentProviderEnum } from './enums';

// -----------------------------------------------------------------------------
// Payments domain
// -----------------------------------------------------------------------------

// Payment methods
export const paymentMethods = pgTable("payment_methods", {
  paymentMethodId: uuid("payment_method_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  provider: paymentProviderEnum("provider").notNull(),
  providerRef: varchar("provider_ref", { length: 255 }).notNull(), // Stripe PM ID, PayPal token, etc.
  brand: varchar("brand", { length: 60 }), // "Visa", "Mastercard", …
  last4: varchar("last4", { length: 4 }), // CHAR(4)
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  billingDetails: jsonb("billing_details"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Credits
export const credits = pgTable("credits", {
  creditId: uuid("credit_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  balance: integer("balance").notNull().default(0),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Payments
export const payments = pgTable("payments", {
  paymentId: uuid("payment_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => authors.authorId, { onDelete: 'cascade' }),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.paymentMethodId),
  shippingCodeId: uuid("shipping_code_id"), // Will reference shippingCodes.shippingCodeId - foreign key defined in relations
  amount: integer("amount").notNull(), // Assuming amount in cents
  currency: varchar("currency", { length: 3 }).notNull().default("usd"), // ISO currency code
  status: varchar("status", { length: 50 }).notNull(), // e.g., 'pending', 'succeeded', 'failed'
  providerPaymentId: varchar("provider_payment_id", { length: 255 }), // Stripe Payment Intent ID, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
