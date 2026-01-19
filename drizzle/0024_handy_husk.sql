CREATE TYPE "public"."partner_service_scope" AS ENUM('local', 'national', 'international');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('active', 'draft', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('printer', 'attraction', 'retail', 'other');--> statement-breakpoint
ALTER TYPE "public"."literary_persona" ADD VALUE IF NOT EXISTS 'classic-novelist';--> statement-breakpoint
ALTER TYPE "public"."literary_persona" ADD VALUE IF NOT EXISTS 'noir-investigator';--> statement-breakpoint
ALTER TYPE "public"."literary_persona" ADD VALUE IF NOT EXISTS 'whimsical-poet';--> statement-breakpoint
ALTER TYPE "public"."literary_persona" ADD VALUE IF NOT EXISTS 'scifi-analyst';--> statement-breakpoint
ALTER TYPE "public"."literary_persona" ADD VALUE IF NOT EXISTS 'folklore-traditionalist';--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "partner_type" NOT NULL,
	"logo_url" text NOT NULL,
	"website_url" text,
	"email" text,
	"mobile_phone" varchar(30),
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"postal_code" text,
	"country_code" varchar(2),
	"short_description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"service_scope" "partner_service_scope",
	"status" "partner_status" DEFAULT 'active' NOT NULL,
	"display_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "partners_status_idx" ON "partners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partners_type_idx" ON "partners" USING btree ("type");--> statement-breakpoint
CREATE INDEX "partners_country_idx" ON "partners" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "partners_city_idx" ON "partners" USING btree ("city");--> statement-breakpoint
CREATE INDEX "partners_display_order_idx" ON "partners" USING btree ("display_order");