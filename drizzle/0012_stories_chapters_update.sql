-- Migration: Add chapters table and update stories table with new fields
-- This migration focuses specifically on the stories and chapters changes

-- Add new columns to stories table first
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "cover_uri" text;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "backcover_uri" text;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "has_audio" boolean DEFAULT false;

-- Create the chapters table
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

-- Add foreign key constraints after table creation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chapters_story_id_stories_story_id_fk' 
                   AND table_name = 'chapters') THEN
        ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_stories_story_id_fk" 
        FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chapters_author_id_authors_author_id_fk' 
                   AND table_name = 'chapters') THEN
        ALTER TABLE "chapters" ADD CONSTRAINT "chapters_author_id_authors_author_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "chapters_id_idx" ON "chapters" USING btree ("id");
CREATE INDEX IF NOT EXISTS "chapters_story_id_idx" ON "chapters" USING btree ("story_id");
CREATE INDEX IF NOT EXISTS "chapters_version_idx" ON "chapters" USING btree ("version");
CREATE INDEX IF NOT EXISTS "chapters_chapter_number_idx" ON "chapters" USING btree ("chapter_number");
CREATE INDEX IF NOT EXISTS "chapters_story_id_version_idx" ON "chapters" USING btree ("story_id","version");
CREATE INDEX IF NOT EXISTS "chapters_story_id_chapter_number_version_idx" ON "chapters" USING btree ("story_id","chapter_number","version");
