-- Expand literary_persona enum with newly supported narrative voices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'literary_persona' AND e.enumlabel = 'classic-novelist'
  ) THEN
    ALTER TYPE literary_persona ADD VALUE 'classic-novelist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'literary_persona' AND e.enumlabel = 'noir-investigator'
  ) THEN
    ALTER TYPE literary_persona ADD VALUE 'noir-investigator';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'literary_persona' AND e.enumlabel = 'whimsical-poet'
  ) THEN
    ALTER TYPE literary_persona ADD VALUE 'whimsical-poet';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'literary_persona' AND e.enumlabel = 'scifi-analyst'
  ) THEN
    ALTER TYPE literary_persona ADD VALUE 'scifi-analyst';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'literary_persona' AND e.enumlabel = 'folklore-traditionalist'
  ) THEN
    ALTER TYPE literary_persona ADD VALUE 'folklore-traditionalist';
  END IF;
END$$;
