-- Migration: Add 'temporary' value to story_status enum
-- Safely add new enum value if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'story_status' AND e.enumlabel = 'temporary') THEN
        ALTER TYPE story_status ADD VALUE 'temporary' BEFORE 'draft';
    END IF;
END$$;
