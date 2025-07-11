ALTER TABLE "characters" ALTER COLUMN "age" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."character_age";--> statement-breakpoint
CREATE TYPE "public"."character_age" AS ENUM('infant', 'toddler', 'preschool', 'school_age', 'teenage', 'emerging_adult', 'seasoned_adult', 'midlife_mentor', 'elder', 'youngling', 'adult', 'senior');--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "age" SET DATA TYPE character_age USING "age"::character_age;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."character_type";--> statement-breakpoint
CREATE TYPE "public"."character_type" AS ENUM('Boy', 'Girl', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE character_type USING "type"::character_type;