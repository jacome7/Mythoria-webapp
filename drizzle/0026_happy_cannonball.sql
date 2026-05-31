CREATE TABLE "writing_personas" (
	"codename" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"pov" varchar(20) NOT NULL,
	"tone" integer DEFAULT 3 NOT NULL,
	"formality" integer DEFAULT 3 NOT NULL,
	"rhythm" integer DEFAULT 3 NOT NULL,
	"vocabulary" integer DEFAULT 3 NOT NULL,
	"fictionality" integer DEFAULT 3 NOT NULL,
	"dialogue_density" integer DEFAULT 3 NOT NULL,
	"sensoriality" integer DEFAULT 3 NOT NULL,
	"subtext_irony" integer DEFAULT 2 NOT NULL,
	"techniques" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"special_requirements" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "custom_writing_persona" jsonb;--> statement-breakpoint
ALTER TABLE "writing_personas" ADD CONSTRAINT "writing_personas_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "writing_personas_author_id_idx" ON "writing_personas" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "writing_personas_author_id_updated_at_idx" ON "writing_personas" USING btree ("author_id","updated_at");