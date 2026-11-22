ALTER TYPE "public"."literary_persona" ADD VALUE 'contextual-storyteller' BEFORE 'storyteller';--> statement-breakpoint
CREATE TABLE "biographer_admin_actions" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"caller" text NOT NULL,
	"operation" text NOT NULL,
	"reason" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"object_path" text NOT NULL,
	"content_type" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_book_versions" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"invite_hash" text NOT NULL,
	"resume_hash" text,
	"session_hash" text,
	"session_expires_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biographer_invitations_invite_hash_unique" UNIQUE("invite_hash"),
	CONSTRAINT "biographer_invitations_resume_hash_unique" UNIQUE("resume_hash"),
	CONSTRAINT "biographer_invitations_session_hash_unique" UNIQUE("session_hash")
);
--> statement-breakpoint
CREATE TABLE "biographer_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"access_version" integer DEFAULT 0 NOT NULL,
	"reviewed_revision" integer DEFAULT 0 NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"last_activity" timestamp with time zone,
	"follow_up" text,
	"role" text DEFAULT 'owner' NOT NULL,
	"consent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biographer_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid,
	"generation_snapshot" jsonb,
	"title" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT 'en-US' NOT NULL,
	"status" text DEFAULT 'collecting' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"live_enabled" boolean DEFAULT true NOT NULL,
	"live_seconds" integer DEFAULT 0 NOT NULL,
	"allowance_seconds" integer DEFAULT 10800 NOT NULL,
	"proposal" jsonb,
	"proposal_revision" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"turn_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"object_path" text NOT NULL,
	"content_type" text NOT NULL,
	"sha256" text NOT NULL,
	"bytes" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biographer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"ticket_hash" text NOT NULL,
	"ticket_expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"lease_id" uuid NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"accounted_at" timestamp with time zone,
	"reserved_seconds" integer DEFAULT 0 NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "biographer_sessions_ticket_hash_unique" UNIQUE("ticket_hash")
);
--> statement-breakpoint
CREATE TABLE "biographer_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"original_text" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"final" boolean DEFAULT false NOT NULL,
	"interrupted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biographer_admin_actions" ADD CONSTRAINT "biographer_admin_actions_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_assets" ADD CONSTRAINT "biographer_assets_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_assets" ADD CONSTRAINT "biographer_assets_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_book_versions" ADD CONSTRAINT "biographer_book_versions_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_book_versions" ADD CONSTRAINT "biographer_book_versions_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_events" ADD CONSTRAINT "biographer_events_session_id_biographer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."biographer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_invitations" ADD CONSTRAINT "biographer_invitations_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_invitations" ADD CONSTRAINT "biographer_invitations_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD CONSTRAINT "biographer_participants_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_projects" ADD CONSTRAINT "biographer_projects_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_projects" ADD CONSTRAINT "biographer_projects_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_segments" ADD CONSTRAINT "biographer_segments_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_segments" ADD CONSTRAINT "biographer_segments_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_sessions" ADD CONSTRAINT "biographer_sessions_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_sessions" ADD CONSTRAINT "biographer_sessions_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_turns" ADD CONSTRAINT "biographer_turns_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_turns" ADD CONSTRAINT "biographer_turns_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biographer_book_versions_revision_unique" ON "biographer_book_versions" USING btree ("project_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "biographer_owner_project_unique" ON "biographer_participants" USING btree ("project_id") WHERE "biographer_participants"."role" = 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "biographer_segment_sequence_unique" ON "biographer_segments" USING btree ("project_id","turn_id","sequence");