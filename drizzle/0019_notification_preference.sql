-- Migration: Add notification_preference enum and column to authors
-- Generated manually for feature: user notification preferences

-- 1. Create enum type
DO $$ BEGIN
    CREATE TYPE "notification_preference" AS ENUM ('essential', 'inspiration', 'news');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add column to authors table (if not exists)
ALTER TABLE "authors"
    ADD COLUMN IF NOT EXISTS "notification_preference" "notification_preference" NOT NULL DEFAULT 'inspiration';

-- 3. Backfill existing rows to default (safe no-op due to DEFAULT + NOT NULL)
UPDATE "authors" SET notification_preference = 'inspiration' WHERE notification_preference IS NULL;

-- 4. Comment for documentation
COMMENT ON COLUMN "authors"."notification_preference" IS 'User notification communication preference: essential | inspiration (default) | news';
