# KeyInvoice Integration Plan

## Objective

Implement autonomous Portuguese-compliant invoicing for every completed Mythoria Stripe payment, using KeyInvoice as the certified invoicing system and keeping Stripe as the payment processor only.

The offline KeyInvoice API extract is stored separately in [keyInvoice-api-reference.md](keyInvoice-api-reference.md). It was extracted from the authenticated KeyInvoice documentation page on 2026-06-04 and includes all 80 documented methods.

## Current Findings

### Portuguese invoicing requirements to account for

- Portuguese VAT taxpayers must issue an invoice for each supply of goods or services and also for advance payments, regardless of whether the customer asks for one. Source: CIVA article 29.
- Standard invoices must be dated, sequentially numbered, and include supplier/customer identification where required, line descriptions, taxable base, VAT rate, VAT amount, and exemption reason when applicable. Source: CIVA article 36.
- Simplified invoices are allowed only in specific national cases and value limits. For Mythoria automation, prefer `Fatura-Recibo` or `Fatura` in KeyInvoice rather than relying on simplified invoices. Source: CIVA article 40.
- Invoices and fiscally relevant documents processed by software must use compliant/certified invoicing processing, QR code, and ATCUD rules. Source: Decreto-Lei 28/2019, Portaria 195/2020, AT invoicing rules.
- Invoice elements must be communicated to AT/e-Fatura on the applicable legal schedule. Current AT pages reference communication to e-Fatura by the 5th day of the following month in user-facing e-Fatura material; older pages reference former day-12 rules. The implementation should rely on KeyInvoice AT communication/SAF-T features and the accountant should confirm the operational deadline for Mythoria.
- The reduced VAT rate in mainland Portugal is 6%; the Portuguese VAT rate table also shows reduced rates of 4% for the Autonomous Regions. Source: AT Portuguese tax rates.
- AT material and binding rulings indicate that books/publications in electronic format may qualify for the reduced rate under Lista I, verba 2.1, but Mythoria must confirm with a certified accountant that each paid item/credit package qualifies as a 6% publication/e-book/audiobook supply rather than a generic digital service.
- EU B2C electronically supplied services can be taxed where the customer resides, with OSS and threshold rules potentially applying. Do not hard-code 6% for every geography until Mythoria's accountant confirms the legal treatment for Portugal, EU B2C, EU B2B reverse charge, autonomous regions, and non-EU customers.

Primary sources researched:

- AT CIVA article 29: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva29.aspx`
- AT CIVA article 36: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva36.aspx`
- AT CIVA article 40: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva40.aspx`
- AT invoicing rules: `https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Negocios/Faturacao/Regras_de_faturacao/Paginas/default.aspx`
- ATCUD FAQ: `https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00883.aspx`
- Portaria 195/2020: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Portaria_195_2020.pdf`
- AT e-Fatura: `https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Rendimentos/Declaracao/e_Fatura/Paginas/default.aspx`
- AT tax rates: `https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf`
- AT CIVA Lista I/e-publications ruling search result: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/informacoes_vinculativas/despesa/civa/Documents/Vinculativa_21546.pdf`
- EU place-of-taxation rules: `https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/place-taxation_en`
- EU OSS definitions: `https://vat-one-stop-shop.ec.europa.eu/national-vat-rules/definitions-topics_en`

### Current Mythoria payment flow

- Customer buys credit bundles from `src/app/[locale]/buy-credits/page.tsx`.
- Active bundles come from `credit_packages` via `src/app/api/pricing/credit-packages/route.ts`.
- Seeded bundles currently are:
  - `credits5`: 5 credits, EUR 5.00
  - `credits10`: 10 credits, EUR 9.00
  - `credits30`: 30 credits, EUR 25.00
  - `credits100`: 100 credits, EUR 79.00
- The UI displays VAT at 6% by calculating `subtotal = total / 1.06`, then `VAT = subtotal * 0.06`.
- Stripe Checkout is created by `src/app/api/payments/stripe/checkout/route.ts` and `paymentService.createStripeCheckoutSession`.
- Stripe line items are EUR, tax-inclusive, and use `automatic_tax.enabled = true`, `tax_id_collection.enabled = true`, `billing_address_collection = auto`, and `invoice_creation.enabled = true`.
- Stripe fulfillment happens only in verified webhooks at `src/app/api/payments/stripe/webhook/route.ts`.
- Completed orders are stored in `payment_orders`; metadata already stores Stripe invoice ids, hosted invoice URLs, PDFs, payment method type, payment status, and `customer_details`.
- `src/components/BillingInformation.tsx` exists but is currently unused by the buy-credits page, so manually entered billing information is not part of the current checkout request.
- No KeyInvoice SDK/package exists. Use native `fetch` from Node runtime plus existing `zod` for payload/response validation; do not add a dependency unless it removes real complexity.

## KeyInvoice API Needed

Use endpoint `https://login.keyinvoice.com/API5.php`.

Authentication:

- `SESSION.authenticate`: send `Apikey` header, receive `{Status:1,Sid}`.
- Cache `Sid` server-side with expiry below 3600 seconds. Refresh when missing or near expiry; avoid re-authentication if more than 300 seconds remain.

Configuration discovery:

- `SESSION.verifyUserInsertionPricesWithVAT`: confirm whether KeyInvoice expects line prices with VAT included. Mythoria prices are currently VAT-inclusive.
- `TABLES.getTaxes`: locate the KeyInvoice tax id for `TaxValue = 6`; persist/configure it as `KEYINVOICE_VAT_6_TAX_ID`.
- `TABLES.listDocumentSeries`: locate active series for `DocType = 34` (`Fatura-Recibo`) and optionally `DocType = 4` (`Fatura`), `7` (`Nota de Credito`), and receipt series.
- `TABLES.listPaymentMethods`: map Stripe/card/MB WAY to the correct KeyInvoice payment method id.
- `TABLES.company`: health/config sanity check for the authenticated company identity.

Customer flow:

- `CLIENTS.clientExists`: search by VATIN when the customer provides a valid tax number.
- `CLIENTS.getClient`: fetch existing customer data before deciding whether to update.
- `CLIENTS.insertClient`: create a customer only when a valid VAT/NIF exists. KeyInvoice explicitly says final consumers without NIF should be identified on the document header instead of being created as clients.
- `CLIENTS.updateClient`: update email/address/phone only if we intentionally choose to keep KeyInvoice customer records fresh.

Product flow:

- Prefer a stable KeyInvoice service product per credit bundle, or one generic service product with line `ProductName` describing the bundle.
- If using products, use:
  - `PRODUCTS.productExists`
  - `PRODUCTS.getProduct`
  - `PRODUCTS.insertProduct`
  - `PRODUCTS.updateProduct`
- Product settings for Mythoria credits should be service-like: `IsService = 1`, `HasStocks = 0`, `TaxValue = 6` or configured `IdTax`, `Active = 1`.

Document flow:

- Preferred paid-order document: `DOCUMENTS.insertDocument` with `DocType = 34` (`Fatura-Recibo`) because Stripe confirms payment before fulfillment.
- Alternative if accounting requires a separate invoice plus receipt:
  - `DOCUMENTS.insertDocument` with `DocType = 4` (`Fatura`)
  - `DOCUMENTS.settleInvoice` or `DOCUMENTS.insertReceipt` to issue the receipt for the paid amount.
- For final consumer without valid tax number, call `insertDocument` without `IdClient` and fill header fields such as `Name`, `Address`, `PostalCode`, `Locality`, and `CountryCode` when available. If no identity is provided, use `Name = "Consumidor Final"` as the fallback.
- For customers with valid VAT/NIF, use `IdClient` returned by KeyInvoice.
- `DOCUMENTS.getDocument`: read back totals, line tax, `ATDocCodeID`, document number, and voided state.
- `DOCUMENTS.getDocumentPDF`: fetch Base64 PDF for storage/delivery.
- `DOCUMENTS.sendDocumentPDF2Email`: optional delivery through KeyInvoice; prefer Mythoria-owned email delivery if we need branded templates and tracking.
- `DOCUMENTS.registerInvoiceAT`: only if KeyInvoice account is configured for API-based real-time AT communication and accounting approves this call.
- `DOCUMENTS.checkInvoiceComAT`: record AT communication state after issuance.
- `DOCUMENTS.setDocumentVoid` and `DOCUMENTS.setReceiptVoid`: support refunds/cancellations; note KeyInvoice documents state a 5-day void limit before credit note behavior for invoices/fatura-recibo.
- `DOCUMENTS.creditRegularization`: regularize credit notes where needed.
- `DOCUMENTS.documentsList`: reconciliation/backfill.

## Target Architecture

### Data ownership

- Stripe remains the source of truth for payment authorization, capture, and payment status.
- Mythoria remains the source of truth for credit fulfillment and order idempotency.
- KeyInvoice becomes the source of truth for fiscal document numbers, PDFs, ATCUD/QR/AT communication, and SAF-T.

### New database tables

Add a migration under `drizzle/` and schema under `src/db/schema`.

`keyinvoice_customers`:

- `id`
- `authorId`
- `vatin`
- `keyInvoiceClientId`
- `name`
- `email`
- `countryCode`
- `address`
- `postalCode`
- `locality`
- `lastSyncedAt`
- unique indexes on `vatin` and `keyInvoiceClientId`

`fiscal_documents`:

- `id`
- `orderId` unique FK to `payment_orders`
- `authorId`
- `provider = keyinvoice`
- `status`: `pending`, `issuing`, `issued`, `email_sent`, `at_registered`, `failed`, `voided`, `credit_note_issued`
- `docType`
- `docSeries`
- `docNum`
- `fullDocNumber`
- `atDocCodeId`
- `grossTotal`
- `netTotal`
- `taxTotal`
- `vatRate`
- `taxId`
- `customerMode`: `keyinvoice_client` or `final_consumer`
- `keyInvoiceClientId`
- `pdfStoragePath`
- `pdfSha256`
- `lastError`
- `attemptCount`
- `nextRetryAt`
- timestamps

`fiscal_document_events`:

- `id`
- `fiscalDocumentId`
- `orderId`
- `eventType`
- `requestPayload`
- `responsePayload`
- `createdAt`

Keep full KeyInvoice request/response data in event/audit rows, but redact API keys and session ids.

### Environment variables

Update `env.manifest.ts`, `.env.local` examples, deployment substitutions, and Secret Manager:

- `KEYINVOICE_API_URL`, default `https://login.keyinvoice.com/API5.php`
- `KEYINVOICE_API_KEY`, secret
- `KEYINVOICE_DEFAULT_DOC_TYPE`, default `34`
- `KEYINVOICE_INVOICE_SERIES_ID`, optional/configured
- `KEYINVOICE_RECEIPT_SERIES_ID`, optional/configured
- `KEYINVOICE_CREDIT_NOTE_SERIES_ID`, optional/configured
- `KEYINVOICE_VAT_RATE`, default `6`
- `KEYINVOICE_VAT_TAX_ID`, configured after `getTaxes`
- `KEYINVOICE_PAYMENT_METHOD_ID_STRIPE`, configured after `listPaymentMethods`
- `KEYINVOICE_PRODUCT_ID_CREDITS`, or per-bundle ids if using products
- `KEYINVOICE_SEND_EMAILS`, default `false`
- `KEYINVOICE_REGISTER_AT`, default `false` until confirmed/configured

Run `npm run check:env` after implementation.

## Workflow Design

### Checkout creation

1. Keep Stripe Checkout for payment.
2. Decide whether to disable Stripe invoice creation after KeyInvoice goes live. Recommendation: stop using Stripe as customer-facing invoice source to avoid duplicate invoice confusion, but keep Stripe receipt/payment confirmation where needed.
3. Keep `tax_id_collection` and billing address collection enabled; it is useful source data for KeyInvoice.
4. Persist intended fiscal behavior in `payment_orders.metadata.fiscal` at checkout creation:
   - expected VAT rate
   - tax-included pricing
   - intended document type
   - cart line breakdown
   - customer collection source (`stripe_checkout`)

### Webhook fulfillment

1. Continue to trust only verified Stripe webhook events.
2. After `completeOrder` succeeds for a paid session, enqueue or invoke `fiscalDocumentService.issueForOrder(orderId)`.
3. The invoicing step must be idempotent:
   - if `fiscal_documents.orderId` already has an issued document, return it
   - if a record is `issuing` too long, retry with lock/transaction protection
   - never issue a second fiscal document for the same Stripe payment without an explicit correction flow
4. Do not block credit fulfillment on KeyInvoice transient failures. Mark fiscal document as `failed`, store retry info, and alert operations.
5. Add a scheduled/retry worker or admin script to retry failed/pending documents.

### Customer resolution

1. Extract billing data from expanded Stripe Checkout Session `customer_details` and `tax_ids` if available.
2. Normalize VAT/NIF:
   - strip spaces/dashes
   - support `PT123456789` and bare `123456789`
   - validate Portuguese NIF checksum for PT numbers
   - validate EU VAT numbers through VIES or an approved validation endpoint before treating as valid for B2B customer creation
3. If valid VAT/NIF:
   - call `clientExists` by `VATIN`
   - if found, optionally `getClient`
   - if not found, `insertClient`
   - store `keyInvoiceClientId`
4. If no valid VAT/NIF:
   - do not create a KeyInvoice client
   - issue document as final consumer with `Name = "Consumidor Final"` when no better customer name is available
   - include address/country only if collected and legally appropriate

### Document creation payload

Preferred payload for paid credit order:

```json
{
  "method": "insertDocument",
  "DocType": "34",
  "DocSeries": "<configured series id>",
  "IdClient": "<when valid VAT customer exists>",
  "Name": "Consumidor Final",
  "CountryCode": "PT",
  "DocDate": "YYYY-MM-DD",
  "DocReference": "Stripe <payment_intent> / Mythoria <orderId>",
  "Comments": "Pagamento recebido via Stripe. Ordem Mythoria <orderId>.",
  "IdPaymentMethod": "<KEYINVOICE_PAYMENT_METHOD_ID_STRIPE>",
  "DocLines": [
    {
      "IdProduct": "<KEYINVOICE_PRODUCT_ID_CREDITS>",
      "ProductName": "Mythoria Credits - 10 credits",
      "Qty": "1",
      "Price": "9.00",
      "IdTax": "<KEYINVOICE_VAT_TAX_ID>"
    }
  ]
}
```

Rules:

- Match Stripe paid amount exactly at gross total level.
- If the KeyInvoice user is configured for VAT-included prices, send gross prices. If not, send net prices and verify totals.
- For multiple cart lines, either mirror each credit bundle as one line or collapse to one line only if the accountant confirms that is acceptable.
- Store Stripe ids in `DocReference`/`Comments` for reconciliation.
- Use `DocDate` from payment completion date, not checkout creation date.
- Use decimal strings rounded to two places; compare totals in cents.

### PDF and delivery

1. After `insertDocument`, call `getDocument` and verify:
   - `GrossTotal` equals Stripe `amount_total / 100`
   - `TaxValue`/tax total matches 6% assumption or configured tax
   - `ATDocCodeID` is present if expected
2. Call `getDocumentPDF` with `Format = A4` and `Signed = 1` if KeyInvoice account supports signed PDFs.
3. Store PDF bytes in the existing storage provider, under a non-public path tied to `authorId/orderId`.
4. Expose fiscal document metadata in:
   - `GET /api/payments/stripe/session`
   - `GET /api/payments/history`
   - MCP transaction tools if needed
5. Email delivery options:
   - preferred: Mythoria sends a localized email with download link after PDF storage
   - alternative: call `sendDocumentPDF2Email` from KeyInvoice

### Refunds and corrections

1. On `charge.refunded`, calculate whether full or partial refund.
2. For full refunds soon after issuance:
   - call `setDocumentVoid` for `DocType = 34` if within KeyInvoice's allowed void behavior
   - otherwise issue/regularize credit note according to accountant-approved flow
3. For partial refunds:
   - issue a credit note for the refunded amount; confirm exact API route with KeyInvoice/accountant because the docs expose `setDocumentVoid`, `creditRegularization`, and document type `7`.
4. Store refund fiscal document links separately from original invoice document.

## Implementation Phases

### Phase 1 - Accounting decisions and KeyInvoice setup

- Confirm whether Mythoria credits are legally invoiced at 6% as e-books/audiobooks/publications.
- Confirm VAT treatment for Portuguese mainland, Azores/Madeira, EU B2C, EU B2B, and non-EU customers.
- Confirm whether to use `Fatura-Recibo` (`DocType = 34`) for paid Stripe orders or `Fatura` + `Recibo`.
- Confirm KeyInvoice company account is configured with AT communication, document series, payment method, and tax table.
- Use KeyInvoice UI/API to identify:
  - VAT 6% tax id
  - Stripe payment method id
  - document series ids
  - product/service ids
- Decide whether Stripe invoice creation should be disabled after KeyInvoice launch.

### Phase 2 - KeyInvoice client module

- Add `src/lib/keyinvoice/client.ts`.
- Implement:
  - session cache
  - typed `callKeyInvoice(method, payload)` helper
  - response schema validation
  - sanitized logging
  - retry only for transport/session failures, not business validation failures
- Add methods for `authenticate`, `getTaxes`, `listDocumentSeries`, `listPaymentMethods`, `clientExists`, `insertClient`, `insertDocument`, `getDocument`, `getDocumentPDF`, `registerInvoiceAT`, `checkInvoiceComAT`, `setDocumentVoid`.
- Add Jest tests with mocked fetch and session expiry behavior.

### Phase 3 - Fiscal data model and services

- Add Drizzle schema and migration for fiscal document tables.
- Add `src/db/services/keyinvoice-fiscal-documents.ts`.
- Implement idempotent create/update/read helpers.
- Add audit event writer with redaction.
- Add tests for idempotency and failure transitions.

### Phase 4 - Billing identity and VAT validation

- Replace current format-only VAT validation with server-side validation for fiscal use.
- Add Portuguese NIF checksum validation.
- Add VIES validation for EU VAT numbers or document a deliberate first release limited to PT NIF.
- Store normalized billing identity from Stripe `customer_details` after payment.
- Decide whether to reintroduce `BillingInformation` into the checkout flow or rely only on Stripe Checkout collection.

### Phase 5 - Webhook integration

- Update `paymentService.completeOrder` or the webhook completion path to call the fiscal document service after the order is marked completed.
- Ensure duplicate Stripe events do not produce duplicate KeyInvoice documents.
- Add fallback queue/retry mechanism for KeyInvoice outages.
- Add operational logs and alerts for failed invoicing.

### Phase 6 - User-facing document access

- Extend payment history/session responses with KeyInvoice fiscal document status and PDF/download URL.
- Update UI labels from Stripe invoice language to Portuguese fiscal document language.
- Add localized messages for pending/failed invoice generation.
- Keep access authorization scoped to the owning author.

### Phase 7 - Refund and correction flow

- Implement full refund void/credit-note flow after accounting approval.
- Add admin-only retry and correction scripts.
- Ensure refunds do not remove purchased credits automatically unless product policy requires it; fiscal correction and credit balance correction are separate concerns.

### Phase 8 - Reconciliation and backfill

- Build a script to find completed Stripe orders without `fiscal_documents`.
- Dry-run mode prints intended KeyInvoice payloads and totals.
- Live mode issues missing documents with strict idempotency.
- Reconcile KeyInvoice `documentsList` against local `fiscal_documents`.

## Testing Checklist

- Unit tests:
  - KeyInvoice authentication/session cache
  - payload building for valid VAT customer
  - payload building for final consumer
  - tax-inclusive and tax-exclusive calculation modes
  - duplicate webhook/idempotency behavior
  - PDF Base64 decoding/storage path generation
- Integration tests with mocked KeyInvoice:
  - successful Stripe checkout completion creates one fiscal document
  - KeyInvoice temporary failure leaves payment completed and fiscal document failed/pending retry
  - duplicate `checkout.session.completed` does not duplicate invoice
  - refund event creates correction workflow event
- Manual test in KeyInvoice sandbox/test account if available:
  - create final consumer `Fatura-Recibo`
  - create VAT customer `Fatura-Recibo`
  - fetch PDF
  - check AT communication status where configured
- Required repo checks after implementation:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run format`
  - `npm run check:env` when env manifest changes

## Open Questions

- Is 6% valid for all Mythoria paid credit purchases, or only for specific end products such as e-books/audiobooks?
- Should the invoice be issued when credits are purchased or when credits are spent on a specific story/audiobook/print product?
- Should Stripe invoices be disabled once KeyInvoice is live?
- Which KeyInvoice document series should be used in production for `DocType = 34`, `4`, and credit notes?
- Should Mythoria use KeyInvoice email delivery or store and send PDFs itself?
- What is the accountant-approved treatment for EU B2B reverse charge and EU/non-EU B2C VAT/OSS?
- Is the KeyInvoice API account configured to communicate documents to AT in real time, or will the company rely on SAF-T/e-Fatura exports?

## First Implementation Milestone

Deliver a minimal safe production path:

1. Configure KeyInvoice env vars and discover tax/series/payment ids.
2. Add fiscal document tables.
3. Add KeyInvoice client and service.
4. On completed Stripe webhook, issue one `DocType = 34` `Fatura-Recibo` for the gross Stripe amount.
5. Use KeyInvoice client creation only for validated VAT/NIF; otherwise use final consumer document header.
6. Fetch and store PDF.
7. Expose document status and PDF link in payment history.
8. Retry failed fiscal document issuance without duplicating documents.
