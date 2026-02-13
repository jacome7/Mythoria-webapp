# Feature 09 - Credits and Eligibility Guardrails

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

- Existing `credits.usage` and `transactions.list` tools.
- Existing `/api/my-credits` and `/api/payments/history` data.
- Pricing lookup support from existing pricing services.
- App submission policy compliance checks.

## Development plan

1. Keep and improve read-only tools:
- normalize response shape for clear eligibility checks.
- include action-specific required credits utility.

2. Restrict commerce behavior for publishable app profile:
- disable direct credit purchase recommendations in tool copy.
- remove or gate `credits.purchaseOptions` in public listing profile if required by policy review.

3. Add eligibility helper tool:
- `credits.checkEligibility` for common actions (ebook, audiobook, print).

4. Add policy-aware assistant messaging:
- avoid hidden upsells.
- keep responses factual and user-intent aligned.

5. Acceptance criteria:
- Users can understand balance and action eligibility in one turn.
- No in-app digital credit sales implementation in published app profile.
- Tool descriptions remain policy-compliant.
