ALTER TABLE "analytics_outbox" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "claim_token" uuid;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_outbox" ADD CONSTRAINT "analytics_outbox_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_outbox_claim_idx" ON "analytics_outbox" USING btree ("delivered_at","skipped_at","available_at","claimed_at");