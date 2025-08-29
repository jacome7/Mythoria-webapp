-- Migration: convert singular primary_goal & audience to arrays primary_goals & audiences
-- Assumes earlier columns may be empty; performs data copy if values exist.

BEGIN;

-- Add new array columns if not exist
ALTER TABLE authors ADD COLUMN IF NOT EXISTS primary_goals primary_goal[] DEFAULT '{}'::primary_goal[];
ALTER TABLE authors ADD COLUMN IF NOT EXISTS audiences audience_for_stories[] DEFAULT '{}'::audience_for_stories[];

-- Copy existing singular values into array (only where array currently empty)
UPDATE authors
SET primary_goals = ARRAY[primary_goal]::primary_goal[]
WHERE primary_goal IS NOT NULL AND (primary_goals IS NULL OR cardinality(primary_goals) = 0);

UPDATE authors
SET audiences = ARRAY[audience]::audience_for_stories[]
WHERE audience IS NOT NULL AND (audiences IS NULL OR cardinality(audiences) = 0);

-- Drop old singular columns (will fail if they don't exist, so guard)
DO $$ BEGIN
  ALTER TABLE authors DROP COLUMN primary_goal;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE authors DROP COLUMN audience;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

COMMIT;
