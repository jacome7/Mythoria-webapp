-- Add chapter_count field to stories table
ALTER TABLE "stories" ADD COLUMN "chapter_count" integer DEFAULT 6 NOT NULL;
