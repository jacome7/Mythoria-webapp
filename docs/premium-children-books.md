# Premium children’s books

Step 4 offers the square illustrated format to authors with Experimental Features enabled and an audience of ages 0–2 or 3–6. Step 5 uses the active eBook generation rate and the existing credit balance. Generation publishes the online reader edition first. Self-print, physical checkout and staff proof requests start PDF production on demand. Paid square hardcover checkout has its own release approval and controls.

## Draft and queue contract

`PUT /api/my-stories/{storyId}/book-type` takes `bookType` and `targetAudience`. It immediately saves the selection against the owned draft. Choosing Standard removes the draft marker. The generic story update ignores incoming `features` data, and it preserves the server-owned marker.

The acceptance transaction checks the current author preference, saved audience, format and balance under database locks. It keeps existing feature data and pins a premium marker to the new run. The existing `story_generation_requests` row and Pub/Sub outbox establish durable request identity. The premium discriminator in the queue payload is advisory. SGW resolves the persisted marker and checks the run ID, story ID and owner before it starts. Retrying publication of a request uses the same run and debit.

The request’s normal queue compensation can restore the premium selection to draft for the same run if the worker has yet to claim it. Story and character input remains frozen while SGW is writing. Existing run status and operational recovery handle worker failures.

## Published books

The worker publishes an immutable manifest pointer in `stories.features.premiumBook`. WebApp verifies its identity, GCS generation, byte length and SHA-256. Public, owner and signed-in private-link readers expose a small view containing the approved images and canonical page/cover text. The image endpoint authorizes each request and resolves the specific image from the published manifest. An expired or revoked private link grants no lasting collaborator access. Canonical manuscript responses and images use network-only routes and private no-store responses.

New books add a 33rd interior page inviting the reader to create a story on Mythoria. The invitation shares a localized destination with the printed edition and opens the existing creation flow on the current WebApp host. The 32-page edition continues to open using its existing manifest.

The reader shows two-page spreads on desktop and one edge-to-edge square page on narrow screens. Tap the left third of the book to go back, or the right two thirds to go forward. Swipe left to advance and right to go back. The navigation buttons, arrow keys and page selector also turn pages. The animation respects the reader’s reduced-motion preference.

A spread can carry text on both pages or on its right page only. Illustration-only left pages expose the localized description as alternative text when available. Where present, the manifest’s opening design supplies the background for pages 1–4 and the decorative motif for pages 1 and 3. A generated motif uses the same private PNG on both pages and the reader falls back to the curated drawing if the PNG is missing or unavailable.

Owners enter **Edit** from the top toolbar. On an illustrated page, the AI image editor opens with the current artwork and shows the credit price before submission. Editing a panorama updates both halves. Owners can manually edit the dedication, synopsis and eligible pages with separately rendered text. Saving publishes a new edition revision and preserves earlier paid proofs. **Read** returns to the book.

If the illustration edit is interrupted or still processing, the editor keeps the instructions open. Applying the same change again reuses the original correction ID.

Owners can also duplicate the edition, request narration and download self-print files on demand. Premium translation remains disabled until pricing is approved. Its paid square hardcover uses the separately approved print profile. [Paid print workflow](./PRINT_FULFILLMENT.md)

The worker marks editions with lettering painted into the narrative artwork as
`editionLayout: "embedded-lettering-v2"`. The reader displays those illustrations on pages
5–32 and provides the saved words to screen readers. If an image
fails to load, its words appear on the page. Page 2 displays the frozen publication details as selectable text, alongside the publisher logo and QR. The loader checks these fields against the page transcript before displaying them.
Editions without the layout marker retain their original text placement.

Editions with `generationDesignVersion: 1` show the front title from the approved illustration and keep the exact title in the accessible heading. The back cover displays the frozen style logo and links its QR to `mythoria.pt`. Page 2 uses that same domain as its QR caption. The reader and the print proof use the same cover treatment and retain the publication's localized details and closing invitation.

New publications expose a revision-pinned `previewImage` through the private image endpoint for every interior page. Opening pages and the final invitation retain their selectable HTML and links. Existing editions can omit previews for pages that use HTML.

Owners request printable interior and cover PDFs from the reader or My Stories at the existing self-print rate. The request verifies the currently published edition before taking credits, then follows the existing product request and email lifecycle with private download links.

New premium narrations play and download as one MP3. The owner, public slug and signed-in share-link routes expose that file at audio index `0` with the current `runId`. `download=1` requests an attachment. Existing premium page tracks retain their printed page labels and original indexes. Every media request checks current access and edition, verifies the generation-pinned asset and returns private no-store responses. Share-link media checks the link again on each request, including range requests, so new requests honor expiry and revocation.

The owner, public and shared readers display the version 1 dedication signature in italics at 70% of the dedication copy size. The verified edition's final author line and complete selectable text are preserved.

## Physical hardcover

The 2026-11-25 release opened manual fulfillment for eligible, published square editions. The owner approved the physical proof of _Bea e o Macaco no Nariz_. An author can order a published edition they own or an eligible public edition. The physical print checkout freezes the published revision, page count and shipping data. The purchaser receives the order's private proof pair. Staff review the current proof and the customer reply inbox before dispatching those files to the manual printer partner. The Lulu path requires its own supplier approval and activation. [Release and operating details](./PRINT_FULFILLMENT.md#premium-square-hardcover)

## Runtime configuration and verification

- `PREMIUM_BOOK_BUCKET` must be the same private GCS bucket used by SGW, with public access prevention enabled. Grant WebApp read access to its generation-pinned objects.
- `PREMIUM_BOOK_GENERATION_ENABLED=true` is the operator’s admission switch for new starts. Leave it unset until the compatible worker and reader are ready. Disable it to stop new starts while keeping the bucket configured to serve existing books and pinned orders.
- Customer eligibility continues to use the existing Experimental Features preference. Disabling that preference prevents new premium starts while preserving existing books.
- The isolated Playwright fixture enables premium admission and uses a synthetic eligible author. It checks format selection, refresh, Step 5 review and switching back in all five locales without contacting SGW or Cloud Storage. The Jest storage fixture comes from SGW’s deterministic premium book manifest generator and exercises mixed and legacy spread layout.

## Imported reading proofs

The version 1 imported reading proof records a private source-resolution report and the two reviewed PDFs on the manifest. Its published marker carries `readingProof: true`. Owners can read and edit these editions. New self-print charges, PDF reward redemptions and physical order reservations require a print-eligible edition. Existing paid requests continue using their original revision pins.
