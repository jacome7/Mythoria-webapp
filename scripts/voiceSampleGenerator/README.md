# Voice Sample Generator

Generates the static voice preview samples served from `public/audio/samples/`.

For every supported locale (`src/messages/*`), target audience (`TargetAudience`
enum in `src/types/story-enums.ts`), and Gemini TTS voice (`GEMINI_VOICES` in
`src/lib/voice-options.ts`), the script narrates a short (~20-30s) story snippet
with `gemini-3.1-flash-tts-preview` and encodes it as 64 kbps mono MP3:

```
public/audio/samples/{locale}/{targetAudience}/{voice}.mp3
```

The story snippets and per-audience voice direction live in
`sample_stories.json`. Snippets use Gemini TTS inline audio tags
(`[whispers]`, `[excited]`, ...) plus a director's-notes prompt for style
control.

## Requirements

- Python 3.11+
- `pip install -r requirements.txt`
- `ffmpeg` on PATH (PCM -> MP3 encoding)
- `GOOGLE_GENAI_API_KEY` (or `GEMINI_API_KEY`) in the environment or `.env.local`

## Usage

```bash
# Preview the job list (7 audiences x 5 locales x 8 voices = 280 files)
python voice_sample_generator.py generate --dry-run

# Generate everything that is missing (resume-safe; use --force to redo)
python voice_sample_generator.py generate

# Narrow runs
python voice_sample_generator.py generate --locale en-US --audience all_ages --voice Sulafat

# Verify coverage
python voice_sample_generator.py audit
```

The generate command retries transient API errors with exponential backoff and
skips existing files, so it can be re-run until the audit passes.
