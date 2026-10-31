# Step 2 pt-PT preview validation — 2026-10-28

The new screen requires the existing server-computed template eligibility (global flag and author opt-in), plus pt-PT. No other locale bundles were edited. No migrations, production deployment, real generation, image analysis, or test database fixtures were executed.

## Automated checks

- WebApp: 141 Jest suites passed; 922 tests passed, 13 skipped. Lint, typecheck, formatting, locale parity and production build passed.
- SGW: 56 Jest suites passed; 386 tests passed. Lint, typecheck, formatting and build passed.
- No production deployment, migrations or live provider evaluation was performed.

WebApp: lint, typecheck, formatting, Jest, locale parity and production build. SGW: lint, typecheck, formatting, Jest and build. New regression coverage exercises additive completed inputs, failed/in-flight media, write/reopen, catalogue cancellation, confirmed reset, incoming links, guided-to-freeform transitions, scoped session clearing and the formal pt-PT guide instruction. Existing recovery and eligibility tests remain active.

## Browser evidence and limits

The authenticated account at localhost:3000 currently receives the standard flow, despite the global flag being enabled. No account preference was changed. Visual checks therefore used an isolated localhost:3105 harness bundling the actual step components and CSS, with fake authentication, a simulated character list and all provider/network operations blocked. The header in this harness is a placeholder; this is not authenticated end-to-end proof.

At 393×852: write, close, reopen, restored text, Continue visibility, browse without data loss and cancel the model confirmation. At 360px: verify absence of the character option for an empty account. Desktop layout was also inspected. Screenshots are stored in the chat artifact folder `step2-implementation` under the current visualization directory: `01-start.jpg`, `02-filled.jpg`, `03-confirmation.jpg`, `04-writing.jpg`, `05-mobile-360.jpg`, `06-desktop.jpg`.

Real mobile keyboard behavior, physical microphone/camera and live-provider quality remain device/provider checks. The fixture does not claim to validate them. No external browser automation replaced the requested integrated Browser.

## Guided photo references — 2026-10-29

Implemented only in the eligible pt-PT template preview. Personalization now opens directly on an authored protagonist question, with no initial provider request. Suitable questions accept a confirmed text/photo answer; real-photo subject selection is explicit for groups. A single protagonist reference (within three total story images) reaches the existing cropped character-photo and illustration-reference chain. New template journeys do not show the general media/character inputs; old independent contributions remain reviewable. The own-idea route is unchanged.

- Final focused WebApp validation: 8 suites, 170 tests passed, covering guide/photo UI, session recovery, submission/replay, API authorization and reference contracts.
- WebApp full Jest: 163 suites and 1,293 tests passed, 13 tests skipped; SurveyRenderer.test.tsx failed to import the unrelated survey RatingTiles.module.css. The final added regression was also covered by the focused run above.
- WebApp lint, typecheck and production build passed. Repository-wide formatting reports seven files outside this change: step-4/page.tsx, AIImageEditor.tsx/test, and four AIImageEditor locale bundles. Changed feature files are formatted.
- SGW full Jest: 59 suites, 409 tests passed. Lint, typecheck and build passed. Repository-wide formatting reports three unrelated files: docs/ai.md, src/utils/imageUtils.ts and src/workers/image-edit-worker.ts; changed SGW files are formatted.
- Independent gpt-6.1-sol validation checked the cross-service contracts, subject binding, source-path recovery, accepted-job replay, and exclusion of background/OCR from reference use. Simpler UI/copy/test work used gpt-6.1-terra.

Authenticated integrated Browser checks: pt-PT at 393x852, 360px width and desktop. Observed direct first question, expanded question-only section, custom text/photo option, accessible upload button, unchanged navigation and no horizontal overflow at 360px. No photo was uploaded and no paid guide/analysis/generation request was made during browser verification. Screenshot: C:/Users/andre/.codex/visualizations/2026/10/27/01a17f78-36dc-7353-b65e-2198cbc34028/step2-guided-photo-reference-mobile.png.

No deployment or database migration was performed. Deploy the matching SGW contract before enabling the WebApp photo-answer UI in a deployed environment; older SGW versions do not support explicit character references. Actual generated resemblance, physical camera behavior and live provider compatibility remain separate authorized checks.

## Saved story entry

In the eligible pt-PT preview, entering step 2 with saved contributions or a selected model offers a choice to resume or start a new story. Returning from a later wizard step goes directly to the current story. Starting again requires confirmation, preserves step 1 and the character library, and does not delete remote stories or files. Pending structure jobs must first resolve before the existing creation can be cleared.

While personalizing a model, «Anterior» asks for confirmation before discarding the model and its guided personalization and returning to the step 2 start. Independent contributions remain available. Cancelling keeps the model unchanged; the saved-story entry behavior is unaffected.
