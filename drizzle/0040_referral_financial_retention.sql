ALTER TABLE "credits" DROP CONSTRAINT "credits_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_events" DROP CONSTRAINT "payment_events_order_id_payment_orders_order_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_orders" DROP CONSTRAINT "payment_orders_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "fiscal_document_events" DROP CONSTRAINT "fiscal_document_events_fiscal_document_id_fiscal_documents_id_fk";
--> statement-breakpoint
ALTER TABLE "fiscal_document_events" DROP CONSTRAINT "fiscal_document_events_order_id_payment_orders_order_id_fk";
--> statement-breakpoint
ALTER TABLE "fiscal_documents" DROP CONSTRAINT "fiscal_documents_order_id_payment_orders_order_id_fk";
--> statement-breakpoint
ALTER TABLE "fiscal_documents" DROP CONSTRAINT "fiscal_documents_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "keyinvoice_customers" DROP CONSTRAINT "keyinvoice_customers_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "author_credit_balances" DROP CONSTRAINT "author_credit_balances_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_ledger" DROP CONSTRAINT "credit_ledger_author_id_authors_author_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_referral_assignment_id_author_referral_assignments_assignment_id_fk" FOREIGN KEY ("referral_assignment_id") REFERENCES "public"."author_referral_assignments"("assignment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_referral_owner_id_referral_owners_referral_owner_id_fk" FOREIGN KEY ("referral_owner_id") REFERENCES "public"."referral_owners"("referral_owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_events" ADD CONSTRAINT "fiscal_document_events_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_events" ADD CONSTRAINT "fiscal_document_events_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_order_id_payment_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyinvoice_customers" ADD CONSTRAINT "keyinvoice_customers_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_credit_balances" ADD CONSTRAINT "author_credit_balances_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_author_id_authors_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("author_id") ON DELETE restrict ON UPDATE no action;