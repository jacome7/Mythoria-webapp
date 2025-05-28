ALTER TABLE "authors" ADD COLUMN "clerk_user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_clerk_user_id_unique" UNIQUE("clerk_user_id");