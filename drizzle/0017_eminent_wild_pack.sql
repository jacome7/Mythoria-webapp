DO $$ BEGIN
    CREATE TYPE "public"."email_status" AS ENUM('ready', 'sent', 'open', 'click', 'soft_bounce', 'hard_bounce', 'unsub');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
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
DROP INDEX IF EXISTS "stories_is_public_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "stories_is_featured_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "stories_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "credit_ledger_story_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_email_status_idx" ON "leads" USING btree ("email_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_last_email_sent_at_idx" ON "leads" USING btree ("last_email_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_status_sent_at_idx" ON "leads" USING btree ("email_status","last_email_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_is_public_idx" ON "stories" USING btree ("is_public") WHERE "stories"."is_public" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_is_featured_idx" ON "stories" USING btree ("is_featured") WHERE "stories"."is_featured" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_slug_idx" ON "stories" USING btree ("slug") WHERE "stories"."slug" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_ledger_story_id_idx" ON "credit_ledger" USING btree ("story_id") WHERE "credit_ledger"."story_id" is not null;