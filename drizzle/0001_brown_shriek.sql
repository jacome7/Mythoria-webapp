CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'failed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'failed', 'completed');--> statement-breakpoint
CREATE TABLE "story_generation_runs" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"gcp_workflow_execution" text,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"current_step" varchar(120),
	"error_message" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_generation_steps" (
	"run_id" uuid NOT NULL,
	"step_name" varchar(120) NOT NULL,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"detail_json" jsonb,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_generation_steps_run_id_step_name_pk" PRIMARY KEY("run_id","step_name")
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "story_generation_status" "run_status";--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "story_generation_completed_percentage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "story_generation_runs" ADD CONSTRAINT "story_generation_runs_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_generation_steps" ADD CONSTRAINT "story_generation_steps_run_id_story_generation_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."story_generation_runs"("run_id") ON DELETE cascade ON UPDATE no action;