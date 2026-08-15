ALTER TABLE "analytics_attributions" ADD COLUMN "story_share_item_id" varchar(12);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "story_share_method" varchar(32);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "story_share_scope" varchar(32);--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "story_share_touched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_attributions" ADD COLUMN "story_share_expires_at" timestamp with time zone;