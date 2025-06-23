ALTER TYPE "public"."credit_event_type" ADD VALUE 'textEdit';--> statement-breakpoint
ALTER TYPE "public"."credit_event_type" ADD VALUE 'imageEdit';--> statement-breakpoint
CREATE TABLE "ai_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_edits_author_id_idx" ON "ai_edits" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "ai_edits_action_idx" ON "ai_edits" USING btree ("action");--> statement-breakpoint
CREATE INDEX "ai_edits_author_action_idx" ON "ai_edits" USING btree ("author_id","action");