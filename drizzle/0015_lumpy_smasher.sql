DO $$ BEGIN
	CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_post_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" varchar(600) NOT NULL,
	"content_mdx" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug_base" varchar(140) NOT NULL,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"hero_image_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_base_unique" UNIQUE("slug_base")
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'blog_post_translations_post_id_blog_posts_id_fk'
	) THEN
		ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN IF EXISTS "html_uri";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN IF EXISTS "pdf_uri";