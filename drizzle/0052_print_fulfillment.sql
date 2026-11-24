CREATE TABLE "print_fulfillment_settings" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"default_provider" varchar(12) DEFAULT 'none' NOT NULL,
	"max_eur_per_copy" numeric(10, 2) DEFAULT '0' NOT NULL,
	"updated_by" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_fulfillments" (
	"print_request_id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"intent_id" uuid NOT NULL,
	"ticket_id" uuid,
	"provider" varchar(12) NOT NULL,
	"binding" varchar(12) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"proof_version" integer DEFAULT 1 NOT NULL,
	"run_id" uuid NOT NULL,
	"copies" integer NOT NULL,
	"credits_spent" integer NOT NULL,
	"shipping_snapshot" jsonb NOT NULL,
	"email_variables" jsonb NOT NULL,
	"proof" jsonb,
	"proof_sent_at" timestamp with time zone,
	"quote" jsonb,
	"vendor" jsonb,
	"hold_reason" text,
	"last_error" text,
	"approved_by" varchar(255),
	"approved_at" timestamp with time zone,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "print_fulfillments" ADD CONSTRAINT "print_fulfillments_print_request_id_print_requests_id_fk" FOREIGN KEY ("print_request_id") REFERENCES "public"."print_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "print_fulfillment_intent_idx" ON "print_fulfillments" USING btree ("author_id","intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "print_fulfillment_ticket_idx" ON "print_fulfillments" USING btree ("ticket_id");--> statement-breakpoint