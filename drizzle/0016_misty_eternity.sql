DO $$ BEGIN
    CREATE TYPE "public"."audience_for_stories" AS ENUM('my_child', 'family_member', 'friend_group', 'myself', 'a_friend', 'varies');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'prefer_not_to_say');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."literary_age" AS ENUM('school_age', 'teen', 'emerging_adult', 'experienced_adult', 'midlife_mentor_or_elder');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."notification_preference" AS ENUM('essential', 'inspiration', 'news');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."primary_goal" AS ENUM('family_keepsake', 'personalized_gift', 'child_development', 'fun_and_creativity', 'friend_group_memories', 'company_engagement', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."story_status" ADD VALUE IF NOT EXISTS 'temporary' BEFORE 'draft';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_code_redemptions" (
	"promotion_code_redemption_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_code_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credits_granted" integer NOT NULL,
	"credit_ledger_entry_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_codes" (
	"promotion_code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"type" varchar(20) DEFAULT 'partner' NOT NULL,
	"credit_amount" integer NOT NULL,
	"max_global_redemptions" integer,
	"max_redemptions_per_user" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"referrer_author_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "promotion_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "gender" "gender";--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "literary_age" "literary_age";--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "primary_goals" "primary_goal"[] DEFAULT '{}'::primary_goal[];--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "primary_goal_other" varchar(160);--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "audiences" "audience_for_stories"[] DEFAULT '{}'::audience_for_stories[];--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "interests" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "notification_preference" "notification_preference" DEFAULT 'inspiration' NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "promotion_code_redemptions" ADD CONSTRAINT "promotion_code_redemptions_promotion_code_id_promotion_codes_promotion_code_id_fk" FOREIGN KEY ("promotion_code_id") REFERENCES "public"."promotion_codes"("promotion_code_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "promotion_code_redemptions" ADD CONSTRAINT "promotion_code_redemptions_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_referrer_author_id_authors_author_id_fk" FOREIGN KEY ("referrer_author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotion_code_redemptions_code_idx" ON "promotion_code_redemptions" USING btree ("promotion_code_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotion_code_redemptions_author_idx" ON "promotion_code_redemptions" USING btree ("author_id");