CREATE TYPE "public"."character_role" AS ENUM('protagonist', 'antagonist', 'supporting', 'mentor', 'comic_relief', 'love_interest', 'sidekick', 'narrator', 'other');--> statement-breakpoint
ALTER TABLE "story_characters" ALTER COLUMN "role" SET DATA TYPE character_role USING "role"::character_role;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "role" character_role;