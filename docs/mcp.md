# MCP Server for Mythoria

The Mythoria MCP server is exposed at `/api/mcp` using the Web Standard Streamable HTTP transport (JSON responses enabled). It supports anonymous FAQ discovery plus Clerk-authenticated, user-scoped tools.

## Authentication

- Set `CLERK_SECRET_KEY` in the environment (see `env.manifest.ts`). Authenticated tools refuse to run without it.
- Clients send `Authorization: Bearer <clerk_jwt>`; use a Clerk session/OAuth token issued for the user.
- Auth failures return JSON `401/403` with descriptive messages. Successful verification injects the resolved author into tool handlers.

## Configure with ChatGPT

1. Open **Settings → Model Context Protocol (MCP)** in ChatGPT and **Add server**.
2. Choose **HTTPS endpoint** and set `https://mythoria.pt/api/mcp`.
3. (Optional) Add a default header `Authorization: Bearer <clerk_jwt>` for authenticated tools.
4. Test with the **`health-check`** tool; it should return `"ok"`.
5. Guidance for prompts: start with `faq.query` for user questions; if the user is signed in, prefer authenticated tools when they ask about their stories, credits, or payments.

## Configure with Google Gemini (Apps/Workspace add-ons)

- Use the MCP HTTPS endpoint `https://mythoria.pt/api/mcp` with JSON responses.
- Provide `Authorization: Bearer <clerk_jwt>` in the request headers when calling authenticated tools.
- Recommended tool call order in agent prompts: `faq.query` → `faq.list` fallback; then user-specific tools (`stories.listMine`, `credits.usage`, `transactions.list`) when the user context is known.

## Available tools (descriptions & examples)

### Public tools

- **health-check** — readiness probe.
  - Example: `{ "tool": "health-check" }` → `ok`.

- **faq.list** — browse FAQ sections/entries with keyword filter and section overviews.
  - Input: `{ "locale": "en-US", "section": "pricing", "q": "subscription" }`
  - Output highlights: `sections[].overview.topQuestions`, `entries[].question/answer`, `guidance` for chatbot summarization.

- **faq.query** — natural-language question answering with semantic fallback.
  - Input: `{ "question": "How do I earn credits?", "locale": "en-US" }`
  - Output highlights: `topHits` (ranked matches with snippets), `matches`, `sectionOverviews`, `semanticFallbackUsed` flag, and guidance to handle ambiguity.

- **credits.purchaseOptions** — list active credit bundles (no auth required).
  - Output: `options[]` with `credits`, `price`, `currency`, `bestValue`, `popular`, plus guidance for recommendations.

### Authenticated tools (require `Authorization: Bearer <clerk_jwt>`)

- **stories.listMine** — lists the user’s stories (temporary drafts hidden unless requested).
  - Input: `{ "includeTemporary": false }`
  - Output: `stories[]` with `status`, `language`, `audience`, `style`, `isPublic/isFeatured`.

- **stories.requestDownload** — queue a downloadable export (PDF/EPUB).
  - Input: `{ "storyId": "<id>", "format": "pdf" }`
  - Output: `jobId`, `status: queued`, `etaSeconds`, and chatbot guidance.

- **stories.requestPrint** — queue print-ready PDF generation.
  - Input: `{ "storyId": "<id>", "deliveryNotes": "spiral binding" }`
  - Output: `jobId`, `etaSeconds`, and guidance to message the user while the job runs.

- **stories.requestNarrate** — queue audio narration.
  - Input: `{ "storyId": "<id>", "voiceId": "warm-narrator", "language": "en-US" }`
  - Output: `jobId`, `etaSeconds`, and guidance to deliver the audio link later.

- **credits.usage** — show credit balance and recent ledger entries.
  - Input: `{ "limit": 25 }`
  - Output: `balance`, `entries[]` (positive = added credits; negative = consumption), plus guidance for summarization.

- **transactions.list** — show payment history/credit purchases.
  - Input: `{ "limit": 20 }`
  - Output: `transactions[]` with `amount`, `currency`, `status`, `provider`, `creditBundle`, and guidance for reconciling credits.

## Example HTTP call

```bash
curl -X POST https://mythoria.pt/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk_jwt>" \
  -d '{"tool":"stories.requestDownload","params":{"storyId":"story-123","format":"pdf"}}'
```

## Tips for chatbot prompts

- Default to `faq.query` for open questions; if `semanticFallbackUsed` is true, summarize `sectionOverviews` and ask a clarifying follow-up.
- For user-specific requests, confirm sign-in and then call `stories.listMine`, `credits.usage`, or `transactions.list` with minimal parameters.
- When a fulfillment job is queued, echo the `jobId`, mention `etaSeconds`, and offer to check back later.
- Combine `credits.purchaseOptions` with `credits.usage` to suggest the right bundle size.
