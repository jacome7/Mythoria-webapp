-- Migration: onboarding profile enums and columns
-- NOTE: Uses IF NOT EXISTS for idempotency where possible.

-- Enums
DO $$ BEGIN
    CREATE TYPE gender AS ENUM ('female','male','prefer_not_to_say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE literary_age AS ENUM ('school_age','teen','emerging_adult','experienced_adult','midlife_mentor_or_elder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE primary_goal AS ENUM ('family_keepsake','personalized_gift','child_development','fun_and_creativity','friend_group_memories','company_engagement','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE audience_for_stories AS ENUM ('my_child','family_member','friend_group','myself','a_friend','varies');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns (if not exist)
ALTER TABLE authors ADD COLUMN IF NOT EXISTS gender gender;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS literary_age literary_age;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS primary_goal primary_goal;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS primary_goal_other TEXT;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS audience audience_for_stories;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
