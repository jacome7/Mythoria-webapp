ALTER TABLE "fiscal_documents" ADD COLUMN "recovery_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD COLUMN "recovery_owner" text;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD COLUMN "recovery_payload_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD COLUMN "recovery_state" varchar(16);--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD COLUMN "recovery_expires_at" timestamp with time zone;