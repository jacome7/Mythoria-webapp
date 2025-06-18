CREATE TABLE "ai_actions" (
	"action_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"actionType" "ai_action_type" NOT NULL,
	"input_data" jsonb NOT NULL,
	"output_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"tokens_used" integer NOT NULL,
	"actionType" "ai_action_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_ratings" DROP CONSTRAINT "story_ratings_story_id_stories_story_id_fk";
--> statement-breakpoint
ALTER TABLE "story_ratings" DROP CONSTRAINT "story_ratings_user_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_actions" ALTER COLUMN "actionType" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "token_usage_tracking" ALTER COLUMN "action" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "token_usages" ALTER COLUMN "actionType" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ai_action_type";--> statement-breakpoint
CREATE TYPE "public"."ai_action_type" AS ENUM('story_structure', 'story_outline', 'chapter_writing', 'image_generation', 'story_review', 'character_generation', 'story_enhancement');--> statement-breakpoint
ALTER TABLE "ai_actions" ALTER COLUMN "actionType" SET DATA TYPE "public"."ai_action_type" USING "actionType"::"public"."ai_action_type";--> statement-breakpoint
ALTER TABLE "token_usage_tracking" ALTER COLUMN "action" SET DATA TYPE "public"."ai_action_type" USING "action"::"public"."ai_action_type";--> statement-breakpoint
ALTER TABLE "token_usages" ALTER COLUMN "actionType" SET DATA TYPE "public"."ai_action_type" USING "actionType"::"public"."ai_action_type";--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "target_audience" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "novel_style" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "graphical_style" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "media_links" jsonb;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "chapter_count" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;