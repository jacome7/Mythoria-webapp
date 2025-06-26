CREATE TYPE "public"."access_level" AS ENUM('view', 'edit');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('billing', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."ai_action_type" AS ENUM('story_structure', 'story_outline', 'chapter_writing', 'image_generation', 'image_edit', 'story_review', 'character_generation', 'story_enhancement', 'audio_generation', 'content_validation', 'test');--> statement-breakpoint
CREATE TYPE "public"."character_role" AS ENUM('protagonist', 'antagonist', 'supporting', 'mentor', 'comic_relief', 'love_interest', 'sidekick', 'narrator', 'other');--> statement-breakpoint
CREATE TYPE "public"."collaborator_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."credit_event_type" AS ENUM('initialCredit', 'creditPurchase', 'eBookGeneration', 'audioBookGeneration', 'printOrder', 'refund', 'voucher', 'promotion', 'textEdit', 'imageEdit');--> statement-breakpoint
CREATE TYPE "public"."graphical_style" AS ENUM('cartoon', 'realistic', 'watercolor', 'digital_art', 'hand_drawn', 'minimalist', 'vintage', 'comic_book', 'anime', 'pixar_style', 'disney_style', 'sketch', 'oil_painting', 'colored_pencil');--> statement-breakpoint
CREATE TYPE "public"."novel_style" AS ENUM('adventure', 'fantasy', 'mystery', 'romance', 'science_fiction', 'historical', 'contemporary', 'fairy_tale', 'comedy', 'drama', 'horror', 'thriller', 'biography', 'educational', 'poetry', 'sports_adventure');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'paypal', 'revolut', 'other');--> statement-breakpoint
CREATE TYPE "public"."print_provider_integration" AS ENUM('email', 'api');--> statement-breakpoint
CREATE TYPE "public"."print_request_status" AS ENUM('requested', 'in_printing', 'packing', 'shipped', 'delivered', 'cancelled', 'error');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'failed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'failed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."story_rating" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('draft', 'writing', 'published');--> statement-breakpoint
CREATE TYPE "public"."target_audience" AS ENUM('children_0-2', 'children_3-6', 'children_7-10', 'children_11-14', 'young_adult_15-17', 'adult_18+', 'all_ages');--> statement-breakpoint
CREATE TABLE "addresses" (
	"address_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "address_type" NOT NULL,
	"line1" varchar(255) NOT NULL,
	"line2" varchar(255),
	"city" varchar(120) NOT NULL,
	"state_region" varchar(120),
	"postal_code" varchar(20),
	"country" varchar(2) NOT NULL,
	"phone" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"author_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"fiscal_number" varchar(40),
	"mobile_phone" varchar(30),
	"last_login_at" timestamp with time zone,
	"preferred_locale" varchar(5) DEFAULT 'en',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "authors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"lead_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"access_level" "access_level" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"story_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"plot_description" text,
	"story_language" varchar(5) DEFAULT 'en-US' NOT NULL,
	"synopsis" text,
	"place" text,
	"additionalRequests" text,
	"target_audience" "target_audience",
	"novel_style" "novel_style",
	"graphical_style" "graphical_style",
	"status" "story_status" DEFAULT 'draft',
	"features" jsonb,
	"delivery_address" jsonb,
	"dedication_message" text,
	"html_uri" text,
	"pdf_uri" text,
	"audiobook_uri" jsonb,
	"slug" text,
	"is_public" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"feature_image_uri" text,
	"chapter_count" integer DEFAULT 6 NOT NULL,
	"story_generation_status" "run_status",
	"story_generation_completed_percentage" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_collaborators" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "collaborator_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_collaborators_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
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
CREATE TABLE "story_versions" (
	"story_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"text_jsonb" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"character_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"name" varchar(120) NOT NULL,
	"type" varchar(60),
	"role" character_role,
	"passions" text,
	"superpowers" text,
	"physical_description" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_characters" (
	"story_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"role" character_role,
	CONSTRAINT "story_characters_story_id_character_id_pk" PRIMARY KEY("story_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"credit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"payment_method_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_ref" varchar(255) NOT NULL,
	"brand" varchar(60),
	"last4" varchar(4),
	"exp_month" integer,
	"exp_year" integer,
	"billing_details" jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"payment_method_id" uuid,
	"shipping_code_id" uuid,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider_payment_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_codes" (
	"shipping_code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"address_id" uuid NOT NULL,
	"carrier" varchar(120),
	"tracking_code" varchar(120) NOT NULL,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "author_credit_balances" (
	"author_id" uuid PRIMARY KEY NOT NULL,
	"total_credits" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" integer NOT NULL,
	"credit_event_type" "credit_event_type" NOT NULL,
	"purchase_id" uuid,
	"story_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_code" varchar(50) NOT NULL,
	"credits" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_service_code_unique" UNIQUE("service_code")
);
--> statement-breakpoint
CREATE TABLE "story_ratings" (
	"rating_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid,
	"rating" "story_rating" NOT NULL,
	"feedback" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"include_name_in_feedback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_usage_tracking" (
	"token_usage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"action" "ai_action_type" NOT NULL,
	"ai_model" varchar(100) NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost_in_euros" numeric(10, 6) NOT NULL,
	"input_prompt_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"vat_number" varchar(50),
	"email_address" varchar(255) NOT NULL,
	"phone_number" varchar(30),
	"address" text NOT NULL,
	"postal_code" varchar(20),
	"city" varchar(120) NOT NULL,
	"country" varchar(2) NOT NULL,
	"prices" jsonb NOT NULL,
	"integration" "print_provider_integration" DEFAULT 'email' NOT NULL,
	"available_countries" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"pdf_url" text NOT NULL,
	"status" "print_request_status" DEFAULT 'requested' NOT NULL,
	"shipping_id" uuid,
	"print_provider_id" uuid NOT NULL,
	"printing_options" jsonb NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_collaborators" ADD CONSTRAINT "story_collaborators_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_collaborators" ADD CONSTRAINT "story_collaborators_user_id_authors_author_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_generation_runs" ADD CONSTRAINT "story_generation_runs_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_generation_steps" ADD CONSTRAINT "story_generation_steps_run_id_story_generation_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."story_generation_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_characters" ADD CONSTRAINT "story_characters_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_characters" ADD CONSTRAINT "story_characters_character_id_characters_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("character_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_payment_methods_payment_method_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("payment_method_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_codes" ADD CONSTRAINT "shipping_codes_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_codes" ADD CONSTRAINT "shipping_codes_address_id_addresses_address_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("address_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_credit_balances" ADD CONSTRAINT "author_credit_balances_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_ratings" ADD CONSTRAINT "story_ratings_user_id_authors_author_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_shipping_id_addresses_address_id_fk" FOREIGN KEY ("shipping_id") REFERENCES "public"."addresses"("address_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_print_provider_id_print_providers_id_fk" FOREIGN KEY ("print_provider_id") REFERENCES "public"."print_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_edits" ADD CONSTRAINT "ai_edits_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_author_id_idx" ON "addresses" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "addresses_type_idx" ON "addresses" USING btree ("type");--> statement-breakpoint
CREATE INDEX "authors_clerk_user_id_idx" ON "authors" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "authors_email_idx" ON "authors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "authors_last_login_at_idx" ON "authors" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "authors_created_at_idx" ON "authors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_author_id_idx" ON "events" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "events_event_type_idx" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "share_links_story_id_idx" ON "share_links" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "share_links_expires_at_idx" ON "share_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "share_links_revoked_idx" ON "share_links" USING btree ("revoked");--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stories_status_created_at_idx" ON "stories" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "stories_author_id_updated_at_idx" ON "stories" USING btree ("author_id","updated_at");--> statement-breakpoint
CREATE INDEX "stories_author_id_created_at_idx" ON "stories" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "stories_author_id_status_idx" ON "stories" USING btree ("author_id","status");--> statement-breakpoint
CREATE INDEX "stories_is_public_idx" ON "stories" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "stories_is_featured_idx" ON "stories" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "story_collaborators_user_id_idx" ON "story_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "story_gen_runs_story_id_idx" ON "story_generation_runs" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_gen_runs_status_idx" ON "story_generation_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "story_gen_runs_story_id_status_idx" ON "story_generation_runs" USING btree ("story_id","status");--> statement-breakpoint
CREATE INDEX "story_gen_runs_created_at_idx" ON "story_generation_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "characters_author_id_idx" ON "characters" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "characters_created_at_idx" ON "characters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "characters_role_idx" ON "characters" USING btree ("role");--> statement-breakpoint
CREATE INDEX "story_characters_character_id_idx" ON "story_characters" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "payment_methods_author_id_idx" ON "payment_methods" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "payment_methods_provider_idx" ON "payment_methods" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_methods_is_default_idx" ON "payment_methods" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "payments_author_id_idx" ON "payments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_author_id_created_at_idx" ON "payments" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_author_id_idx" ON "credit_ledger" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_author_id_created_at_idx" ON "credit_ledger" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_event_type_idx" ON "credit_ledger" USING btree ("credit_event_type");--> statement-breakpoint
CREATE INDEX "credit_ledger_created_at_idx" ON "credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_story_id_idx" ON "credit_ledger" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "token_usage_story_id_idx" ON "token_usage_tracking" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "token_usage_author_id_idx" ON "token_usage_tracking" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "token_usage_created_at_idx" ON "token_usage_tracking" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "token_usage_author_id_created_at_idx" ON "token_usage_tracking" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "token_usage_action_idx" ON "token_usage_tracking" USING btree ("action");--> statement-breakpoint
CREATE INDEX "token_usage_ai_model_idx" ON "token_usage_tracking" USING btree ("ai_model");--> statement-breakpoint
CREATE INDEX "ai_edits_author_id_idx" ON "ai_edits" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "ai_edits_action_idx" ON "ai_edits" USING btree ("action");--> statement-breakpoint
CREATE INDEX "ai_edits_author_action_idx" ON "ai_edits" USING btree ("author_id","action");