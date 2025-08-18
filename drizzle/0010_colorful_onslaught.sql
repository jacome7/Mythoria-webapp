-- Ensure the "type" column is text before updates (handles enum state)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'type'
			AND udt_name = 'character_type'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE text USING "type"::text;
	END IF;
END $$;

-- First, update existing character types to snake_case format
UPDATE characters SET type = 'boy' WHERE type = 'Boy';
UPDATE characters SET type = 'girl' WHERE type = 'Girl';
UPDATE characters SET type = 'man' WHERE type = 'Man';
UPDATE characters SET type = 'woman' WHERE type = 'Woman';
UPDATE characters SET type = 'boy' WHERE type = 'Baby'; -- Map Baby to boy as requested
UPDATE characters SET type = 'person' WHERE type = 'Person';
UPDATE characters SET type = 'dog' WHERE type = 'Dog';
UPDATE characters SET type = 'cat' WHERE type = 'Cat';
UPDATE characters SET type = 'bird' WHERE type = 'Bird';
UPDATE characters SET type = 'dragon' WHERE type = 'Dragon';
UPDATE characters SET type = 'elf_fairy_mythical' WHERE type = 'Elf';
UPDATE characters SET type = 'robot_cyborg' WHERE type = 'Robot';
UPDATE characters SET type = 'alien_extraterrestrial' WHERE type = 'Alien';
UPDATE characters SET type = 'other' WHERE type = 'Other';

-- Then change the column type to varchar
DO $$
BEGIN
	-- Only alter if not already character varying
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'type'
			AND data_type <> 'character varying'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE varchar(50);
	END IF;
END $$;
