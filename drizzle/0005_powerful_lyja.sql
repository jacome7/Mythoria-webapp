-- Add URI fields for story content files
ALTER TABLE "stories" ADD COLUMN "html_uri" text;
ALTER TABLE "stories" ADD COLUMN "pdf_uri" text;
ALTER TABLE "stories" ADD COLUMN "audiobook_uri" jsonb;
