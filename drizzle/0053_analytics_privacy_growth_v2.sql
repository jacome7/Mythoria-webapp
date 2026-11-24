CREATE TABLE "anonymous_analytics_daily" (
	"day" date NOT NULL,
	"category" varchar(16) NOT NULL,
	"surface" varchar(24) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"count" bigint NOT NULL,
	CONSTRAINT "anonymous_analytics_daily_day_category_surface_outcome_pk" PRIMARY KEY("day","category","surface","outcome")
);
--> statement-breakpoint
CREATE TABLE "creation_draft_opens" (
	"draft_ref" uuid PRIMARY KEY NOT NULL,
	"receipt_id" uuid NOT NULL,
	"option" varchar(16) NOT NULL,
	"entry_kind" varchar(16) NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creation_observations" (
	"outline_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"receipt_id" uuid,
	"snapshot" jsonb NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualified_share_opens" (
	"open_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"author_id" uuid,
	"method" varchar(16) NOT NULL,
	"scope" varchar(16) NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_first_payments" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	CONSTRAINT "share_first_payments_author_id_unique" UNIQUE("author_id")
);
--> statement-breakpoint
CREATE TABLE "product_experiment_assignments" (
	"experiment_id" varchar(32) NOT NULL,
	"attribution_id" uuid NOT NULL,
	"arm" varchar(12) NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reader_started_at" timestamp with time zone,
	"reader_ended_at" timestamp with time zone,
	CONSTRAINT "product_experiment_assignments_experiment_id_attribution_id_pk" PRIMARY KEY("experiment_id","attribution_id")
);
--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "suppression_reason" varchar(48);--> statement-breakpoint
ALTER TABLE "creation_draft_opens" ADD CONSTRAINT "creation_draft_opens_receipt_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_observations" ADD CONSTRAINT "creation_observations_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_observations" ADD CONSTRAINT "creation_observations_receipt_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualified_share_opens" ADD CONSTRAINT "qualified_share_opens_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualified_share_opens" ADD CONSTRAINT "qualified_share_opens_receipt_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualified_share_opens" ADD CONSTRAINT "qualified_share_opens_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_first_payments" ADD CONSTRAINT "share_first_payments_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_first_payments" ADD CONSTRAINT "share_first_payments_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_first_payments" ADD CONSTRAINT "share_first_payments_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_experiment_assignments" ADD CONSTRAINT "product_experiment_assignments_attribution_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_draft_opens_receipt_idx" ON "creation_draft_opens" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "creation_draft_opens_time_idx" ON "creation_draft_opens" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "creation_observations_story_idx" ON "creation_observations" USING btree ("story_id","accepted_at");--> statement-breakpoint
CREATE INDEX "creation_observations_receipt_idx" ON "creation_observations" USING btree ("receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualified_share_opens_story_browser_unique" ON "qualified_share_opens" USING btree ("story_id","receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualified_share_opens_story_author_unique" ON "qualified_share_opens" USING btree ("story_id","author_id");--> statement-breakpoint
CREATE INDEX "qualified_share_opens_buyer_idx" ON "qualified_share_opens" USING btree ("author_id","opened_at");
