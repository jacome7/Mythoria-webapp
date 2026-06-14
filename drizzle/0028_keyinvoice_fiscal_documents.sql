CREATE TYPE "public"."fiscal_document_provider" AS ENUM('keyinvoice');--> statement-breakpoint
CREATE TYPE "public"."fiscal_document_status" AS ENUM('draft', 'pending', 'issuing', 'issued', 'failed', 'voided', 'credit_note_required', 'credit_note_issued');--> statement-breakpoint
CREATE TYPE "public"."fiscal_document_customer_mode" AS ENUM('keyinvoice_client', 'final_consumer');--> statement-breakpoint
CREATE TABLE "keyinvoice_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"vatin" varchar(40) NOT NULL,
	"keyinvoice_client_id" varchar(80) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(40),
	"country_code" varchar(2),
	"address" text,
	"postal_code" varchar(40),
	"locality" varchar(120),
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"provider" "fiscal_document_provider" DEFAULT 'keyinvoice' NOT NULL,
	"status" "fiscal_document_status" DEFAULT 'pending' NOT NULL,
	"doc_type" varchar(20) NOT NULL,
	"doc_series" varchar(80),
	"doc_num" varchar(80),
	"full_doc_number" varchar(160),
	"at_doc_code_id" varchar(255),
	"gross_total" numeric(12, 2),
	"net_total" numeric(12, 2),
	"tax_total" numeric(12, 2),
	"vat_rate" numeric(5, 2),
	"tax_id" varchar(80),
	"customer_mode" "fiscal_document_customer_mode" NOT NULL,
	"keyinvoice_customer_id" uuid,
	"keyinvoice_client_id" varchar(80),
	"final_consumer_vat_number" varchar(20),
	"stripe_checkout_session_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"pdf_storage_path" varchar(500),
	"pdf_sha256" varchar(64),
	"last_error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_document_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_document_id" uuid,
	"order_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keyinvoice_customers" ADD CONSTRAINT "keyinvoice_customers_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_keyinvoice_customer_id_keyinvoice_customers_id_fk" FOREIGN KEY ("keyinvoice_customer_id") REFERENCES "public"."keyinvoice_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_events" ADD CONSTRAINT "fiscal_document_events_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_events" ADD CONSTRAINT "fiscal_document_events_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "keyinvoice_customers_author_id_idx" ON "keyinvoice_customers" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "keyinvoice_customers_vatin_idx" ON "keyinvoice_customers" USING btree ("vatin");--> statement-breakpoint
CREATE UNIQUE INDEX "keyinvoice_customers_client_id_idx" ON "keyinvoice_customers" USING btree ("keyinvoice_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_order_id_idx" ON "fiscal_documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "fiscal_documents_author_id_idx" ON "fiscal_documents" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "fiscal_documents_status_idx" ON "fiscal_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fiscal_documents_next_retry_at_idx" ON "fiscal_documents" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "fiscal_documents_keyinvoice_doc_idx" ON "fiscal_documents" USING btree ("doc_type", "doc_series", "doc_num");--> statement-breakpoint
CREATE INDEX "fiscal_document_events_document_id_idx" ON "fiscal_document_events" USING btree ("fiscal_document_id");--> statement-breakpoint
CREATE INDEX "fiscal_document_events_order_id_idx" ON "fiscal_document_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "fiscal_document_events_event_type_idx" ON "fiscal_document_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "fiscal_document_events_created_at_idx" ON "fiscal_document_events" USING btree ("created_at");
