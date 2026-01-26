# Printing & Self-Print Workflow

## Purpose

Mythoria offers two printing-related paths:

1. **Print & ship (keepsake order)** – Order a physical book that Mythoria prints and ships to a saved address.
2. **Self-print (PDF download)** – Generate print-ready PDFs that are emailed to you so you can print locally.

Both flows use Mythoria credits, require a **published** story, and are available from the story experience and library UI.

## End-user experience

### Print & ship (keepsake order)

**Entry point**
- Open a published story and choose the print action. This navigates to `/stories/print/[storyId]` in the current locale.
- If you are signed out, you are asked to sign in or create an account first.

**Step 1 — Story preview**
- You see the story synopsis and front cover (if available).
- Continue to shipping details.

**Step 2 — Shipping address**
- Choose a delivery address from your saved addresses or create one inline.
- The newest address is auto-selected. You can edit or delete existing addresses.

**Step 3 — Print options & credits**
- Print pricing data loads from the active pricing services list.
- The default option is **Printed Soft Cover** (softcover paperback).
- You can adjust the number of copies (1–10). Costs update in real time.
- Total credits are calculated as:
  - **Base price**: printed softcover price (includes first 4 chapters).
  - **Extra chapters**: `(chapterCount - 4) × extraChapterCost × numberOfCopies`.
  - **Extra copies**: `(numberOfCopies - 1) × extraBookCopy`.
  - **Shipping cost**: flat shipping service credit value.
- If your credits are insufficient, a warning appears with a link to buy more credits.

**Order confirmation**
- You confirm the order in a modal before submission.
- On success, you are returned to **My Stories** while printing continues in the background.
- You receive an email confirmation with your order details.

### Self-print (PDF download)

**Entry point**
- The **SelfPrintModal** can be opened from multiple story pages (public or private views), including the story library, read view, and listen view.

**Required inputs**
- Your account email is required (the PDFs are always sent there).
- You can add additional CC recipients by entering multiple emails.

**What happens when you submit**
- Credits are checked and then deducted immediately.
- The printable PDFs are generated asynchronously.
- You receive an email with the download links when the files are ready.
- If the workflow fails, credits are refunded automatically.

## Developer implementation

### Front-end routes & components

**Print & ship UI**
- Page: `src/app/[locale]/stories/print/[storyId]/page.tsx`
- Wizard orchestrator: `src/components/print-order/PrintOrderContent.tsx`
- Step components:
  - Story review: `src/components/print-order/steps/StoryStep.tsx`
  - Address selection: `src/components/print-order/steps/AddressStep.tsx`
  - Pricing + credits: `src/components/print-order/steps/PaymentStep.tsx`
- Translations: `PrintOrder` namespace in `src/messages/*/PrintOrder.json`.

**Self-print UI**
- Modal: `src/components/self-print/SelfPrintModal.tsx`
- The modal fetches pricing, credits, and account email before enabling submission.
- Translations: `SelfPrintModal` namespace in `src/messages/*/SelfPrintModal.json`.

### API endpoints

**`POST /api/print-requests`** – Create a print & ship order

1. Authenticates the author and validates the story is **published** and accessible.
2. Resolves the shipping country and selects the first active print provider that supports it.
3. Validates credit sufficiency **before** creating the order.
4. Creates a `print_requests` row with pricing metadata (service code, extra chapters, copies).
5. Creates a support ticket in the admin system; on failure the print request is rolled back.
6. Deducts credits **after** the ticket succeeds; on failure the print request is rolled back.
7. Sends a confirmation email (best-effort, non-blocking).
8. Triggers print PDF generation asynchronously through Pub/Sub.

**`GET /api/print-requests`** – List print requests
- Optional filters: `storyId`, `status`.

**`GET /api/pricing/services`** – Load pricing used in the print order wizard
- Includes `printedSoftCover`, `extraBookCopy`, `extraChapterCost`, and `shippingCost` when active.

**`GET /api/pricing/self-print`** – Load pricing for self-print
- Returns the `selfPrinting` credit cost.

**`POST /api/stories/[storyId]/self-print`** – Queue self-print PDFs

1. Authenticates the author and validates the story is published and accessible.
2. Validates recipient emails and ensures an account email exists.
3. Verifies self-print pricing and credit balance.
4. Deducts credits, then calls SGW `/print/self-service` with metadata.
5. Refunds credits if SGW fails, and returns a localized error.
6. Returns workflow identifiers and updated credit balance on success.

### Pub/Sub integration

- `src/lib/print-pubsub.ts` publishes print-generation messages to the topic `mythoria-print-requests` with `{ storyId, runId }`.
- Print generation is intentionally **non-blocking**; order success does not depend on the Pub/Sub trigger.

### Credit events and pricing seeds

- `selfPrinting` is a dedicated credit event type and pricing seed.
- Local/dev pricing seed: `drizzle/0022_self_print_pricing.sql`.

## Print-generation pipeline (SGW service)

> The print-generation pipeline runs in the Story Generation Workflow (SGW) service, not inside the web app. The web app only enqueues jobs and reads back URLs.

### Pipeline overview

1. **Print service** (`src/services/print.ts`) renders `interior.pdf` and `cover.pdf` using Puppeteer.
2. **Page processing** (`src/services/pdf-page-processor.ts`) reorders interior pages so chapters start on recto pages and removes blank pages.
3. **CMYK conversion** (`src/services/cmyk-conversion.ts`) converts RGB PDFs to CMYK PDF/X‑1a compliant outputs.
4. **Workflow** (`workflows/print-generation.yaml`) orchestrates generation and returns public URLs.
5. **Storage** (GCS): `{storyId}/print/interior.pdf`, `{storyId}/print/cover.pdf`, `*-cmyk.pdf`, plus HTML debug snapshots.

### Page layout processing (interior)

- Detects full-bleed chapter images using `pdf-parse@2.x` image metadata; no HTML markers required.
- Removes blank pages (including legacy trailing blank page in templates).
- Enforces **recto rule**: chapters must start on odd pages. If the chapter image would land on an odd page, the processor swaps the image and text so the image appears after the text.
- Outputs a page map plus a list of **image page numbers** for CMYK processing.

### CMYK conversion specifics

- Default ICC profile: **CoatedFOGRA39**.
- If ICC profiles are missing or placeholders, Ghostscript falls back to built-in CMYK conversion (workflow continues).
- Errors never block RGB output; the API still returns RGB URLs.

**Ghostscript command (simplified)**

```powershell
gswin64c.exe -dNOPAUSE -dBATCH -dSAFER -dQUIET `
  -sDEVICE=pdfwrite `
  -dCompatibilityLevel=1.4 `
  -sColorConversionStrategy=CMYK `
  -sProcessColorModel=DeviceCMYK `
  -dOverrideICC=true `
  -dRenderIntent=0 `
  -dDeviceGrayToK=true `
  -dPDFX=true `
  -sOutputICCProfile=CoatedFOGRA39.icc `
  -sOutputFile=output-cmyk.pdf `
  metadata.ps input-rgb.pdf
```

### Interior grayscale + color merge

- Two intermediate interiors are produced:
  - **Grayscale/K-only** for text pages.
  - **Full CMYK** for image pages.
- The final interior PDF merges these so **chapter images stay in color** while text pages remain K-only (deep black).
- Covers are always full CMYK.

### Self-print workflow hooks

- `POST /print/self-service` dedupes recipients, auto-adds the author when possible, and starts `print-generation`.
- After upload, `/internal/print/self-service/notify` sends links and logs the execution metadata for observability.
- `RunsService` persists `gcpWorkflowExecution` so notifications can include `metadata.workflowExecutionId`.

### Configuration checklist

| Item | Notes |
| --- | --- |
| Ghostscript | Install locally or bundle in Docker; point `GHOSTSCRIPT_BINARY` to `gs` (Linux) or `gswin64c.exe` (Windows). |
| Temp directory | `TEMP_DIR` defaults to system temp; override for writable mounts. |
| ICC profiles | `npm run setup-icc-profiles` downloads profiles referenced by `src/config/icc-profiles.json`. |
| Paper config | `src/config/paper-caliper.json` defines trim, bleed, safe zones, and caliper for spine width. |
| Pub/Sub | Print jobs can be triggered from orders via the `mythoria-print-requests` topic. |

### Testing & validation (SGW)

| Intent | Command |
| --- | --- |
| Verify Ghostscript | `pwsh -NoProfile -Command "npm run test:ghostscript"` |
| Render sample PDFs & convert | `pwsh -NoProfile -Command "npm run test:cmyk"` |
| Page layout + image detection | `npm test -- pdf-page-processor` |
| ICC + Ghostscript health | `pwsh -NoProfile -Command "npm run cmyk:status"` |
| Exercise API | `POST /internal/print/generate` with `generateCMYK: true` while running `npm run dev`. |

### Deployment tips (SGW)

- Allocate **2 vCPU / 2–4 GiB RAM** on Cloud Run.
- Set request timeout ≥900s for large interiors.
- Docker builds install Ghostscript and copy ICC profiles; rerun `npm run setup-icc-profiles` locally before building.

### Troubleshooting (SGW)

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Command failed: gswin64c.exe ...` | Ghostscript missing or ICC placeholder | Install Ghostscript, update `GHOSTSCRIPT_BINARY`, rerun `npm run setup-icc-profiles`. |
| `Using built-in CMYK conversion` log | ICC not bundled | Ensure Docker build copies `icc-profiles/` and `icc-profiles.json` points to valid files. |
| Temp-file permission errors | `TEMP_DIR` unwritable | Set `TEMP_DIR=/tmp/mythoria-print` and ensure write access. |
| Cover alignment issues | Caliper/trim mismatch | Update `paper-caliper.json` and redeploy; confirm bleed = 3mm and safe zone = 10mm. |

### Output artifacts

Each successful run uploads:

- `interior.pdf` / `cover.pdf` – RGB reference versions for web preview.
- `interior-cmyk.pdf` / `cover-cmyk.pdf` – CMYK PDF/X‑1a print-ready files.
- `interior.html` / `cover.html` – Debug HTML snapshots.

Always review the assets in Cloud Storage after template or caliper updates.
