CREATE TYPE "public"."print_provider_integration" AS ENUM('email', 'api');--> statement-breakpoint
CREATE TYPE "public"."print_request_status" AS ENUM('requested', 'in_printing', 'packing', 'shipped', 'delivered', 'cancelled', 'error');--> statement-breakpoint
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
	"pdf_url" text NOT NULL,
	"status" "print_request_status" DEFAULT 'requested' NOT NULL,
	"shipping_id" uuid,
	"print_provider_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_shipping_id_addresses_address_id_fk" FOREIGN KEY ("shipping_id") REFERENCES "public"."addresses"("address_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_requests" ADD CONSTRAINT "print_requests_print_provider_id_print_providers_id_fk" FOREIGN KEY ("print_provider_id") REFERENCES "public"."print_providers"("id") ON DELETE restrict ON UPDATE no action;