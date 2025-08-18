DO $$
BEGIN
	-- Only alter to text if currently of type character_age
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'age'
			AND udt_name = 'character_age'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "age" SET DATA TYPE text;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	DROP TYPE IF EXISTS "public"."character_age";
EXCEPTION WHEN undefined_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."character_age" AS ENUM('infant', 'toddler', 'preschool', 'school_age', 'teenage', 'emerging_adult', 'seasoned_adult', 'midlife_mentor', 'elder', 'youngling', 'adult', 'senior');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$
BEGIN
	-- Recast age column only if it exists and not already of enum type
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'age'
			AND data_type <> 'USER-DEFINED'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "age" SET DATA TYPE character_age USING "age"::character_age;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	-- Only alter to text if currently of enum character_type
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'type'
			AND udt_name = 'character_type'
	) THEN
		ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE text;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	DROP TYPE IF EXISTS "public"."character_type";
EXCEPTION WHEN undefined_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."character_type" AS ENUM('Boy', 'Girl', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- Normalize again defensively before re-casting
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
	ELSE "type"
END
WHERE "type" IS NOT NULL;

UPDATE "characters" SET "type" = 'Other' WHERE "type" IS NOT NULL AND "type" NOT IN ('Boy', 'Girl', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');
DO $$
BEGIN
	-- Recast type column only if not already of enum type
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