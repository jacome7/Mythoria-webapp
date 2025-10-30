CREATE TYPE "public"."email_status" AS ENUM('ready', 'sent', 'open', 'click', 'soft_bounce', 'hard_bounce', 'unsub');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"mobile_phone" varchar(30),
	"language" varchar(10) NOT NULL,
	"last_email_sent_at" timestamp with time zone,
	"email_status" "email_status" DEFAULT 'ready' NOT NULL,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DROP INDEX "stories_is_public_idx";--> statement-breakpoint
DROP INDEX "stories_is_featured_idx";--> statement-breakpoint
DROP INDEX "stories_slug_idx";--> statement-breakpoint
DROP INDEX "credit_ledger_story_id_idx";--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_email_status_idx" ON "leads" USING btree ("email_status");--> statement-breakpoint
CREATE INDEX "leads_last_email_sent_at_idx" ON "leads" USING btree ("last_email_sent_at");--> statement-breakpoint
CREATE INDEX "leads_status_sent_at_idx" ON "leads" USING btree ("email_status","last_email_sent_at");--> statement-breakpoint
CREATE INDEX "stories_is_public_idx" ON "stories" USING btree ("is_public") WHERE "stories"."is_public" = $1;--> statement-breakpoint
CREATE INDEX "stories_is_featured_idx" ON "stories" USING btree ("is_featured") WHERE "stories"."is_featured" = $1;--> statement-breakpoint
CREATE INDEX "stories_slug_idx" ON "stories" USING btree ("slug") WHERE "stories"."slug" is not null;--> statement-breakpoint
CREATE INDEX "credit_ledger_story_id_idx" ON "credit_ledger" USING btree ("story_id") WHERE "credit_ledger"."story_id" is not null;