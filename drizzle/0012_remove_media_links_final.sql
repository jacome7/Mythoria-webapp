-- Migration to safely remove media_links column if it still exists
-- This handles the case where the column might still be present in the database

-- Drop the media_links column if it exists
DO $$
BEGIN
    -- Check if the column exists before trying to drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        AND column_name = 'media_links'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "stories" DROP COLUMN "media_links";
    END IF;
END
$$;
