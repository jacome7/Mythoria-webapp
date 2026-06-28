# Image Guidance

## Source Guidance

Use `gpt-image-2` as the default image model for new sample-book assets. OpenAI's current image generation guidance presents `gpt-image-2` as the latest GPT Image model, with support for generation and edits, quality controls, flexible sizes, and reference-image workflows.

Important constraints from the OpenAI image guide:

- `gpt-image-2` accepts `low`, `medium`, `high`, or `auto` quality.
- Common reliable sizes include `1024x1024`, `1024x1536`, and `1536x1024`.
- Larger than 2K outputs can be more variable.
- Text rendering is improved but can still fail; inspect title legibility manually.
- Reference images are supported for edit/reference workflows.
- For `gpt-image-2`, omit `input_fidelity`; image inputs are already handled at high fidelity.

Prompting guidance:

- Use a consistent structure: scene, subject, key details, constraints, intended use.
- Be concrete about materials, textures, lighting, framing, and action.
- For photorealism, explicitly use words such as `photorealistic`, `real photograph`, or `professional photography`.
- For people, specify framing, gaze, body scale, and object interaction.

## Cover Image

Create `assets/cover.jpeg`.

The cover must be cover art only:

- No physical book mockup.
- No visible spine.
- No 3D book object.
- Include the title clearly when possible.
- Use the selected Mythoria `graphicalStyle` from `story-generation-workflow/src/prompts/imageStyles.json`.
- Keep the visual age-appropriate for `targetAudience`.

Recommended size: `1024x1536`.

Recommended quality: `medium`; use `high` for final hero-quality covers or text-heavy covers.

## Feature Image

Create `assets/feature.jpeg`.

The feature image must be a photorealistic product/lifestyle photograph featuring the physical book:

- A book being offered as a gift.
- A book on a bedside table.
- A book proudly displayed on a shelf.
- A book being read in a safe family setting.
- A book in a premium flat-lay or product scene.

Use the generated cover image as a reference whenever possible. The feature image should preserve the cover's mood and visible title as closely as the model allows. If exact title rendering fails, regenerate or note the mismatch in `review-checklist.md`.

Recommended sizes:

- `1536x1024` for landing-page hero or wide feature images.
- `1024x1536` for vertical social/product tiles.
- `1024x1024` for card thumbnails.

Photorealistic feature prompt checklist:

- State `photorealistic real photograph`.
- Describe real materials: paper texture, matte cover, fabric, wood, bedside lamp, hands, wrapping paper.
- Describe camera framing: close-up, medium shot, eye-level, top-down, or 50mm-style product photo.
- Describe lighting: soft daylight, warm bedside light, gentle shadows, natural color.
- Keep people fully clothed and context-safe.
- Avoid stock-photo gloss, heavy retouching, distorted hands, and fake logos.

## Review

Manually inspect both images:

- Cover title is readable enough for intended placement.
- Cover style matches the selected `graphicalStyle`.
- Feature photo looks like a real photograph, not an illustration.
- Feature photo shows a physical book, not just flat cover art.
- No real private data, brand logos, unsafe child depictions, or misleading claims are visible.
