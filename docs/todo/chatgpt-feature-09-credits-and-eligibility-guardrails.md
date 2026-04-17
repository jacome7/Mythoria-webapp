# Feature 09 - Credits and Eligibility Guardrails

Status: Implemented (core MCP scope, 2026-02-11)

## Description

This feature provides safe credit visibility and eligibility checks for story actions in ChatGPT.

Important policy note:

- ChatGPT app policy currently disallows selling digital products/services (including credits) in apps.
- This feature is therefore read-only and action-eligibility focused, not purchase-flow focused.

It should help users answer:

- "Can I generate this now?"
- "Do I have enough credits?"
- "What action consumed my credits recently?"

## Workflow

1. User requests an action (create/narrate/print/export).
2. Assistant checks credits balance and recent usage.
3. Assistant states eligibility:

- eligible -> proceed
- not eligible -> explain shortfall and safe next options

4. Assistant avoids direct in-app digital credit sales flow.

## Communication examples

1. User: "Do I have enough credits for audiobook generation?"

- Assistant: returns balance, required credits, and yes/no eligibility.

2. User: "Why did my balance drop yesterday?"

- Assistant: summarizes recent ledger entries.

3. User: "Buy more credits now."

- Assistant: explains ChatGPT app limitation and points user to Mythoria web account area without executing in-app sale flow.

## Dependencies

- Existing `mythoria.account.credit_usage` and `mythoria.account.payment_history` tools.
- Existing `/api/my-credits` and `/api/payments/history` data.
- Pricing lookup support from existing pricing services.
- App submission policy compliance checks.

## Implemented tools

1. Existing:

- `mythoria.account.credit_usage`
- `mythoria.account.payment_history`

2. New eligibility helper:

- `mythoria.credits.check_eligibility` (read-only, OAuth scope `mythoria.credits.read`)

## Implemented behavior

1. Eligibility checks:

- Supports `action`:
  - `ebook`
  - `audiobook`
  - `print`
  - `story_generation` (combined feature mix)
- Returns:
  - `eligible`
  - `requiredCredits`
  - `availableCredits`
  - `shortfall`
  - pricing breakdown and recommended next tools

2. Policy-aware guidance:

- Tool responses explicitly mark in-chat digital credit purchase as disallowed.
- For shortfall scenarios, guidance routes users to Mythoria web billing/account flows.

## Notes

- `story_generation` eligibility uses existing pricing aggregation logic for selected features.
- This feature remains informational/eligibility-only and does not execute in-chat credit purchases.
