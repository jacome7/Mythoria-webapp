# Premium children’s books

Step 4 offers the square illustrated format to authors with Experimental Features enabled and an audience of ages 0–2 or 3–6. Step 5 uses the active eBook generation rate and the existing credit balance. The format starts as a usable digital book. Paid square hardcover checkout has its own release approval and controls.

## Draft and queue contract

`PUT /api/my-stories/{storyId}/book-type` takes `bookType` and `targetAudience`. It immediately saves the selection against the owned draft. Choosing Standard removes the draft marker. The generic story update ignores incoming `features` data, and it preserves the server-owned marker.

The acceptance transaction checks the current author preference, saved audience, format and balance under database locks. It keeps existing feature data and pins a premium marker to the new run. The existing `story_generation_requests` row and Pub/Sub outbox establish durable request identity. The premium discriminator in the queue payload is advisory. SGW resolves the persisted marker and checks the run ID, story ID and owner before it starts. Retrying publication of a request uses the same run and debit.

The request’s normal queue compensation can restore the premium selection to draft for the same run if the worker has yet to claim it. Story and character input remains frozen while SGW is writing. Existing run status and operational recovery handle worker failures.

## Published books

The worker publishes an immutable manifest pointer in `stories.features.premiumBook`. WebApp verifies its identity, GCS generation, byte length and SHA-256. Public, owner and signed-in private-link readers expose a small view containing the approved images and canonical page/cover text. The image endpoint authorizes each request and resolves the specific image from the published manifest. An expired or revoked private link grants no lasting collaborator access. Canonical manuscript responses and images use network-only routes and private no-store responses.

New books add a 33rd interior page inviting the reader to create a story on Mythoria. The invitation shares a localized destination with the printed edition and opens the existing creation flow on the current WebApp host. The 32-page edition continues to open using its existing manifest.

The reader supports two-page spreads on desktop and one square page at a time on narrow screens. Readers can navigate by button, keyboard, swipe or page selector. A spread can carry text on both pages or on its right page only. Illustration-only left pages expose the localized description as alternative text when available. The reader displays the canonical copy in HTML, including cover lettering. Where present, the manifest’s opening design supplies the background for pages 1–4 and the decorative motif for pages 1 and 3. A generated motif uses the same private PNG on both pages and the reader falls back to the curated drawing if the PNG is missing or unavailable. Chapter editing, translation, duplication, chapter-based PDF/self-print exports and audiobook generation are unavailable for this format. Its paid square hardcover uses the separately approved print profile. [Paid print workflow](./PRINT_FULFILLMENT.md)

## Runtime configuration and verification

- `PREMIUM_BOOK_BUCKET` must be the same private GCS bucket used by SGW, with public access prevention enabled. Grant WebApp read access to its generation-pinned objects.
- `PREMIUM_BOOK_GENERATION_ENABLED=true` is the operator’s admission switch for new starts. Leave it unset until the compatible worker and reader are ready. Disable it to stop new starts while keeping the bucket configured to serve existing books and pinned orders.
- Customer eligibility continues to use the existing Experimental Features preference. Disabling that preference prevents new premium starts while preserving existing books.
- The isolated Playwright fixture enables premium admission and uses a synthetic eligible author. It checks format selection, refresh, Step 5 review and switching back in all five locales without contacting SGW or Cloud Storage. The Jest storage fixture comes from SGW’s deterministic premium book manifest generator and exercises mixed and legacy spread layout.
