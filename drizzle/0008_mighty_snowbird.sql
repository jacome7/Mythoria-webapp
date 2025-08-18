DO $$ BEGIN
	CREATE TYPE "public"."character_age" AS ENUM('newborn', 'infant', 'toddler', 'preschool', 'school_age', 'teenage', 'emerging_adult', 'seasoned_adult', 'midlife_mentor', 'elder', 'youngling', 'adult', 'senior');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."character_trait" AS ENUM('adaptable', 'brave', 'compassionate', 'curious', 'decisive', 'empathetic', 'generous', 'honest', 'imaginative', 'loyal', 'optimistic', 'patient', 'practical', 'resourceful', 'self-disciplined', 'sincere', 'witty', 'kind', 'conscientious', 'energetic', 'arrogant', 'callous', 'cowardly', 'cynical', 'deceitful', 'impulsive', 'jealous', 'lazy', 'manipulative', 'moody', 'reckless', 'selfish', 'vengeful', 'aloof', 'blunt', 'cautious', 'methodical');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'characters'
			AND column_name = 'passions'
	) THEN
		ALTER TABLE "characters" RENAME COLUMN "passions" TO "characteristics";
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "age" character_age;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "traits" json DEFAULT '[]'::json;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "characters_age_idx" ON "characters" USING btree ("age");--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN IF EXISTS "superpowers";