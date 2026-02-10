# Feature 07 - Mythoria Knowledge and Writing Coach

## Description

This feature delivers Mythoria guidance and writing help inside ChatGPT.

It combines:

- FAQ and policy/product Q&A.
- Story writing coaching prompts.
- Actionable tips based on user goal, audience, and style.

Goal: make Mythoria useful even before users create a story, improving activation.

## Workflow

1. User asks product question or writing guidance request.
2. App routes request:
- product/platform question -> FAQ tools
- creative writing question -> coaching tool
3. Assistant responds with concise guidance plus suggested next action.
4. User can continue with iterative coaching or start story creation.

## Communication examples

1. User: "How many credits do I need for an audiobook?"
- Assistant: uses FAQ/pricing-aware answer path.

2. User: "Give me tips to write a better opening for kids age 8."
- Assistant: returns short coaching checklist and example opening.

3. User: "I want a mystery story but not too scary."
- Assistant: suggests tone, pacing, and scene techniques.

4. User: "Now start creating it."
- Assistant: transitions to Feature 03 workflow.

## Dependencies

- Existing `faq.list` and `faq.query` tools.
- Existing FAQ content and locale support.
- Story enum values for audience/style/language.
- Feature 03 creation tools for seamless handoff.

## Development plan

1. Keep FAQ tools as primary source of truth for Mythoria product info.

2. Add coaching tool:
- `stories.coach` with controlled outputs (tips, examples, checklist).
- enforce non-fabrication for product/account claims by routing those to FAQ.

3. Add intent router layer:
- classify "product question" vs "creative coaching" vs "creation request".

4. Add localized coaching templates:
- initial support for existing locales.

5. Acceptance criteria:
- Product questions are answered from Mythoria FAQ sources.
- Coaching responses are concise, practical, and reusable in creation flow.
- Handoff from coaching to creation is smooth.
