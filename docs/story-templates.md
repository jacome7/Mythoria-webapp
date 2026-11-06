# Story templates and optional personalization

Step 2 retains text, image, audio and saved-character creation and adds eight localized editorial story starting points. Known intent ranks suggestions; mapped editorial sample books can enter with a validated `templateId`. Public user stories are not templates. English, Portuguese, Spanish, French and German catalogs and UI bundles are included.

The optional journey uses an editable premise, creative preferences and short choice questions. Users can continue with sufficient input without completing guidance. Questions arrive in groups of three, up to nine admitted requests per journey. Fiction can suggest an editable choice; memory mode never preselects personal facts. Only confirmed answers enter the compiled brief; proposed and skipped answers are excluded. Saved state is scoped to the current signed-in user and retained within the browser session. The regular next step remains the editable story outline.

## Interfaces and recovery

- Templates and guided requests are available to all authors; discovery is also available to signed-out visitors. Profile experimental preferences do not control access.
- `POST /api/story-guide/next-question` validates the authenticated, bounded request and proxies to SGW. Requests carry revision and session IDs; obsolete responses are ignored. Unavailable or invalid guidance uses authored localized fallback questions. Guidance neither creates a story nor spends user credits.
- `POST /api/story-guide/draft` accepts a client-persisted UUID, title up to 300 characters, plot description up to 40,000 characters and a supported locale. See [draft API](story-guide-draft.md). Retries return the same owned draft without replacing content or immutable referral snapshots.
- `POST /api/stories/genai-structure` accepts optional `storyPreferences`, `factuality: 'memory'` and `structureRequestId`. The existing character, media and paid-generation contracts remain in place. Character association retries preserve the existing relation and role.
- The client persists the exact structure payload and request identity before dispatch. SGW deduplicates identical requests across instances. `GET /api/jobs/:jobId` checks author ownership before exposing `story_structure` results; existing other job behavior remains unchanged. An existing pending job must be resumed or allowed to reach terminal state before submitting changed content.

The same story draft is reused after recoverable errors. Retry a pending structure request with its original identity and payload. Rotate its request identity only for a known terminal failure or a confirmed changed brief. SGW resolves staged media against a verified source or same-story destination; acceptance alone does not prove files were moved.

Structure retries preserve the original request ID and payload. SGW deduplicates accepted jobs and polling remains owner-scoped.

## Release and validation

See the [cross-service runbook](../../docs/STORY_TEMPLATES.md) and [SGW contract](../../story-generation-workflow/docs/story-templates.md). SGW migrations `0008_violet_proudstar.sql` and `0009_smooth_ink.sql` were applied with explicit authorization on 2026-09-19 after a successful full-instance backup. Exact migration hashes and absence of pending journaled migrations were verified. The additive WebApp core opt-in migration `0044_massive_blur.sql` was applied with authorization on 2026-10-27 after successful full-instance backup `1793123687408`; all 1,023 existing authors were verified disabled. See the [opt-in migration record](../../docs/EXPERIMENTAL_FEATURES_MIGRATION_2026-10-27.md). See the [operation record](../../docs/STORY_TEMPLATES_LOCAL_TEST_2026-09-19.md).

Validate with mocked service and route tests, type checking, lint, formatting, locale and environment parity, and builds. Use isolated databases for integration tests.

Keep metrics to template IDs, question depth, skips, source, latency and completion. Do not record story prompts, personal answers, media contents or private job results in analytics. Evaluate first-outline completion and perceived personalization alongside optional-detail usage; skipping a question is not itself a failure.

The experimental profile opt-in is persisted by the generated core migration `0044_massive_blur.sql` (`authors.experimental_features_enabled boolean DEFAULT false NOT NULL`). This migration was applied with authorization on 2026-10-27 after backup, and the non-null column, default false and exact journal hash were verified. Application deployment and signed-in feature validation remain separate. Consumer author mirrors require no independent migration. The preference remains available for other experimental features and does not control templates. See the cross-service runbook for rollout checks.

## Guided step 2 preview (all 5 supported locales)

The shared site footer is hidden on all five `tell-your-story/step-[1-5]` routes, for every locale and eligibility state. The wizard entry page retains it. In the guided preview, mobile navigation stays fixed with reserved bottom space and safe-area padding; desktop navigation remains in normal document flow below the content.

Step 2 provides text, photo/drawing and voice inputs across all five supported locales. Characters are offered only when the account has saved characters. Guided copy is in the locale message bundles.

After choosing a model, the selected-model label and editable summary stay visible. Personalization is an expanded question-only section: an authored localized first question appears immediately without an AI call. Later questions adapt only to confirmed answers. Preferences remain optional and closed. New template journeys do not show general text/photo/audio/character buttons; restored independent contributions remain editable under a separate disclosure. Memory journeys begin with an open factual question, without invented suggested answers. A single secondary section offers another model or the author's own idea, using the existing confirmations. Catalogue navigation preserves the journey. Leaving a model warns about customized preferences and guided-answer photographs. Guide responses arriving after unmount are ignored.

Browsing models retains inputs. Selecting a model with existing inputs requires explicit confirmation before clearing text, images, audio and the character selection for this step only. Author/dedication data, saved library characters and pending submission identities survive. Returning to freeform removes template guidance but preserves direct contributions. Existing deep links use the same confirmation. Media upload and analysis run in the background without disabling editing or adding page-level waiting messages. Continue opens the existing progress modal if any media is unfinished; once all media succeeds, submission proceeds automatically with the latest inputs. Returning to edit cancels that automatic continuation without stopping uploads. Errors stay in the modal with a direct action to review the affected images or audio; generation never silently skips failed or unfinished files. Pending generation recovery and restructure confirmation remain in force.

The SGW guide requests formal, direct, clear and friendly European Portuguese for `pt-PT`, and informal, direct, clear and friendly tone for `en-US`, `es-ES`, `fr-FR` and `de-DE`. Browser tests must not call live generation or image-analysis providers without separate authorization. A real mobile keyboard remains a separate device check.

### Guided protagonist photographs

Questions may declare `photoTarget: 'protagonist'`; generated questions do so when the client requests `photoAnswers: true` in any supported locale. The authored first question supports a photograph under the custom answer. The own-idea input path retains its previous behavior.

The custom answer can contain text, a photograph, or both. Upload/analysis state and subject selection are persisted in `answerDraft`, separate from accepted answers. A group photograph requires explicit subject selection; a single detected subject is selected automatically. Only real photo metadata with a detected subject can be confirmed. Interrupted processing restores as a retryable error. Late results after removal, replacement or unmount are ignored. Processing permits three analysis attempts per photograph; replacement starts a new input. Continue asks before omitting an unconfirmed custom answer. Skipping a question or removing its accepted answer removes its reference from the creation, without physically deleting storage files.

One protagonist reference is supported per journey, within the existing total limit of three images. Confirmed answers persist `photo` with stable image ID, original object path and selected detector index. The structure payload and its fingerprint include the explicit `characterReferences` association (question, confirmed answer, submitted image path, selected index, `targetRole: 'protagonist'`). The API gates these fields and requires inclusion in the submitted image paths. The guide receives selected-subject appearance only, never background or OCR from a reference photograph.

SGW validates ownership and subject metadata, prepares the selected crop, binds it to exactly one protagonist, and passes the stored character photograph through the existing illustration-reference pipeline. Failure to crop, bind or persist the explicit reference fails the job instead of silently ignoring the photo. The original photograph is excluded from cover/background references and generic subject guessing; visual appearance does not establish personal biography or real events. No image provider change or database migration is required.

Keep original staging paths for retries: acceptance is not proof of relocation. Photo preview URLs may be remapped only after observed completion. Retrying an accepted payload/job does not reconcile or delete generated character associations. Existing pending job identities and exact payload recovery remain unchanged. A real-provider resemblance assessment remains a separate, explicitly authorized validation.
