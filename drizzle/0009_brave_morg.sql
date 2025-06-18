ALTER TYPE "public"."ai_action_type" ADD VALUE 'audio_generation';--> statement-breakpoint
ALTER TYPE "public"."ai_action_type" ADD VALUE 'content_validation';--> statement-breakpoint
ALTER TABLE "ai_actions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "token_usages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_actions" CASCADE;--> statement-breakpoint
DROP TABLE "token_usages" CASCADE;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "target_audience" SET DATA TYPE "public"."target_audience" USING "target_audience"::"public"."target_audience";--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "novel_style" SET DATA TYPE "public"."novel_style" USING "novel_style"::"public"."novel_style";--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "graphical_style" SET DATA TYPE "public"."graphical_style" USING "graphical_style"::"public"."graphical_style";--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_user_id_authors_author_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "media_links";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "chapter_count";