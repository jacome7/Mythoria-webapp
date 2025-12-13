-- Add literary_persona enum and column to stories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'literary_persona') THEN
        CREATE TYPE "literary_persona" AS ENUM (
            'storyteller',
            'adventurous-narrator',
            'fun-reporter',
            'friendly-educator',
            'institutional-chronicler',
            'pub-buddy-narrator'
        );
    END IF;
END $$;

ALTER TABLE "stories"
    ADD COLUMN IF NOT EXISTS "literary_persona" "literary_persona";
