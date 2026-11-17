ALTER TABLE "biographer_participants" ALTER COLUMN "consent_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "biographer_participants" ALTER COLUMN "consent_at" DROP NOT NULL;