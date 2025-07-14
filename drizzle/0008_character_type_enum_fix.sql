-- Create character_type enum
CREATE TYPE "public"."character_type" AS ENUM('Boy', 'Girl', 'Baby', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');

-- Update existing "Human" values to "Other" before converting column type
UPDATE "characters" SET "type" = 'Other' WHERE "type" = 'Human';
UPDATE "characters" SET "type" = 'Other' WHERE "type" = 'human';
UPDATE "characters" SET "type" = 'Other' WHERE "type" NOT IN ('Boy', 'Girl', 'Baby', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');

-- Now safely convert the column type
ALTER TABLE "characters" ALTER COLUMN "type" SET DATA TYPE character_type USING "type"::character_type;
