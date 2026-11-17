CREATE TABLE "ad_conversion_outbox" (
	"outbox_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination" varchar(32) DEFAULT 'openai' NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"custom_event_name" varchar(64),
	"dedupe_name" varchar(64) NOT NULL,
	"source_outbox_id" uuid,
	"author_id" uuid,
	"data" jsonb NOT NULL,
	"ad_context" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claim_token" uuid,
	"claimed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "oppref" varchar(512);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "oppref_captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "obref" varchar(255);--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD COLUMN "ad_context" jsonb;--> statement-breakpoint
ALTER TABLE "ad_conversion_outbox" ADD CONSTRAINT "ad_conversion_outbox_source_outbox_id_analytics_outbox_outbox_id_fk" FOREIGN KEY ("source_outbox_id") REFERENCES "public"."analytics_outbox"("outbox_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_conversion_outbox" ADD CONSTRAINT "ad_conversion_outbox_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_conversion_outbox_dedupe_unique" ON "ad_conversion_outbox" USING btree ("destination","dedupe_name","event_id");--> statement-breakpoint
CREATE INDEX "ad_conversion_outbox_pending_idx" ON "ad_conversion_outbox" USING btree ("delivered_at","skipped_at","available_at");--> statement-breakpoint
CREATE INDEX "ad_conversion_outbox_source_outbox_id_idx" ON "ad_conversion_outbox" USING btree ("source_outbox_id");--> statement-breakpoint
CREATE INDEX "ad_conversion_outbox_author_id_idx" ON "ad_conversion_outbox" USING btree ("author_id");