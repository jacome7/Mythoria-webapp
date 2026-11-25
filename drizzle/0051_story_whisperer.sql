CREATE TABLE "story_whisperer_voice_accounts" (
	"author_id" uuid PRIMARY KEY NOT NULL,
	"allowance_seconds" integer DEFAULT 10800 NOT NULL,
	"live_seconds" integer DEFAULT 0 NOT NULL,
	"live_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_whisperer_voice_actions" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"caller" text NOT NULL,
	"operation" text NOT NULL,
	"reason" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_whisperer_deleted_drafts" (
	"author_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	CONSTRAINT "story_whisperer_deleted_drafts_author_id_draft_id_pk" PRIMARY KEY("author_id","draft_id")
);
--> statement-breakpoint
CREATE TABLE "story_whisperer_handoffs" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"project_id" uuid,
	"revision" integer NOT NULL,
	"user_description" text NOT NULL,
	"image_object_paths" jsonb NOT NULL,
	"dispatch_reserved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_whisperer_interviews" (
	"author_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"readiness" jsonb,
	"readiness_revision" integer,
	"context" jsonb,
	"latest_question" jsonb,
	CONSTRAINT "story_whisperer_interviews_author_id_draft_id_pk" PRIMARY KEY("author_id","draft_id"),
	CONSTRAINT "story_whisperer_interviews_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "story_whisperer_voice_accounts" ADD CONSTRAINT "story_whisperer_voice_accounts_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_voice_actions" ADD CONSTRAINT "story_whisperer_voice_actions_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_deleted_drafts" ADD CONSTRAINT "story_whisperer_deleted_drafts_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_handoffs" ADD CONSTRAINT "story_whisperer_handoffs_draft_id_stories_story_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_handoffs" ADD CONSTRAINT "story_whisperer_handoffs_project_id_story_whisperer_interviews_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."story_whisperer_interviews"("project_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_interviews" ADD CONSTRAINT "story_whisperer_interviews_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_whisperer_interviews" ADD CONSTRAINT "story_whisperer_interviews_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_whisperer_handoffs_project_idx" ON "story_whisperer_handoffs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "story_whisperer_handoffs_draft_idx" ON "story_whisperer_handoffs" USING btree ("draft_id");