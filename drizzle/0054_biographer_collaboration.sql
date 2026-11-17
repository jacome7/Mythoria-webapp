CREATE TABLE "biographer_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"invite_hash" text NOT NULL,
	"resume_hash" text,
	"session_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biographer_invitations_invite_hash_unique" UNIQUE("invite_hash"),
	CONSTRAINT "biographer_invitations_resume_hash_unique" UNIQUE("resume_hash"),
	CONSTRAINT "biographer_invitations_session_hash_unique" UNIQUE("session_hash")
);
--> statement-breakpoint
DROP INDEX "biographer_owner_project_unique";--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "relationship" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "status" text DEFAULT 'invited' NOT NULL;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "access_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "reviewed_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "contribution_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "last_activity" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "biographer_participants" ADD COLUMN "follow_up" text;--> statement-breakpoint
ALTER TABLE "biographer_invitations" ADD CONSTRAINT "biographer_invitations_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_invitations" ADD CONSTRAINT "biographer_invitations_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biographer_owner_project_unique" ON "biographer_participants" USING btree ("project_id") WHERE "biographer_participants"."role" = 'owner';