-- The migrator runs this migration in a transaction. The lock keeps the explicit
-- duplicate check and unique-index creation in the same write-serialization window.
LOCK TABLE "fiscal_documents" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "fiscal_documents"
    WHERE "doc_num" IS NOT NULL
    GROUP BY "provider", "doc_type", coalesce("doc_series", ''), "doc_num"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate fiscal document remote identities; reconcile before migration';
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE "recovery_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"fiscal_document_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"state" varchar(16) NOT NULL,
	CONSTRAINT "recovery_tokens_state_check" CHECK ("recovery_tokens"."state" in ('reserved', 'submitted', 'reconciled', 'cancelled'))
);
--> statement-breakpoint
DROP INDEX "fiscal_documents_keyinvoice_doc_idx";--> statement-breakpoint
ALTER TABLE "recovery_tokens" ADD CONSTRAINT "recovery_tokens_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_remote_identity_unique" ON "fiscal_documents" USING btree ("provider","doc_type",coalesce("doc_series", ''),"doc_num") WHERE "fiscal_documents"."doc_num" is not null;