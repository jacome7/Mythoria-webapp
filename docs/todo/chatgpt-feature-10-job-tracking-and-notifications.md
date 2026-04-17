# Feature 10 - Job Tracking and Notifications

Status: Implemented (core MCP backend complete)

## Description

This feature provides a unified status lookup for long-running Mythoria actions in ChatGPT.

Covered actions:

- Story generation
- Audiobook generation
- Story export preparation
- Print request progress

## Workflow

1. User triggers a long-running action (Feature 03/06/export/print).
2. Tool returns a deterministic Mythoria `jobId`.
3. Assistant calls `mythoria.jobs.status`.
4. Tool returns normalized status contract:

- `state` (`queued`, `running`, `completed`, `failed`)
- `progress`
- `etaSeconds`
- `lastUpdatedAt`
- `nextAction`

5. Assistant continues with read/listen/export/print follow-ups based on status.

## Communication examples

1. User: "Start audiobook generation for this story."

- Assistant: queues narration and returns a `jobId`.

2. User: "Check that job now."

- Assistant: calls `mythoria.jobs.status`, reports normalized state/progress.

3. User: "What should I do next?"

- Assistant: reads `nextAction` and `recommendedNextTools` from status payload.

4. User: "It failed, retry."

- Assistant: uses failure info and calls recommended retry tool.

## Dependencies

- Story status fields in `stories`:
- `storyGenerationStatus`
- `storyGenerationCompletedPercentage`
- `audiobookStatus`
- `hasAudio`
- `interiorPdfUri`
- `coverPdfUri`
- Print request records via `print_requests` query path.
- Feature 03 and Feature 06 action initiators.

## Implemented

### Unified status tool

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.jobs.status`

### Job identity contract

- Added deterministic encoded job identifiers (`mythoria-job:*`) with:
- `type`
- `storyId`
- optional `runId`
- `requestedAt`
- Action tools now return trackable jobs:
- `mythoria.story.start_generation`
- `mythoria.story.narration_request`
- `mythoria.story.export_request`
- `mythoria.story.print_request`

### Status normalization

- `mythoria.jobs.status` returns common fields:
- `jobId`, `type`, `storyId`, `runId`
- `state`, `progress`, `etaSeconds`
- `lastUpdatedAt`, `failureCode`, `nextAction`
- Includes `recommendedNextTools` for immediate follow-up.

### Data sources per job type

- Story generation: story generation status/progress fields.
- Audiobook generation: audiobook status/has-audio fields.
- Export: story publication + PDF readiness fields.
- Print: latest print request status via `printRequestService`.

### Auth and metadata

- `mythoria.jobs.status` requires OAuth scope `mythoria.account.read`.
- Tool metadata in `tools/list` includes security schemes.

### Validation

- Added unit tests in `src/lib/mcp/server.test.ts`:
- story-generation normalized running status
- print request normalized status
- auth challenge behavior
- Updated Playwright MCP metadata check in `tests/playwright/mcp.spec.ts`.

## Still missing / follow-up

1. Durable run registry:

- Job IDs are deterministic and queryable, but there is no dedicated persistent cross-run table yet.

2. Export fulfillment integration depth:

- Export status currently derives from story PDF fields.
- A dedicated export workflow/status backend would improve precision.

3. Push notifications:

- Tool supports poll-based follow-up.
- Proactive push notifications are still out of scope.

## Screenshot recommendations

1. Story generation running:

- `mythoria.jobs.status` with `type=story_generation`, `state=running`.

2. Audiobook completed:

- `mythoria.jobs.status` with `type=audiobook_generation`, `state=completed`.

3. Print in progress:

- `mythoria.jobs.status` with `type=print`, `state=running`.

4. Failure handling:

- `mythoria.jobs.status` with `state=failed`, `failureCode`, and retry tool recommendation.

## Copy templates

### Status template

- "Job `{jobId}` is `{state}` at `{progress}%`. Next: {nextAction}"

### Retry template

- "This job failed (`{failureCode}`). I can retry now with `{tool}`."

### Completion template

- "This job is complete. I can continue with `{nextTool}` now."

## Acceptance targets

1. Every async story action returns a status-checkable `jobId`.
2. Status responses are normalized across supported job types.
3. Follow-up actions are suggested without requiring manual route checks.
