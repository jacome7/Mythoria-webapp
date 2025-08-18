DO $$ BEGIN
	ALTER TYPE "public"."character_trait" ADD VALUE 'courageous' BEFORE 'curious';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TYPE "public"."character_trait" ADD VALUE 'pragmatic' BEFORE 'resourceful';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"image_uri" text,
	"image_thumbnail_uri" text,
	"html_content" text NOT NULL,
	"audio_uri" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "cover_uri" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "backcover_uri" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "has_audio" boolean DEFAULT false;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'chapters_story_id_stories_story_id_fk'
	) THEN
		ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'chapters_author_id_authors_author_id_fk'
	) THEN
		ALTER TABLE "chapters" ADD CONSTRAINT "chapters_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_id_idx" ON "chapters" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_story_id_idx" ON "chapters" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_version_idx" ON "chapters" USING btree ("version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_chapter_number_idx" ON "chapters" USING btree ("chapter_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_story_id_version_idx" ON "chapters" USING btree ("story_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_story_id_chapter_number_version_idx" ON "chapters" USING btree ("story_id","chapter_number","version");--> statement-breakpoint
DO $$ BEGIN
	DROP TYPE IF EXISTS "public"."character_type";
EXCEPTION WHEN undefined_object THEN NULL; END $$;