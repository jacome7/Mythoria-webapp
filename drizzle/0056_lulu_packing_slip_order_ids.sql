ALTER TABLE "print_fulfillments" ADD COLUMN "lulu_external_id" varchar(8);--> statement-breakpoint
CREATE UNIQUE INDEX "print_fulfillment_lulu_external_id_idx" ON "print_fulfillments" USING btree ("lulu_external_id");--> statement-breakpoint
CREATE INDEX "print_requests_order_number_idx" ON "print_requests" USING btree (left("id"::text, 8));