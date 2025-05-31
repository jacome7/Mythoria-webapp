CREATE TYPE "public"."credit_event_type" AS ENUM('InitialCredit', 'CreditPurchase', 'eBookGeneration', 'audioBookGeneration', 'printOrder', 'refund');--> statement-breakpoint
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
ALTER TABLE "payments" DROP CONSTRAINT "payments_shipping_code_id_shipping_codes_shipping_code_id_fk";
--> statement-breakpoint
ALTER TABLE "author_credit_balances" ADD CONSTRAINT "author_credit_balances_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Drop the regular table and create as materialized view
DROP TABLE "author_credit_balances";
--> statement-breakpoint

-- Create materialized view for author credit balances
CREATE MATERIALIZED VIEW "author_credit_balances" AS
SELECT 
    a.author_id,
    COALESCE(SUM(cl.amount), 0) as total_credits,
    NOW() as last_updated
FROM authors a
LEFT JOIN credit_ledger cl ON a.author_id = cl.author_id
GROUP BY a.author_id;
--> statement-breakpoint

-- Create unique index for faster lookups and to enable REFRESH CONCURRENTLY
CREATE UNIQUE INDEX "author_credit_balances_author_id_idx" ON "author_credit_balances" ("author_id");
--> statement-breakpoint

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_author_credit_balances()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY author_credit_balances;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Create trigger to auto-refresh materialized view on credit_ledger changes
CREATE TRIGGER trigger_refresh_author_credit_balances
    AFTER INSERT OR UPDATE OR DELETE ON credit_ledger
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_author_credit_balances();