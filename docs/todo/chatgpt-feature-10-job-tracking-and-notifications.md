# Feature 10 - Job Tracking and Notifications

## Description

This feature provides reliable tracking for long-running actions in ChatGPT.

Target actions:

- Story generation
- Audiobook generation
- Download/export preparation
- Print preparation

Current MCP implementation returns queued jobs but lacks durable status retrieval. This feature closes that gap.

## Workflow

1. User triggers long-running action.
2. Tool returns `jobId`, type, createdAt, estimated timing.
3. User asks "status?" or assistant proactively checks based on follow-up.
4. Status tool returns structured state:
- queued
- running
- completed
- failed
5. On completion, assistant offers next action (open/read/listen/download).

## Communication examples

1. User: "Start audiobook generation for story X."
- Assistant: returns job ID and expected timing.

2. User: "Check job 123 status."
- Assistant: returns current stage and percent.

3. User: "Tell me when ready."
- Assistant: records preference and checks in next turn when asked; if proactive notifications are unsupported, it explains expected follow-up pattern.

4. User: "Job failed, what now?"
- Assistant: shows failure reason and recommended retry/fix action.

## Dependencies

- Existing async endpoints and workflow status fields in stories.
- Existing jobs infrastructure under `/api/jobs/*` (where applicable).
- Existing story and audiobook status fields.
- Feature 03 and 06 action initiators.

## Development plan

1. Implement unified MCP status tool:
- `jobs.getStatus` for all supported job types.

2. Persist real job references:
- map story run IDs and audiobook run IDs into a queryable status model.

3. Add status normalization contract:
- common fields: `jobId`, `type`, `state`, `progress`, `etaSeconds`, `lastUpdatedAt`, `nextAction`.

4. Add error semantics:
- explicit machine-readable failure codes and human-readable summaries.

5. Acceptance criteria:
- Every queued write action has a status lookup path.
- Status responses are consistent across job types.
- Users can complete follow-up actions without manual web checks.
