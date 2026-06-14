# Mythoria Admin Fiscal Documents Specification

## Purpose

Build a `mythoria-admin` section that lets administrators monitor automatic KeyInvoice fiscal document generation from `mythoria-webapp`.

The admin must be able to answer:

- Which paid Stripe orders have fiscal documents?
- Which fiscal documents are pending, draft, issuing, failed, issued, voided, or requiring correction?
- Which fiscal documents failed and why?
- Which documents need operational attention or retry?
- What request/response audit data exists for debugging?

This is a monitoring and operations surface. It is not a manual invoice approval workflow.

## Ownership

`mythoria-webapp` remains the source of truth for fiscal document generation:

- Confirms Stripe payment through verified webhooks.
- Grants credits.
- Creates or updates `fiscal_documents`.
- Writes audit rows to `fiscal_document_events`.
- Talks to KeyInvoice when `KEYINVOICE_ENABLED=true` and `KEYINVOICE_DRAFT_ONLY=false`.
- Stores KeyInvoice document numbers, PDF storage path, retry state, and errors.

`mythoria-admin` should read and display this data. It may expose controlled retry or PDF actions only through admin-authorized backend endpoints.

## Data Model

Use the shared database tables created by the KeyInvoice integration.

### `fiscal_documents`

Show these fields in list/detail views:

- `id`
- `order_id`
- `author_id`
- `provider`
- `status`
- `doc_type`
- `doc_series`
- `doc_num`
- `full_doc_number`
- `at_doc_code_id`
- `gross_total`
- `net_total`
- `tax_total`
- `vat_rate`
- `tax_id`
- `customer_mode`
- `key_invoice_customer_id`
- `key_invoice_client_id`
- `final_consumer_vat_number`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `pdf_storage_path`
- `pdf_sha256`
- `last_error`
- `attempt_count`
- `next_retry_at`
- `issued_at`
- `created_at`
- `updated_at`

### `fiscal_document_events`

Use this table as the audit timeline:

- `id`
- `fiscal_document_id`
- `order_id`
- `event_type`
- `request_payload`
- `response_payload`
- `created_at`

Important event types:

- `draft_document_prepared`
- `insert_document_requested`
- `insert_document_succeeded`
- `pdf_stored`
- `register_at_succeeded`
- `issue_failed`
- refund/dispute fiscal events

### Related Data

Join or fetch related records from:

- `payment_orders`: amount, status, provider, credit bundle, Stripe session/payment ids, metadata.
- `authors`: customer/user identity.
- `keyinvoice_customers`: mapped KeyInvoice client data when a VAT/NIF customer exists.

## Status Semantics

| Status                 | Meaning                                                                                                    | Admin severity         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| `draft`                | Draft-only payload prepared locally; no remote KeyInvoice document created. Expected in local/ngrok tests. | Neutral                |
| `pending`              | Waiting to be issued or retried.                                                                           | Warning if old         |
| `issuing`              | Issuing attempt in progress.                                                                               | Info; warning if stale |
| `issued`               | KeyInvoice document was created and PDF was stored.                                                        | Success                |
| `failed`               | Issuing failed; inspect `last_error` and events.                                                           | Error                  |
| `voided`               | Document was voided.                                                                                       | Neutral                |
| `credit_note_required` | Refund/dispute happened and fiscal correction is needed.                                                   | Error                  |
| `credit_note_issued`   | Correction document was issued.                                                                            | Success                |

## Needs Attention Logic

Create a computed field in the API or frontend:

```ts
needsAttention =
  status === 'failed' ||
  status === 'credit_note_required' ||
  (status === 'pending' && ageMinutes > 15) ||
  (status === 'issuing' && updatedAgeMinutes > 15);
```

Create a second computed field:

```ts
retryableNow = ['pending', 'failed'].includes(status) && (!nextRetryAt || nextRetryAt <= now);
```

Use these fields for alert badges, dashboard counts, default sorting, and retry button visibility.

## Admin Navigation

Add:

- Main nav item: `Fiscal Documents`
- Optional dashboard card: `Fiscal document issues`
- Optional alert badge count for failed/stale/correction-required documents.

## List Page

Suggested route:

```text
/fiscal-documents
```

Recommended columns:

- Created date
- Updated date
- Status
- Attention badge
- Full document number
- Stripe/order reference
- Customer/user
- Customer mode
- Gross amount
- VAT rate
- Attempts
- Next retry
- Last error preview
- Actions

Required filters:

- Status multi-select
- Has error: yes/no
- Needs attention: yes/no
- Date range
- Customer mode: `final_consumer`, `keyinvoice_client`
- Search query

Search should match:

- Fiscal document ID
- Order ID
- Stripe checkout session ID
- Stripe payment intent ID
- KeyInvoice document number
- Author email/name
- VAT/NIF/client id

Default sort:

```text
needs_attention desc, updated_at desc
```

Required row actions:

- View details
- Copy order ID
- Copy fiscal document ID
- Copy Stripe payment intent/session ID

Optional row actions, if backend support exists:

- Retry now for failed/pending document
- Open issued PDF
- Open related payment order
- Open related author/user

## Detail Page

Suggested route:

```text
/fiscal-documents/:id
```

Header should show:

- Status badge
- Full document number or `No remote document`
- Gross total
- Customer mode
- Created/updated/issued dates
- High-priority warning if failed, stale, or correction required

Sections:

- Payment: order ID, payment status, amount, credit bundle, Stripe checkout session ID, Stripe payment intent ID.
- Customer: author ID, email/name, customer mode, KeyInvoice client id, VAT/NIF, final consumer VAT number `999999990`, billing address when available.
- Fiscal document: provider, status, doc type/series/number, AT doc code id, totals, VAT rate, tax id, PDF availability, PDF hash.
- Error and retry: `last_error`, `attempt_count`, `next_retry_at`, latest failure event, retryability.
- Event timeline: all `fiscal_document_events` for the document/order, with collapsible request/response JSON.

For `draft_document_prepared`, clearly show:

```text
Remote KeyInvoice document created: No
```

## API Requirements

Prefer admin-authorized backend endpoints.

### List

```http
GET /admin/fiscal-documents
```

Query parameters:

- `status`
- `needsAttention`
- `hasError`
- `customerMode`
- `dateFrom`
- `dateTo`
- `q`
- `limit`
- `cursor` or `page`
- `sort`

Response should include fiscal document summary, payment summary, author summary, `needsAttention`, and `retryableNow`.

### Detail

```http
GET /admin/fiscal-documents/:id
```

Response should include fiscal document, payment order, author, KeyInvoice customer when available, and event timeline.

### Retry

Optional but recommended:

```http
POST /admin/fiscal-documents/:id/retry
```

Rules:

- Admin-only.
- Only allowed for `pending` or `failed`.
- Must call the same idempotent issuing service used by automatic retries.
- Must not create duplicate KeyInvoice documents for the same order.
- Must write an audit event with the admin user id.

### PDF

Admin PDF access may need a separate admin-authorized proxy if the existing customer route only authorizes the owning customer.

## Security

- Admin-only access.
- Do not expose KeyInvoice API keys or session ids.
- Redact secrets from JSON payload viewers if any future event accidentally stores them.
- Retry action must require an authenticated admin and be auditable.
- PDF download must be admin-authorized.

## Acceptance Criteria

- Admin can list all fiscal documents.
- Admin can filter to failed documents.
- Admin can filter to documents needing attention.
- Admin can open a detail page and see the latest error.
- Admin can inspect the request/response event timeline.
- Admin can identify local draft-only records that did not create remote KeyInvoice documents.
- Admin can identify issued records and open/download the stored PDF.
- Admin can see documents requiring correction after refunds/disputes.
- If retry is implemented, retry is idempotent and writes an audit event.

## Initial Scope

Build first:

1. List page with status, needs-attention, and search filters.
2. Detail page with payment, customer, fiscal document, error, and event timeline sections.
3. Dashboard count for failed/attention-needed documents.
4. Admin-authorized PDF access for issued documents.

Defer:

- Manual edit of invoice payloads.
- Manual approval workflow.
- Bulk retry.
- Credit note issuing workflow.
- Direct KeyInvoice reconciliation screen.
