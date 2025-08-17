/**
 * Deprecated shim — Story Structurer moved to Story-generation-workflow (SGW).
 * Use the webapp API route `/api/stories/genai-structure` which proxies to SGW.
 * This file intentionally has no default export.
 */

// Keep a named export that throws to surface accidental usage during runtime/tests.
export function generateStructuredStory(): never {
  throw new Error(
    "Deprecated: genai-story-structurer was removed. Use SGW /ai/text/structure via /api/stories/genai-structure."
  );
}
