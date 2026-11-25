# Test Story Whisperer locally

Use the `codex/story-whisperer` feature worktrees under `biographer-phase-1` and Node 24.18.1. WebApp serves the wizard, SGW the interview and structure APIs, and SGW’s separate WebSocket process handles live voice. Admin is needed only for staff controls. See [operations and data retention](biographer.md).

## Isolated migration rehearsal

From the WebApp feature worktree, run the rehearsal against in-memory PostgreSQL using a locally installed PGlite module. The command does not read the application's database connection. On this Mac the previously installed test dependency is under the path below.

```sh
NODE_PATH=/private/tmp/story-whisperer-entry-check/node_modules npm run story-whisperer:rehearse
```

For an interactive persisted pilot the selected PostgreSQL database needs the 0051 schema and runtime grants. This workspace's development configuration historically points to production. Select a disposable local database for automated fixtures and verify its effective connection first. Applying the new migration to the shared database is a separate release operation.

The rehearsal follows a Portuguese romance interview from typed replies through voice admission and transcript checkpoints into the structure request. It checks the school, city, approximate year and book, and verifies that an unanswered suggestion stays out of the story. Voice transcripts and model replies in this fixture are supplied by the test.

## Services and manual checks

With local service URLs, Clerk access, matching gateway callback secrets, an authorized Google identity, and local flags enabled (WebApp and SGW `BIOGRAPHER_ENABLED=true`, voice gateway `BIOGRAPHER_LIVE_ENABLED=true`):

```sh
npm run story-whisperer:local -- start
npm run story-whisperer:local -- status
```

Open Step 2 at `http://localhost:3000/en-US/tell-your-story/step-2`. Choose Story Whisperer, type a character, setting, and a turning point, then inspect the three indicators. Try a photo and caption, edit a dictated answer before sending, and switch to a live voice conversation. Check that the live status updates in the conversation and disappears when paused. Disconnect and reconnect to compare the pending and saved turns. Close and reopen the same wizard story. Choose **Continue with Story Whisperer** and check that the saved chat opens directly. Choose **Start over** in the chat header and check that the conversation shows the confirmation and **Yes** and **No** buttons. Check that **No** preserves the chat. Confirm only with disposable interview material.

In a disposable interview, stop Live Voice in the middle of a sentence using **Pause**, then repeat using the text composer. Check that the microphone stops and text is available immediately, the unfinished turn disappears without a recovery prompt, and completed replies remain after reopening. Repeat with an unexpected disconnect. If partial text was saved, it can be completed in writing or discarded. If speech was detected but no text was saved, repeat the answer. Check in the browser network and IndexedDB panels that Live Voice creates no audio uploads or local segments and that the separate dictation flow still works.

In an interview with characters, setting and plot, keep Live Voice open. Say “I want to keep telling the story” and add a detail. The interview should stay open. Then say “Take me to the outline now”. Check that the last detail is saved and Step 3 opens. In a second interview, use **Continue** while the microphone is active to exercise the same handoff. A single readiness notice should stay beside the reply that first supplied enough information.

With an unsent reply in the composer, open the photo form. Check that the reply and the composer stay visible, then cancel or attach a photo and check that the same reply can be sent.

While the reset question is open, send `Nope` through the composer and check that it closes the confirmation and restores any unsent story reply. Try an ambiguous answer and check that the chat asks for a clear choice. Test a typed `Yes` only with disposable material.

When you send a typed story reply, check that it appears on the right immediately and that three dots appear on the left until the next question arrives. If sending fails, check that the reply is available to retry.

At a mobile width, check that Send takes the place of the Live Voice entry button while the reply has text. Clear or send the reply to bring Live Voice back. At a desktop width, both buttons are available while typing.

Check that the “One moment…” status has a gently pulsing dot while the conversation is loading or processing. With reduced motion enabled, the dot stays still.

Create the outline once ready. Check the same story opens on Step 3 with persisted characters and on Step 4 with editable story details. A paid book-generation submission can debit credits and dispatch cloud work. Test that separately with isolated services and credentials.

Repeat audio capture, interruption, background/foreground recovery, and playback on desktop and a physical phone with HTTPS and microphone permission. Stop the local stack afterward:

```sh
npm run story-whisperer:local -- stop
```
