# Custom Writing Personas

Custom Writing Personas let authors tune the narrator voice used for story generation. The feature is intentionally small: most authors create a custom voice for one book in Step 4, while saved personas act as optional presets for authors who want to reuse a voice.

## User Workflow

- In `Tell Your Story -> Step 4`, the narrator persona picker shows Mythoria's built-in literary personas, any saved author personas, and a final option to create a custom voice for the current book.
- The one-book custom voice does not ask for a name. It stores the selected POV, trait sliders, techniques, and special requirements on the draft story as generation input.
- The `My Personas` page is available from the Clerk user menu. It lets signed-in authors create, edit, and delete up to three reusable named personas.

## Persona Fields

- `pov` controls who tells the story: first person, second person, limited third, omniscient third, or objective observer.
- `tone`, `formality`, `rhythm`, `vocabulary`, `fictionality`, `dialogueDensity`, `sensoriality`, and `subtextIrony` are 1-5 writing-style sliders.
- `techniques` are optional narrator tools such as free indirect discourse, fourth-wall breaks, or oral cadence.
- `specialRequirements` is a short instruction block capped at 600 characters.

The UI guidance paraphrases the Mythoria blog article on literary personas and Fernando Pessoa: personas are treated as the narrator's mask, shaping pacing, word choice, dialogue, emotional distance, and the details the story notices.

## Storage and Limits

- Saved personas live in `writing_personas`, owned by `mythoria_db` through the webapp Drizzle schema.
- Saved persona `codename` values are server-generated UUIDs.
- The API enforces the maximum of three saved personas per author.
- One-book custom voice settings live on the draft story in `custom_writing_persona`.
- The existing `literary_persona` enum remains the source for built-in Mythoria personas.

## Generation Contract

Story Generation Workflow checks `custom_writing_persona` first. When present, it formats those settings into the same `literaryPersonaGuidance` prompt block used by built-in personas. If no custom settings exist, SGW loads the selected built-in persona. If neither exists, generation falls back to `classic-novelist`.

Deleting a saved persona does not rewrite old stories. Generated books already contain the resulting voice in their text, and drafts using one-book custom settings carry those settings directly on the story.
