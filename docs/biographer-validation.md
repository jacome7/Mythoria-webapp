# Story Whisperer release verification

1. Rehearse additive migration 0051 and test admission, parallel reservations, replay, pause and reset on disposable PostgreSQL. Run the WebApp, Admin and SGW focused suites, lint, type checks and five-locale parity.
2. Follow the [local author journey](biographer-local-testing.md) with a real sign-in. Check existing Step 2 inputs, resume and confirmed deletion, captioned photos, editable dictation, interruption, turn recovery, outline creation and standard wizard pricing. Verify a second author cannot read, modify or resume that interview.
3. Compare database and private bucket state after transcription, expiry and reset. Verify Cloud Scheduler, runtime grants, bucket lifecycle, and the author-level allowance controls in Admin.
4. Pilot voice on physical desktop and mobile devices with the deployed model, selected region, locale and quota. Monitor readiness failures, incomplete handoffs, lease failures and retention backlog without logging interview content.

## Verified during implementation

The isolated PostgreSQL rehearsal applies and rolls back the generated SQL and exercises shared allowances, actual owner service calls, duplicate sends, normal draft handoff, transcript deletion and expiry, and permanent deletion with storage and database failure retries. A real Chrome browser exercised the dialog with desktop and mobile viewport sizes. Its synthetic microphone and the production audio worklet exercised dictated-text editing, streaming input, PCM playback and interruption against local fixtures.

A separate short call through the compiled gateway used the configured Google project and Gemini 3.8 Live. It returned PCM audio and an assistant transcript to an isolated checkpoint callback. Physical phones, deployment IAM and scheduling, and a signed-in book wizard using the eventual pilot database still require pilot verification.
