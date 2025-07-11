CREATE TYPE "public"."character_age" AS ENUM('newborn', 'infant', 'toddler', 'preschool', 'school_age', 'teenage', 'emerging_adult', 'seasoned_adult', 'midlife_mentor', 'elder', 'youngling', 'adult', 'senior');--> statement-breakpoint
CREATE TYPE "public"."character_trait" AS ENUM('adaptable', 'brave', 'compassionate', 'curious', 'decisive', 'empathetic', 'generous', 'honest', 'imaginative', 'loyal', 'optimistic', 'patient', 'practical', 'resourceful', 'self-disciplined', 'sincere', 'witty', 'kind', 'conscientious', 'energetic', 'arrogant', 'callous', 'cowardly', 'cynical', 'deceitful', 'impulsive', 'jealous', 'lazy', 'manipulative', 'moody', 'reckless', 'selfish', 'vengeful', 'aloof', 'blunt', 'cautious', 'methodical');--> statement-breakpoint
ALTER TABLE "characters" RENAME COLUMN "passions" TO "characteristics";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "age" character_age;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "traits" json DEFAULT '[]'::json;--> statement-breakpoint
CREATE INDEX "characters_age_idx" ON "characters" USING btree ("age");--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "superpowers";