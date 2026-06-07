# Graphic Template Generator

Development utility for generating the static art-style samples used by the
Tell Your Story step 4 graphic style gallery.

The generator mirrors the story-generation workflow front-cover prompt path:

- loads `src/prompts/images/front_cover.json` from the sibling
  `story-generation-workflow` repo to validate the cover prompt contract exists;
- ports the workflow `refineImagePrompt` behavior;
- removes all title/text requirements because these samples are reused across locales;
- appends the selected style `systemPrompt` from
  `src/prompts/imageStyles.json`;
- explicitly forbids titles, author credits, bylines, `by ...`,
  `illustrated by ...`, signatures, captions, labels, watermarks, logos, and
  any text, pseudo-writing, glyphs, letters, or numbers;
- calls Gemini image generation with `response_modalities`, `image_config`,
  `aspect_ratio=2:3`, and `image_size=1K`.

## Setup

```powershell
cd C:\Mythoria\mythoria-webapp
python -m venv scripts\graphicTemplateGenerator\.venv
scripts\graphicTemplateGenerator\.venv\Scripts\python.exe -m pip install -r scripts\graphicTemplateGenerator\requirements.txt
```

The API key is loaded from the shell first, then from this repo's `.env.local`,
then from `C:\Mythoria\story-generation-workflow\.env.local`. The image model
defaults to `GOOGLE_GENAI_IMAGE_MODEL`; override it with `--model` when needed.

## Commands

Preview all planned outputs without generating images:

```powershell
python scripts\graphicTemplateGenerator\graphic_template_generator.py generate --dry-run
```

Generate or refresh all samples:

```powershell
python scripts\graphicTemplateGenerator\graphic_template_generator.py generate --force
```

Audit generated JPG coverage and dimensions:

```powershell
python scripts\graphicTemplateGenerator\graphic_template_generator.py audit
```
