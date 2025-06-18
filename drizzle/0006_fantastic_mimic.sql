CREATE TYPE "public"."story_rating" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TABLE "story_ratings" (
	"rating_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid,
	"rating" "story_rating" NOT NULL,
	"feedback" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"include_name_in_feedback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_user_id_authors_author_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;