CREATE TYPE "public"."audiobook_status" AS ENUM('generating', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "audiobook_status" "audiobook_status";