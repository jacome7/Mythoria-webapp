# Read-only purchase audit

This CLI reconciles completed credit orders, payment events, persisted analytics payloads and an optional actual GA4 transaction export. It does not call Stripe, send analytics, alter consent, repair records or invoke the existing mutating reconciler.

Run from the webapp root. `.env.local` is loaded quietly before the lazy shared DB entry point is used. The database transaction requests `REPEATABLE READ, READ ONLY` and verifies `transaction_read_only = on` before selecting business data. A per-statement 60-second timeout bounds each query. It uses the existing pool and closes that connection after completion.

```powershell
npx.cmd tsx scripts/audit-purchases.ts --help
npx.cmd tsx scripts/audit-purchases.ts --from 2026-08-05T23:00:00Z --to 2026-09-04T23:00:00Z --output-dir C:\private\purchase-audit-20260905 --ga4-transactions C:\private\ga4-transactions.json
```

The interval above matches 6 August–4 September 2026 in Europe/Lisbon (UTC+1). All arguments are interpreted in UTC with **inclusive from / exclusive to**. Date-only arguments mean UTC midnight; use explicit ISO timestamps for a property using another time zone. Confirm the export period, currency, filters and time zone independently.

Optional `--test-author-id UUID` and `--test-order-id UUID` are repeatable. Supply only IDs confirmed to be tests. An explicit ID or provider `livemode=false` is test evidence. Amount, email/domain, campaign, missing analytics and zero revenue are never used to infer tests. Conflicting provider mode evidence is classified as ambiguous. Unclassified orders remain included and visibly counted.

GA4 input accepts either an array or `{ "source": "...", "transactions": [...] }`. Each row requires `transactionId`, uppercase `currency`, `purchaseRevenue` and `purchaseCount`. The aliases `revenue` and `purchases` are also accepted for a manually observed GA4 table. Extra fields are discarded. Values are currency units, not cents. Duplicate transaction rows remain visible through `ga4InputRows` and their counts/values are summed; review duplicates before interpreting differences.

```json
{
  "source": "GA4 transactions, verified date and filters",
  "transactions": [
    {
      "transactionId": "00000000-0000-0000-0000-000000000001",
      "currency": "EUR",
      "revenue": 10,
      "purchases": 1
    }
  ]
}
```

## Output and privacy

Use a new private output directory outside hosting, shared reports and Git. The CLI refuses paths containing `public` or `.git`. It creates `purchases.private.csv` and `summary.json` without overwriting existing files. POSIX mode requests are 0700/0600; on Windows the directory inherits its filesystem ACL, so choose a private local directory. CSV contains order IDs for reconciliation, but no author IDs, names, emails, raw client/session IDs, attribution IDs, click IDs, provider refund IDs or raw metadata. Summary and stdout contain aggregates only. Errors deliberately omit database/SQL/provider payload details. A failed second file write may leave the first output file; use a fresh directory to rerun.

The CSV includes completion evidence, test classification, new/returning/unknown, currency, gross/tax/shipping/net cents, persisted purchase value/tax/shipping and differences, consent, identity-presence booleans, attribution existence/time validity, outbox state, GA4 observation state and refund reconciliation. Never publish the private CSV to Sites.

## Interpretation

- Purchase time comes from `payment_completed.created_at`, the application completion transaction. It is not necessarily the provider's exact settlement time. Missing or multiple distinct completion timestamps stay ambiguous and do not enter period purchase totals. `created_at`/`updated_at` only identify ambiguous candidates; they are never substituted for completion.
- Orders created before the end boundary are selected together with all their available completion/refund evidence, including events received after that boundary. Application payment_completed.created_at defines the purchase window; provider refund.created defines the refund window independently of webhook arrival. Earlier completion history classifies new vs returning. Earlier confirmed test orders are excluded. Earlier ambiguous completions prevent a confident new-customer label. The result is based on available retained history, not a claim that deleted/legacy history is complete.
- Gross uses recorded Stripe amountTotal when available, otherwise order.amount. Tax and shipping must have recorded numeric values; missing fields remain unknown, not assumed zero. The audit compares these independent recorded totals to the actual persisted outbox payload, without importing/re-running its producer.
- Consent at checkout, outbox consent, identity presence and linked attribution existence are separate fields. No missing attribution or refused consent is repaired. `delivered_at` means **submitted to transport**, never received in GA4. Only supplied actual transaction observations can mark an order observed in that export. Missing export rows do not prove permanent non-ingestion.
- Refunds deduplicate repeated provider event IDs and individual successful provider refund IDs across cumulative charge snapshots. Their own `refund.created` assigns the period. Raw cumulative `charge.amount_refunded` is never summed or differenced to invent individual refunds. Missing/truncated refund lists remain ambiguous. Known gross refunds are a lower bound when ambiguous events exist. Tax allocation for refunds is unknown, so net refunds and net revenue after refunds are deliberately not fabricated. Refund-only rows include refunds of older orders.
- Purchases and refunds are not mixed across currencies. `*KnownCents` totals are explicitly partial when corresponding unknown counts are nonzero. Non-test includes orders whose provider mode remains unclassified; inspect that count before treating everything as confirmed live sales.
- Snapshot time and event time differ: delivery columns reflect current stored transport state, even for an earlier reporting interval. GA4 data may arrive late, use different reporting time zones or contain filters/modeling; the export is independent evidence with its own scope.

## Focused validation

```powershell
npm.cmd test -- --runInBand src/lib/analytics/purchase-audit.test.ts src/lib/analytics/purchase-audit-reader.test.ts
```

Fixtures cover amount-independent test classification, half-open completion dates, missing/conflicting completion evidence, history-based customer type, duplicate outbox/refund events, partial refund snapshots, unknown taxes, optional GA4 observations, export privacy and PostgreSQL read-only enforcement. These tests use no live database. Run the repository quality gates separately before publishing code.
