# Guided story draft API

`POST /api/story-guide/draft` prepares a temporary story for the Step 2 template journey. It requires a signed-in author and the server runtime flag `STORY_TEMPLATES_ENABLED=true` (default off).

The JSON body contains `draftId` (UUID), `title` (1–300 characters after trimming), `plotDescription` (up to 40,000 characters), and `storyLanguage` (`en-US`, `pt-PT`, `es-ES`, `fr-FR`, or `de-DE`). Unknown fields are rejected. JSON request text is bounded at 250,000 characters to accommodate escaped Unicode within the field limits.

The client saves the draft UUID before sending. Repeating the request returns the same author's existing story without overwriting its content or original referral snapshot. Referral attribution is linked before the transactional creation. An insert conflict is resolved with an owner-filtered lookup; another author's draft never returns content.

Responses: `200 { story }` for creation or an eligible existing draft; `400` for invalid input; `401` without authentication; `404` when disabled or the UUID belongs to another author; `409` when the existing story is outside temporary/draft status or its generation is queued, running, or completed; `413` for an oversized request; `500` for an unexpected failure.

The ordinary `/api/stories` endpoint is unchanged. This endpoint does not launch generation or update a repeated draft. No database migration is required: the client UUID uses the existing story primary key.
