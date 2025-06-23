-- Add new credit event types for AI edits
ALTER TYPE "public"."credit_event_type" ADD VALUE 'textEdit';
ALTER TYPE "public"."credit_event_type" ADD VALUE 'imageEdit';

-- Create ai_edits table for tracking AI editing actions
CREATE TABLE "ai_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL CHECK (action IN ('textEdit', 'imageEdit')),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);

-- Create indexes for performance
CREATE INDEX "ai_edits_author_id_idx" ON "ai_edits" ("author_id");
CREATE INDEX "ai_edits_action_idx" ON "ai_edits" ("action");
CREATE INDEX "ai_edits_author_action_idx" ON "ai_edits" ("author_id", "action");

-- Add foreign key constraints
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;
