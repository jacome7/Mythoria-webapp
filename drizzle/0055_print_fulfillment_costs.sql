CREATE TABLE "print_fulfillment_costs" (
	"print_request_id" uuid PRIMARY KEY NOT NULL,
	"lulu_job_id" varchar(32) NOT NULL,
	"job_created_at" timestamp with time zone NOT NULL,
	"amount_excl_tax" numeric NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount_eur" numeric(18, 2),
	"fx_rate" numeric,
	"fx_rate_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "print_fulfillment_costs_lulu_job_id_unique" UNIQUE("lulu_job_id"),
	CONSTRAINT "print_fulfillment_cost_native_amount_check" CHECK ("print_fulfillment_costs"."amount_excl_tax" >= 0),
	CONSTRAINT "print_fulfillment_cost_currency_check" CHECK ("print_fulfillment_costs"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "print_fulfillment_cost_fx_check" CHECK (("print_fulfillment_costs"."amount_eur" IS NULL AND "print_fulfillment_costs"."fx_rate" IS NULL AND "print_fulfillment_costs"."fx_rate_date" IS NULL)
        OR ("print_fulfillment_costs"."amount_eur" IS NOT NULL AND "print_fulfillment_costs"."amount_eur" >= 0 AND "print_fulfillment_costs"."fx_rate" IS NOT NULL
            AND "print_fulfillment_costs"."fx_rate" > 0 AND "print_fulfillment_costs"."fx_rate_date" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "print_fulfillments" ADD COLUMN "next_lulu_cost_check_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "print_fulfillment_costs" ADD CONSTRAINT "print_fulfillment_costs_print_request_id_print_fulfillments_print_request_id_fk" FOREIGN KEY ("print_request_id") REFERENCES "public"."print_fulfillments"("print_request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "print_fulfillment_cost_job_created_idx" ON "print_fulfillment_costs" USING btree ("job_created_at");--> statement-breakpoint
CREATE INDEX "print_fulfillment_lulu_cost_retry_idx" ON "print_fulfillments" USING btree ("next_lulu_cost_check_at","print_request_id") WHERE "print_fulfillments"."provider" = 'lulu' AND "print_fulfillments"."status" = 'submitted';