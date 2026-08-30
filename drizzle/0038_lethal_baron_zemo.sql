ALTER TABLE "authors" ADD COLUMN "email_status" "email_status" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "email_status_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "acquisition_campaign_recipient_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "email_campaign_recipient_id" uuid;--> statement-breakpoint
CREATE INDEX "authors_email_status_idx" ON "authors" USING btree ("email_status");--> statement-breakpoint
CREATE INDEX "authors_acquisition_campaign_recipient_idx" ON "authors" USING btree ("acquisition_campaign_recipient_id");--> statement-breakpoint
CREATE INDEX "payment_orders_email_campaign_recipient_idx" ON "payment_orders" USING btree ("email_campaign_recipient_id");