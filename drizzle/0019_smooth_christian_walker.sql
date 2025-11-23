ALTER TYPE "public"."credit_event_type" ADD VALUE IF NOT EXISTS 'selfPrinting' BEFORE 'refund';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"faq_key" text NOT NULL,
	"locale" varchar(10) NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content_mdx" text NOT NULL,
	"question_sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_key" text NOT NULL,
	"default_label" text NOT NULL,
	"description" text,
	"icon_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faq_sections_section_key_unique" UNIQUE("section_key")
);
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_section_id_faq_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."faq_sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "faq_entries_faq_key_locale_idx" ON "faq_entries" USING btree ("faq_key","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_locale_section_sort_idx" ON "faq_entries" USING btree ("locale","section_id","question_sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_section_id_idx" ON "faq_entries" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_locale_idx" ON "faq_entries" USING btree ("locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_faq_key_idx" ON "faq_entries" USING btree ("faq_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_is_published_idx" ON "faq_entries" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_title_search_idx" ON "faq_entries" USING gin (to_tsvector('english', "title"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_content_search_idx" ON "faq_entries" USING gin (to_tsvector('english', "content_mdx"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "faq_sections_section_key_idx" ON "faq_sections" USING btree ("section_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_sections_sort_order_idx" ON "faq_sections" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_sections_is_active_idx" ON "faq_sections" USING btree ("is_active");