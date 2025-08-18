DO $$ BEGIN
	CREATE TYPE "public"."character_type" AS ENUM('Boy', 'Girl', 'Baby', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- Normalize existing string values to the allowed enum set before casting
UPDATE "characters"
SET "type" = CASE
	WHEN lower("type") IN ('woman','women') THEN 'Woman'
	WHEN lower("type") IN ('man','men') THEN 'Man'
	WHEN lower("type") IN ('girl','girls') THEN 'Girl'
	WHEN lower("type") IN ('boy','boys') THEN 'Boy'
	WHEN lower("type") IN ('dog','dogs','puppy','puppies') THEN 'Dog'
	WHEN lower("type") IN ('dragon','dragons') THEN 'Dragon'
	WHEN lower("type") IN ('animal','animals','cat','cats','bird','birds','fish','fishes','horse','horses','cow','cows','lion','lions','tiger','tigers') THEN 'Animal'
	WHEN lower("type") IN ('fantasy creature','fantasy_creature','creature','monsters','monster','goblin','goblins','elf','elves','dwarf','dwarves','fairy','fairies') THEN 'Fantasy Creature'
	WHEN lower("type") IN ('baby','babies','toddler','toddlers','infant','infants') THEN 'Baby'
	ELSE "type"
END
WHERE "type" IS NOT NULL;

-- Any remaining non-matching values are coerced to 'Other'
UPDATE "characters"
SET "type" = 'Other'
WHERE "type" IS NOT NULL
	AND "type" NOT IN ('Boy', 'Girl', 'Baby', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');

-- Now safely alter the column to enum
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'type'
			AND data_type <> 'USER-DEFINED'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE character_type USING "type"::character_type;
	END IF;
END $$;