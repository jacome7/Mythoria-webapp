ALTER TABLE "blog_post_translations" ALTER COLUMN "summary" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "photo_gcs_uri" text;