CREATE TABLE "product_generation_requests" (
	"run_id" uuid PRIMARY KEY NOT NULL,
	"action_type" varchar(32) NOT NULL,
	"story_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"user_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"credits_spent" integer NOT NULL,
	"attribution_id" uuid,
	"client_id" varchar(100),
	"session_id" bigint,
	"consent" jsonb,
	"primary_intent" varchar(120),
	"landing_slug" varchar(160),
	"page_location" varchar(2048),
	"page_referrer" varchar(2048),
	"engagement_time_msec" integer,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"queue_reference" varchar(255),
	"queued_at" timestamp with time zone,
	"terminal_at" timestamp with time zone,
	"compensated_at" timestamp with time zone,
	"failure_stage" varchar(80),
	"failure_code" varchar(80),
	"delivery_status" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD CONSTRAINT "product_generation_requests_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD CONSTRAINT "product_generation_requests_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD CONSTRAINT "product_generation_requests_attribution_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_generation_requests_idempotency_key_unique" ON "product_generation_requests" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "product_generation_requests_terminal_idx" ON "product_generation_requests" USING btree ("action_type","status","terminal_at");--> statement-breakpoint
CREATE INDEX "product_generation_requests_story_id_idx" ON "product_generation_requests" USING btree ("story_id");