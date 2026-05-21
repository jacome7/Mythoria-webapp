# Homepage Sample Book Generator

Development utility for proposing and generating new homepage gallery samples.

The homepage gallery reads `public/SampleBooks/SampleBooks.json` and expects two images per sample:

- `public/SampleBooks/{id}.jpeg`
- `public/SampleBooks/{id}_scene.jpeg`

This tool keeps review and apply as separate steps. Suggestions and temporary images are written under
`scripts/sampleBookGenerator/generated/` and are ignored by git.

## Setup

```powershell
cd C:\Mythoria\mythoria-webapp
python -m venv scripts\sampleBookGenerator\.venv
scripts\sampleBookGenerator\.venv\Scripts\python.exe -m pip install -r scripts\sampleBookGenerator\requirements.txt
```

For Gemini-backed suggestions and image generation, set one of:

```powershell
$env:GOOGLE_GENAI_API_KEY = "..."
# or
$env:GEMINI_API_KEY = "..."
```

## Commands

Audit the current gallery:

```powershell
python scripts\sampleBookGenerator\sample_book_generator.py audit
```

Create a review batch:

```powershell
python scripts\sampleBookGenerator\sample_book_generator.py suggest --count 12 --source https://mythoria.pt/en-US/blog/little-lanterns-personalized-books-help-children-grow
```

Generate images for an approved batch:

```powershell
python scripts\sampleBookGenerator\sample_book_generator.py generate-images --batch scripts\sampleBookGenerator\generated\batches\<batch>.json
```

Apply an approved batch to the homepage assets:

```powershell
python scripts\sampleBookGenerator\sample_book_generator.py apply --batch scripts\sampleBookGenerator\generated\batches\<batch>.json
```

`apply` copies generated images into `public/SampleBooks/` and appends only the homepage metadata fields to
`SampleBooks.json`.

Cover images are generated as flat, full-bleed 2D front cover artwork only: no physical book, spine, shadow,
shelf, table, or 3D mockup. Scene images are generated as photorealistic lifestyle/product shots. The tool
sends the generated cover image as a reference for the scene image so the physical book appears in a real
locale-appropriate setting.
