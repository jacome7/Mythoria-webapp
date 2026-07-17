CREATE TABLE "analytics_attributions" (
	"attribution_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"client_id" varchar(100) NOT NULL,
	"session_id" bigint,
	"consent" jsonb NOT NULL,
	"landing_slug" varchar(160),
	"primary_intent" varchar(120),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_id" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"gclid" varchar(255),
	"gbraid" varchar(255),
	"wbraid" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"linked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_outbox" (
	"outbox_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"event_name" varchar(40) NOT NULL,
	"client_id" varchar(100),
	"user_id" varchar(255),
	"session_id" bigint,
	"consent" jsonb,
	"params" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_generation_requests" (
	"run_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"credits_spent" integer NOT NULL,
	"attribution_id" uuid,
	"client_id" varchar(100),
	"session_id" bigint,
	"consent" jsonb,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"publish_attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_id" varchar(255),
	"published_at" timestamp with time zone,
	"terminal_at" timestamp with time zone,
	"compensated_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD COLUMN "idempotency_key" varchar(255);
--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD CONSTRAINT "analytics_attributions_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_generation_requests" ADD CONSTRAINT "story_generation_requests_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_generation_requests" ADD CONSTRAINT "story_generation_requests_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_generation_requests" ADD CONSTRAINT "story_generation_requests_attribution_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "analytics_attributions_author_id_idx" ON "analytics_attributions" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "analytics_attributions_expires_at_idx" ON "analytics_attributions" USING btree ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_outbox_dedupe_key_unique" ON "analytics_outbox" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "analytics_outbox_pending_idx" ON "analytics_outbox" USING btree ("delivered_at","skipped_at","available_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "story_generation_requests_idempotency_key_unique" ON "story_generation_requests" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "story_generation_requests_pending_idx" ON "story_generation_requests" USING btree ("status","available_at");
--> statement-breakpoint
CREATE INDEX "story_generation_requests_story_id_idx" ON "story_generation_requests" USING btree ("story_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_idempotency_key_unique" ON "credit_ledger" USING btree ("idempotency_key");
