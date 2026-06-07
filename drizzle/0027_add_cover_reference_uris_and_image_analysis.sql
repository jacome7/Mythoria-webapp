ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "cover_reference_uris" jsonb;--> statement-breakpoint
ALTER TYPE "public"."ai_action_type" ADD VALUE IF NOT EXISTS 'image_analysis';
