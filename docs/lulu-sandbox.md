# Lulu sandbox lifecycle check

From the WebApp directory, run the offline check with Node 24 and installed npm dependencies.

```powershell
npx tsx scripts/lulu-sandbox-smoke.ts --dry-run
```

The default checks a synthetic fixture shape locally. Add `--fixture <path>` to check your own synthetic input without contacting Lulu. Use an untracked JSON file outside the repository for working file URLs. This example shows the expected contents. Supply direct HTTPS URLs to accessible **synthetic** PDFs with the correct binding and final page count. Use a synthetic recipient at an address that passes sandbox address validation.

```json
{
  "synthetic": true,
  "binding": "paperback",
  "pageCount": 32,
  "copies": 1,
  "shippingAddress": {
    "name": "Synthetic Test",
    "street1": "Test Street 1",
    "city": "Porto",
    "postcode": "4000-001",
    "country_code": "PT",
    "phone_number": "+351210000000",
    "email": "synthetic@example.org"
  },
  "interiorUrl": "https://example.org/synthetic/interior.pdf",
  "coverUrl": "https://example.org/synthetic/cover.pdf"
}
```

## Sandbox run

Set the shell's `LULU_PRINT_ENVIRONMENT` to `sandbox`. Supply the sandbox client key, Secret Manager version reference, and fulfillment contact using the same `LULU_PRINT_CLIENT_KEY`, `LULU_PRINT_SECRET_VERSION`, and `LULU_PRINT_CONTACT_EMAIL` that the WebApp client reads. Use application default credentials authorized to read the sandbox secret. The CLI does not load production environment files.

```powershell
npx tsx scripts/lulu-sandbox-smoke.ts --run-sandbox --fixture "C:\Temp\lulu-synthetic-order.json"
```

The run exercises the WebApp supplier client against Lulu’s fixed sandbox host. It exchanges credentials, fetches the cover dimensions, normalizes the two PDFs, obtains the cheapest eligible tracked EUR quote, and creates a simulated job for these inputs. It searches for the exact job and line references, reads the status and available job costs, requests cancellation when the job enters a supported state, and reads the status again to confirm cancellation. Run once for each binding with an appropriate fixture, and include a multiple-copy fixture to verify quantity handling.

Supply an optional `webhookId` string in the fixture to request a test status callback on an existing sandbox subscription. Verify receipt in the sandbox WebApp and Lulu’s submission history. The API acknowledging the test request means Lulu queued it. It does not establish that the receiving service verified and stored the callback.

Record the printed run ID, job ID, preflight outcome, tracked quote, status, cancellation outcome, and any callback evidence. Keep signed URLs, credentials, addresses and raw event bodies out of task logs. The CLI writes only an opaque test reference under the OS temporary directory.

## Interrupted runs

After an uncertain create response, the CLI searches using the same reference. It never replays a create for that run. If indexing or a status transition takes longer than the bounded polling interval, resume using the original run ID.

```powershell
npx tsx scripts/lulu-sandbox-smoke.ts --run-sandbox --resume "00000000-0000-4000-8000-000000000000"
```

Resume reads the existing exact match and attempts to confirm its cancellation. A new execution without `--resume` deliberately starts a separate simulation. Inspect the sandbox Developer Portal if no exact match appears or the simulated job reaches a state that requires supplier support. Physical proofing and actual production charges are outside this sandbox check.
