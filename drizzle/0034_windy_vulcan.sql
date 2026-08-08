ALTER TABLE "analytics_attributions" ADD COLUMN "first_landing_path" varchar(160);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_primary_intent" varchar(120);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_source" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_medium" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_campaign" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_id" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_term" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_utm_content" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_click_identifier" varchar(255);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "first_click_identifier_kind" varchar(16);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "latest_path" varchar(160);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "latest_referrer_path" varchar(160);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "latest_attribution_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "attribution_id" uuid;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "page_location" varchar(2048);--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "page_referrer" varchar(2048);--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "engagement_time_msec" integer;--> statement-breakpoint
UPDATE "analytics_attributions"
SET
  "first_landing_path" = "landing_slug",
  "first_primary_intent" = "primary_intent",
  "first_utm_source" = "utm_source",
  "first_utm_medium" = "utm_medium",
  "first_utm_campaign" = "utm_campaign",
  "first_utm_id" = "utm_id",
  "first_utm_term" = "utm_term",
  "first_utm_content" = "utm_content",
  "first_click_identifier" = COALESCE("gclid", "gbraid", "wbraid"),
  "first_click_identifier_kind" = CASE
    WHEN "gclid" IS NOT NULL THEN 'gclid'
    WHEN "gbraid" IS NOT NULL THEN 'gbraid'
    WHEN "wbraid" IS NOT NULL THEN 'wbraid'
    ELSE NULL
  END,
  "latest_path" = "landing_slug",
  "latest_attribution_at" = "created_at";--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD CONSTRAINT "analytics_outbox_attribution_id_analytics_attributions_attribution_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."analytics_attributions"("attribution_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_outbox_attribution_id_idx" ON "analytics_outbox" USING btree ("attribution_id");
