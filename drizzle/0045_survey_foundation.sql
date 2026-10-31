CREATE TABLE "survey_answers" (
	"answer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"survey_version_id" uuid NOT NULL,
	"question_id" varchar(64) NOT NULL,
	"dimension" varchar(64) NOT NULL,
	"option_id" varchar(64),
	"value_numeric" double precision,
	"is_not_applicable" boolean DEFAULT false NOT NULL,
	"has_other_text" boolean DEFAULT false NOT NULL,
	"is_skipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_answers_response_question_option_unique" UNIQUE NULLS NOT DISTINCT("response_id","question_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "survey_invitations" (
	"invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"cohort_key" varchar(32) NOT NULL,
	"survey_version_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"is_holdout" boolean DEFAULT false NOT NULL,
	"cohort_snapshot" jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'not_started' NOT NULL,
	"opened_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_invitations_status_check" CHECK ("survey_invitations"."status" in ('not_started','opened','started','submitted','expired'))
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"response_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"survey_version_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'in_progress' NOT NULL,
	"draft_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shown_question_ids" text[],
	"locale" varchar(5) NOT NULL,
	"submission_key" varchar(128),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_saved_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"duration_ms" integer,
	CONSTRAINT "survey_responses_invitation_id_unique" UNIQUE("invitation_id"),
	CONSTRAINT "survey_responses_submission_key_unique" UNIQUE("submission_key"),
	CONSTRAINT "survey_responses_status_check" CHECK ("survey_responses"."status" in ('in_progress','submitted'))
);
--> statement-breakpoint
CREATE TABLE "survey_reward_entitlements" (
	"entitlement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"reward_type" varchar(16),
	"story_id" uuid,
	"status" varchar(24) DEFAULT 'eligible' NOT NULL,
	"product_run_id" uuid,
	"expires_at" timestamp with time zone,
	"selected_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_reward_entitlements_invitation_id_unique" UNIQUE("invitation_id"),
	CONSTRAINT "survey_reward_entitlements_response_id_unique" UNIQUE("response_id"),
	CONSTRAINT "survey_reward_entitlements_reward_type_check" CHECK ("survey_reward_entitlements"."reward_type" is null or "survey_reward_entitlements"."reward_type" in ('pdf','audiobook')),
	CONSTRAINT "survey_reward_entitlements_status_check" CHECK ("survey_reward_entitlements"."status" in ('eligible','pending_story','selected','processing','delivered','failed','expired'))
);
--> statement-breakpoint
CREATE TABLE "survey_studies" (
	"study_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_key" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"reward_policy" jsonb,
	"holdout_percent" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_at" timestamp with time zone,
	CONSTRAINT "survey_studies_study_key_unique" UNIQUE("study_key"),
	CONSTRAINT "survey_studies_status_check" CHECK ("survey_studies"."status" in ('draft','active','closed','archived')),
	CONSTRAINT "survey_studies_holdout_check" CHECK ("survey_studies"."holdout_percent" between 0 and 50)
);
--> statement-breakpoint
CREATE TABLE "survey_study_cohorts" (
	"study_cohort_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"cohort_key" varchar(32) NOT NULL,
	"survey_version_id" uuid NOT NULL,
	"invite_campaign_id" varchar(64),
	"reminder_campaign_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_text_answers" (
	"text_answer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"survey_version_id" uuid NOT NULL,
	"question_id" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"option_id" varchar(64),
	"text_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redacted_at" timestamp with time zone,
	CONSTRAINT "survey_text_answers_kind_check" CHECK ("survey_text_answers"."kind" in ('free_text','other_text'))
);
--> statement-breakpoint
CREATE TABLE "survey_versions" (
	"survey_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"schema_version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"definition_hash" varchar(64) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"survey_id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"purpose" text NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"current_version" integer,
	"internal_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surveys_status_check" CHECK ("surveys"."status" in ('draft','active','archived'))
);
--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD COLUMN "funding_source" varchar(24) DEFAULT 'credits' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_generation_requests" ADD COLUMN "reward_entitlement_id" uuid;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_survey_responses_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."survey_responses"("response_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_survey_version_id_survey_versions_survey_version_id_fk" FOREIGN KEY ("survey_version_id") REFERENCES "public"."survey_versions"("survey_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_invitations" ADD CONSTRAINT "survey_invitations_study_id_survey_studies_study_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."survey_studies"("study_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_invitations" ADD CONSTRAINT "survey_invitations_survey_version_id_survey_versions_survey_version_id_fk" FOREIGN KEY ("survey_version_id") REFERENCES "public"."survey_versions"("survey_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_invitations" ADD CONSTRAINT "survey_invitations_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_invitation_id_survey_invitations_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."survey_invitations"("invitation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_version_id_survey_versions_survey_version_id_fk" FOREIGN KEY ("survey_version_id") REFERENCES "public"."survey_versions"("survey_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reward_entitlements" ADD CONSTRAINT "survey_reward_entitlements_invitation_id_survey_invitations_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."survey_invitations"("invitation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reward_entitlements" ADD CONSTRAINT "survey_reward_entitlements_response_id_survey_responses_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."survey_responses"("response_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reward_entitlements" ADD CONSTRAINT "survey_reward_entitlements_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reward_entitlements" ADD CONSTRAINT "survey_reward_entitlements_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_reward_entitlements" ADD CONSTRAINT "survey_reward_entitlements_product_run_id_product_generation_requests_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_generation_requests"("run_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_study_cohorts" ADD CONSTRAINT "survey_study_cohorts_study_id_survey_studies_study_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."survey_studies"("study_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_study_cohorts" ADD CONSTRAINT "survey_study_cohorts_survey_version_id_survey_versions_survey_version_id_fk" FOREIGN KEY ("survey_version_id") REFERENCES "public"."survey_versions"("survey_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_text_answers" ADD CONSTRAINT "survey_text_answers_response_id_survey_responses_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."survey_responses"("response_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_text_answers" ADD CONSTRAINT "survey_text_answers_survey_version_id_survey_versions_survey_version_id_fk" FOREIGN KEY ("survey_version_id") REFERENCES "public"."survey_versions"("survey_version_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_survey_id_surveys_survey_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("survey_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_answers_version_question_option_idx" ON "survey_answers" USING btree ("survey_version_id","question_id","option_id");--> statement-breakpoint
CREATE INDEX "survey_answers_response_idx" ON "survey_answers" USING btree ("response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_invitations_study_author_unique" ON "survey_invitations" USING btree ("study_id","author_id");--> statement-breakpoint
CREATE INDEX "survey_invitations_study_cohort_status_idx" ON "survey_invitations" USING btree ("study_id","cohort_key","status");--> statement-breakpoint
CREATE INDEX "survey_invitations_author_idx" ON "survey_invitations" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "survey_responses_version_status_idx" ON "survey_responses" USING btree ("survey_version_id","status");--> statement-breakpoint
CREATE INDEX "survey_reward_entitlements_author_status_idx" ON "survey_reward_entitlements" USING btree ("author_id","status");--> statement-breakpoint
CREATE INDEX "survey_reward_entitlements_status_idx" ON "survey_reward_entitlements" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_study_cohorts_study_cohort_unique" ON "survey_study_cohorts" USING btree ("study_id","cohort_key");--> statement-breakpoint
CREATE INDEX "survey_text_answers_version_question_idx" ON "survey_text_answers" USING btree ("survey_version_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_versions_survey_version_unique" ON "survey_versions" USING btree ("survey_id","version");--> statement-breakpoint
CREATE INDEX "product_generation_requests_reward_entitlement_id_idx" ON "product_generation_requests" USING btree ("reward_entitlement_id");