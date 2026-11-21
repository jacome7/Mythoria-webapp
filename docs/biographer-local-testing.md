# Test Story Whisperer locally

Use the `codex/story-whisperer` feature worktrees under `biographer-phase-1` and Node 24.18.1. WebApp serves the wizard, SGW the interview and structure APIs, and SGW’s separate WebSocket process handles live voice. Admin is needed only for staff controls. See [operations and data retention](biographer.md).

## Isolated migration rehearsal

From the WebApp feature worktree, run the rehearsal against in-memory PostgreSQL using a locally installed PGlite module. The command does not read the application's database connection. On this Mac the previously installed test dependency is under the path below.

```sh
NODE_PATH=/private/tmp/mythoria-biographer-pglite/node_modules npm run story-whisperer:rehearse
```

For an interactive persisted pilot the selected PostgreSQL database needs the 0051 schema and runtime grants. This workspace's development configuration historically points to production. Select a disposable local database for automated fixtures and verify its effective connection first. Applying the new migration to the shared database is a separate release operation.

## Services and manual checks

With local service URLs, Clerk access, matching gateway callback secrets, an authorized Google identity, and local flags enabled (WebApp and SGW `BIOGRAPHER_ENABLED=true`, voice gateway `BIOGRAPHER_LIVE_ENABLED=true`):

```sh
npm run story-whisperer:local -- start
npm run story-whisperer:local -- status
```

Open Step 2 at `http://localhost:3000/en-US/tell-your-story/step-2`. Choose Story Whisperer, type a character, setting, and a turning point, then inspect the three indicators. Try a photo and caption, edit a dictated answer before sending, and switch to a live voice conversation. Disconnect and reconnect; compare the pending and saved turns. Close and reopen the same wizard story, test Continue and cancel a reset. Confirm reset only with disposable interview material.

Create the outline once ready. Check the same story opens on Step 3 with persisted characters and on Step 4 with editable story details. A paid book-generation submission can debit credits and dispatch cloud work. Test that separately with isolated services and credentials.

Repeat audio capture, interruption, background/foreground recovery, and playback on desktop and a physical phone with HTTPS and microphone permission. Stop the local stack afterward:

```sh
npm run story-whisperer:local -- stop
```
