CREATE TABLE "payment_provider_events" (
	"payment_provider_event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) DEFAULT 'stripe' NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"provider_object_id" varchar(255) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"processing_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" varchar(100),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "author_referral_assignments" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"referral_code_id" uuid NOT NULL,
	"source_visit_id" uuid,
	"source" varchar(20) NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" varchar(40),
	"changed_by_actor_type" varchar(20) NOT NULL,
	"changed_by_actor_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_audit_events" (
	"audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"referral_code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"first_visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_referral_owner_id_unique" UNIQUE("referral_owner_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "referral_code_format_check" CHECK ("referral_codes"."code" ~ '^[A-Z0-9][A-Z0-9_-]{4,31}$')
);
--> statement-breakpoint
CREATE TABLE "referral_commission_events" (
	"commission_event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"signed_amount_cents" integer NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"provider_event_id" varchar(255),
	"provider_object_id" varchar(255),
	"settlement_id" uuid,
	"previous_status" varchar(20),
	"new_status" varchar(20),
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(255),
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_commission_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "referral_commissions" (
	"commission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"customer_author_id" uuid,
	"customer_reference" uuid NOT NULL,
	"mode" varchar(10) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"gross_amount_cents" integer,
	"commission_basis_cents" integer,
	"commission_rate_bps" integer NOT NULL,
	"original_commission_cents" integer,
	"net_commission_cents" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'blocked' NOT NULL,
	"refunded_gross_cents" integer DEFAULT 0 NOT NULL,
	"disputed_gross_cents" integer DEFAULT 0 NOT NULL,
	"reversed_cents" integer DEFAULT 0 NOT NULL,
	"review_reason" text,
	"dispute_open" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp with time zone,
	"hold_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"payable_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	CONSTRAINT "referral_commissions_payment_order_id_unique" UNIQUE("payment_order_id"),
	CONSTRAINT "referral_commission_status_check" CHECK ("referral_commissions"."status" in ('blocked','pending','approved','payable','paid','cancelled','reversed')),
	CONSTRAINT "referral_commission_mode_check" CHECK ("referral_commissions"."mode" in ('shadow','live'))
);
--> statement-breakpoint
CREATE TABLE "referral_customer_references" (
	"customer_reference" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"author_id" uuid
);
--> statement-breakpoint
CREATE TABLE "referral_funnel_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"customer_reference" uuid NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"locale" varchar(5),
	"country" varchar(2),
	"new_account" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_funnel_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "referral_owner_memberships" (
	"membership_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"email_normalized" varchar(255) NOT NULL,
	"clerk_user_id" varchar(255),
	"role" varchar(20) DEFAULT 'owner' NOT NULL,
	"status" varchar(20) DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_membership_status_check" CHECK ("referral_owner_memberships"."status" in ('invited','active','suspended')),
	CONSTRAINT "referral_membership_role_check" CHECK ("referral_owner_memberships"."role" in ('owner','viewer'))
);
--> statement-breakpoint
CREATE TABLE "referral_outbox" (
	"outbox_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_outbox_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "referral_owners" (
	"referral_owner_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"legal_name" varchar(255),
	"contact_email_normalized" varchar(255) NOT NULL,
	"country_code" varchar(2),
	"preferred_locale" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_by_actor_type" varchar(20) NOT NULL,
	"created_by_actor_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"suspended_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "referral_owner_status_check" CHECK ("referral_owners"."status" in ('active','suspended','closed'))
);
--> statement-breakpoint
CREATE TABLE "referral_reconciliations" (
	"reconciliation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"report" jsonb NOT NULL,
	"clean" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_settlement_items" (
	"settlement_item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"commission_event_id" uuid NOT NULL,
	"signed_amount_cents" integer NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referral_settlements" (
	"settlement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"gross_commission_cents" integer NOT NULL,
	"adjustments_cents" integer NOT NULL,
	"net_payment_cents" integer NOT NULL,
	"status" varchar(20) DEFAULT 'payable' NOT NULL,
	"external_payment_reference" varchar(255),
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_reason" text
);
--> statement-breakpoint
CREATE TABLE "payment_order_referral_snapshots" (
	"payment_order_id" uuid PRIMARY KEY NOT NULL,
	"assignment_id" uuid NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"terms_version_id" uuid NOT NULL,
	"code_snapshot" varchar(32) NOT NULL,
	"commission_rate_bps" integer NOT NULL,
	"attribution_started_at" timestamp with time zone NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" varchar(10) NOT NULL,
	"customer_reference" uuid NOT NULL,
	"purchase_kind" varchar(10) NOT NULL,
	"locale" varchar(5),
	"country" varchar(2)
);
--> statement-breakpoint
CREATE TABLE "referral_terms_versions" (
	"terms_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_owner_id" uuid NOT NULL,
	"commission_rate_bps" integer NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"program_policy_version" varchar(50) NOT NULL,
	"created_by_actor_type" varchar(20) NOT NULL,
	"created_by_actor_id" varchar(255) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_rate_check" CHECK ("referral_terms_versions"."commission_rate_bps" between 0 and 10000),
	CONSTRAINT "referral_terms_period_check" CHECK ("referral_terms_versions"."effective_until" is null or "referral_terms_versions"."effective_until" > "referral_terms_versions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "referral_visits" (
	"referral_visit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_visitor_id" uuid NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"landing_path" varchar(500),
	"locale" varchar(5),
	"referrer_hostname" varchar(255),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"linked_author_id" uuid,
	"linked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "account_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "referral_assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "referral_owner_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "referral_code_snapshot" varchar(32);--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "checkout_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "checkout_request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "author_referral_assignments" ADD CONSTRAINT "author_referral_assignments_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_referral_assignments" ADD CONSTRAINT "author_referral_assignments_referral_code_id_referral_codes_referral_code_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("referral_code_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_referral_assignments" ADD CONSTRAINT "author_referral_assignments_source_visit_id_referral_visits_referral_visit_id_fk" FOREIGN KEY ("source_visit_id") REFERENCES "public"."referral_visits"("referral_visit_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_commission_events" ADD CONSTRAINT "referral_commission_events_commission_id_referral_commissions_commission_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."referral_commissions"("commission_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_commission_events" ADD CONSTRAINT "referral_commission_events_settlement_id_referral_settlements_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."referral_settlements"("settlement_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_payment_order_id_payment_order_referral_snapshots_payment_order_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_order_referral_snapshots"("payment_order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_customer_author_id_authors_author_id_fk" FOREIGN KEY ("customer_author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_customer_references" ADD CONSTRAINT "referral_customer_references_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_customer_references" ADD CONSTRAINT "referral_customer_references_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_funnel_events" ADD CONSTRAINT "referral_funnel_events_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_funnel_events" ADD CONSTRAINT "referral_funnel_events_assignment_id_author_referral_assignments_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."author_referral_assignments"("assignment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_owner_memberships" ADD CONSTRAINT "referral_owner_memberships_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_settlement_items" ADD CONSTRAINT "referral_settlement_items_settlement_id_referral_settlements_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."referral_settlements"("settlement_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_settlement_items" ADD CONSTRAINT "referral_settlement_items_commission_event_id_referral_commission_events_commission_event_id_fk" FOREIGN KEY ("commission_event_id") REFERENCES "public"."referral_commission_events"("commission_event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_settlements" ADD CONSTRAINT "referral_settlements_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_referral_snapshots" ADD CONSTRAINT "payment_order_referral_snapshots_payment_order_id_payment_orders_order_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_referral_snapshots" ADD CONSTRAINT "payment_order_referral_snapshots_assignment_id_author_referral_assignments_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."author_referral_assignments"("assignment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_referral_snapshots" ADD CONSTRAINT "payment_order_referral_snapshots_referral_code_id_referral_codes_referral_code_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("referral_code_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_referral_snapshots" ADD CONSTRAINT "payment_order_referral_snapshots_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_order_referral_snapshots" ADD CONSTRAINT "payment_order_referral_snapshots_terms_version_id_referral_terms_versions_terms_version_id_fk" FOREIGN KEY ("terms_version_id") REFERENCES "public"."referral_terms_versions"("terms_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_terms_versions" ADD CONSTRAINT "referral_terms_versions_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_referral_code_id_referral_codes_referral_code_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("referral_code_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_linked_author_id_authors_author_id_fk" FOREIGN KEY ("linked_author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_event_unique" ON "payment_provider_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_assignment_active_unique" ON "author_referral_assignments" USING btree ("author_id") WHERE "author_referral_assignments"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "referral_commissions_owner_idx" ON "referral_commissions" USING btree ("referral_owner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_customer_owner_unique" ON "referral_customer_references" USING btree ("referral_owner_id","author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_membership_email_unique" ON "referral_owner_memberships" USING btree ("referral_owner_id","email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_membership_clerk_unique" ON "referral_owner_memberships" USING btree ("referral_owner_id","clerk_user_id") WHERE "referral_owner_memberships"."clerk_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_settlement_item_unique" ON "referral_settlement_items" USING btree ("settlement_id","commission_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_event_allocation_unique" ON "referral_settlement_items" USING btree ("commission_event_id") WHERE "referral_settlement_items"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_settlement_period_unique" ON "referral_settlements" USING btree ("referral_owner_id","period_end") WHERE "referral_settlements"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "referral_visits_code_time_idx" ON "referral_visits" USING btree ("referral_code_id","visited_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_checkout_attempt_unique" ON "payment_orders" USING btree ("author_id","checkout_attempt_id");