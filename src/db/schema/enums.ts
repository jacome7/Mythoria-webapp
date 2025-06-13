import { pgEnum } from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// Enumerated types
// -----------------------------------------------------------------------------
export const storyStatusEnum = pgEnum("story_status", ['draft', 'writing', 'published']);
export const addressTypeEnum = pgEnum("address_type", ['billing', 'delivery']);
export const paymentProviderEnum = pgEnum("payment_provider", ['stripe', 'paypal', 'revolut', 'other']);
export const creditEventTypeEnum = pgEnum("credit_event_type", [
  'initialCredit',
  'creditPurchase', 
  'eBookGeneration',
  'audioBookGeneration',
  'printOrder',
  'refund',
  'voucher',
  'promotion'
]);

// Story generation workflow enums
export const runStatusEnum = pgEnum("run_status", [
  'queued',
  'running',
  'failed',
  'completed',
  'cancelled'
]);

export const stepStatusEnum = pgEnum("step_status", [
  'pending',
  'running',
  'failed',
  'completed'
]);
