CREATE TABLE "biographer_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"object_path" text NOT NULL,
	"content_type" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biographer_assets" ADD CONSTRAINT "biographer_assets_project_id_biographer_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."biographer_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biographer_assets" ADD CONSTRAINT "biographer_assets_participant_id_biographer_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."biographer_participants"("id") ON DELETE cascade ON UPDATE no action;