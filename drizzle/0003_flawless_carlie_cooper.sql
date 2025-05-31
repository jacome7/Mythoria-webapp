CREATE TABLE "leads" (
	"lead_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "place" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "additionalRequests" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "delivery_address" jsonb;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "dedication_message" text;