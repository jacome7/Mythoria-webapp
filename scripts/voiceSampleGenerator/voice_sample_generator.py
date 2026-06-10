#!/usr/bin/env python3
"""Generate static voice sample audio files for Mythoria.

For every supported locale, target audience, and Gemini TTS voice this script
generates a short (~20-30s) narrated story sample using gemini-3.1-flash-tts,
encodes it as MP3 (64 kbps mono via ffmpeg), and stores it under
public/audio/samples/{locale}/{targetAudience}/{voice}.mp3.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
GENERATOR_DIR = Path(__file__).resolve().parent
MANIFEST_PATH = GENERATOR_DIR / "sample_stories.json"
OUTPUT_ROOT = ROOT / "public" / "audio" / "samples"
STORY_ENUMS_PATH = ROOT / "src" / "types" / "story-enums.ts"
VOICE_OPTIONS_PATH = ROOT / "src" / "lib" / "voice-options.ts"
MESSAGES_DIR = ROOT / "src" / "messages"
DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
PCM_SAMPLE_RATE = 24000
PCM_SAMPLE_WIDTH = 2  # 16-bit
MAX_ATTEMPTS = 2
RETRY_BASE_SECONDS = 5.0
AUDIO_TAG_PATTERN = re.compile(r"\[[a-z_]+\]\s*")


@dataclass(frozen=True)
class AudienceSample:
    target_audience: str
    title: str
    texts: dict[str, str]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        values[key] = value
    return values


def load_environment() -> dict[str, str]:
    merged: dict[str, str] = dict(parse_env_file(ROOT / ".env.local"))
    for key, value in os.environ.items():
        if value:
            merged[key] = value
    return merged


def get_api_key(env: dict[str, str]) -> str | None:
    return env.get("GOOGLE_GENAI_API_KEY") or env.get("GEMINI_API_KEY")


def parse_ts_enum(path: Path, enum_name: str) -> list[str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"export enum {re.escape(enum_name)} \{{(.*?)\n\}}", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse {enum_name} from {path}")
    return re.findall(r"=\s*'([^']+)'", match.group(1))


def parse_gemini_voices(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const GEMINI_VOICES[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse GEMINI_VOICES from {path}")
    voices = re.findall(r"value:\s*'([^']+)'", match.group(1))
    if not voices:
        raise RuntimeError(f"GEMINI_VOICES block in {path} contained no voices")
    return voices


def supported_locales() -> list[str]:
    locales = sorted(p.name for p in MESSAGES_DIR.iterdir() if p.is_dir())
    if not locales:
        raise RuntimeError(f"No locale folders found in {MESSAGES_DIR}")
    return locales


def load_samples() -> tuple[dict[str, str], list[AudienceSample]]:
    data = load_json(MANIFEST_PATH)
    notes = data.get("directorsNotes")
    samples_raw = data.get("samples")
    if not isinstance(notes, dict) or not isinstance(samples_raw, list):
        raise RuntimeError(f"{MANIFEST_PATH} must contain directorsNotes and samples")
    samples = [
        AudienceSample(
            target_audience=str(item["targetAudience"]),
            title=str(item["title"]),
            texts={str(k): str(v) for k, v in item["texts"].items()},
        )
        for item in samples_raw
    ]
    return {str(k): str(v) for k, v in notes.items()}, samples


def validate_contract() -> tuple[list[str], list[str], list[str], dict[str, str], list[AudienceSample]]:
    target_audiences = parse_ts_enum(STORY_ENUMS_PATH, "TargetAudience")
    voices = parse_gemini_voices(VOICE_OPTIONS_PATH)
    locales = supported_locales()
    notes, samples = load_samples()

    sample_audiences = {sample.target_audience for sample in samples}
    enum_audiences = set(target_audiences)
    if sample_audiences != enum_audiences:
        missing = sorted(enum_audiences - sample_audiences)
        extra = sorted(sample_audiences - enum_audiences)
        raise RuntimeError(
            "TargetAudience enum and sample_stories.json do not match "
            f"(missing={missing}, extra={extra})"
        )
    if set(notes.keys()) != enum_audiences:
        raise RuntimeError("directorsNotes keys do not match the TargetAudience enum")
    for sample in samples:
        missing_locales = sorted(set(locales) - set(sample.texts.keys()))
        if missing_locales:
            raise RuntimeError(
                f"Sample {sample.target_audience} is missing locales: {missing_locales}"
            )

    return target_audiences, voices, locales, notes, samples


def build_prompt(notes: str, text: str) -> str:
    return (
        "You are narrating a short story sample for an audiobook preview. "
        f"Voice direction: {notes} "
        "Read the following story excerpt aloud in the language it is written in, "
        "reciting the text exactly as written and honouring the inline audio tags:\n\n"
        f"{text}"
    )


def strip_audio_tags(text: str) -> str:
    return AUDIO_TAG_PATTERN.sub("", text)


def output_path(locale: str, audience: str, voice: str) -> Path:
    return OUTPUT_ROOT / locale / audience / f"{voice.lower()}.mp3"


def iter_jobs(
    samples: list[AudienceSample],
    voices: list[str],
    locales: list[str],
    audience_filter: str | None = None,
    locale_filter: str | None = None,
    voice_filter: str | None = None,
):
    for sample in samples:
        if audience_filter and sample.target_audience != audience_filter:
            continue
        for locale in locales:
            if locale_filter and locale != locale_filter:
                continue
            for voice in voices:
                if voice_filter and voice.lower() != voice_filter.lower():
                    continue
                yield sample, locale, voice


def extract_audio_bytes(response: Any) -> bytes:
    parts = list(getattr(response, "parts", None) or [])
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        parts.extend(getattr(content, "parts", None) or [])

    for part in parts:
        inline_data = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
        data = getattr(inline_data, "data", None) if inline_data else None
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)

    raise RuntimeError("Gemini response did not contain audio bytes")


def generate_speech(api_key: str, model: str, prompt: str, voice: str) -> bytes:
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "Missing google-genai. Install scripts/voiceSampleGenerator/requirements.txt"
        ) from exc

    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                        )
                    ),
                ),
            )
            return extract_audio_bytes(response)
        except Exception as exc:  # noqa: BLE001 - retry on transient API errors
            last_error = exc
            if attempt == MAX_ATTEMPTS:
                break
            wait = RETRY_BASE_SECONDS * (2 ** (attempt - 1))
            print(f"  attempt {attempt} failed ({exc}); retrying in {wait:.0f}s")
            time.sleep(wait)
    raise RuntimeError(f"Speech generation failed after {MAX_ATTEMPTS} attempts: {last_error}")


def pcm_duration_seconds(pcm: bytes) -> float:
    return len(pcm) / (PCM_SAMPLE_RATE * PCM_SAMPLE_WIDTH)


def save_mp3(pcm: bytes, path: Path, bitrate: str) -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found on PATH; it is required to encode MP3 output")
    path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-f",
        "s16le",
        "-ar",
        str(PCM_SAMPLE_RATE),
        "-ac",
        "1",
        "-i",
        "pipe:0",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        bitrate,
        str(path),
    ]
    result = subprocess.run(command, input=pcm, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode(errors='replace')}")


def run_generate(args: argparse.Namespace) -> int:
    _audiences, voices, locales, notes, samples = validate_contract()
    env = load_environment()
    model = args.model or env.get("GOOGLE_GENAI_TTS_MODEL") or DEFAULT_MODEL
    api_key = get_api_key(env)
    jobs = list(iter_jobs(samples, voices, locales, args.audience, args.locale, args.voice))

    print(f"Planned voice sample jobs: {len(jobs)}")
    print(f"Model: {model}; bitrate: {args.bitrate}")
    if args.dry_run:
        for sample, locale, voice in jobs:
            path = output_path(locale, sample.target_audience, voice)
            status = "exists" if path.exists() else "missing"
            print(f"  {path.relative_to(ROOT)} ({status})")
        return 0
    if not api_key:
        raise RuntimeError(
            "Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY, or add GOOGLE_GENAI_API_KEY to .env.local"
        )

    failures: list[str] = []
    for index, (sample, locale, voice) in enumerate(jobs, start=1):
        path = output_path(locale, sample.target_audience, voice)
        rel = path.relative_to(ROOT)
        if path.exists() and not args.force:
            print(f"[{index}/{len(jobs)}] Skipping existing {rel}")
            continue
        text = sample.texts[locale]
        print(f"[{index}/{len(jobs)}] Generating {rel}")
        try:
            try:
                pcm = generate_speech(
                    api_key, model, build_prompt(notes[sample.target_audience], text), voice
                )
            except RuntimeError:
                # Some voice/language combinations reject inline audio tags
                # (empty response, finish_reason OTHER). Retry without tags;
                # the director's notes still carry the style direction.
                print("  retrying without inline audio tags")
                pcm = generate_speech(
                    api_key,
                    model,
                    build_prompt(notes[sample.target_audience], strip_audio_tags(text)),
                    voice,
                )
            duration = pcm_duration_seconds(pcm)
            if duration < args.min_seconds:
                raise RuntimeError(f"audio too short ({duration:.1f}s)")
            save_mp3(pcm, path, args.bitrate)
            print(f"  saved {rel} ({duration:.1f}s, {path.stat().st_size // 1024} KB)")
        except Exception as exc:  # noqa: BLE001 - collect and continue
            failures.append(f"{rel}: {exc}")
            print(f"  FAILED: {exc}")
        if args.delay_seconds > 0 and index < len(jobs):
            time.sleep(args.delay_seconds)

    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    return 0


def run_audit(args: argparse.Namespace) -> int:
    _audiences, voices, locales, _notes, samples = validate_contract()
    errors: list[str] = []
    count = 0
    for sample, locale, voice in iter_jobs(samples, voices, locales):
        path = output_path(locale, sample.target_audience, voice)
        if not path.exists():
            errors.append(f"missing: {path.relative_to(ROOT)}")
            continue
        count += 1
        size_kb = path.stat().st_size / 1024
        if size_kb < args.min_kb:
            errors.append(f"too small ({size_kb:.0f} KB): {path.relative_to(ROOT)}")

    expected = len(samples) * len(locales) * len(voices)
    print(f"Audited voice samples: {count}/{expected}")
    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("Audit passed.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    generate = subparsers.add_parser("generate", help="Generate voice sample MP3 files")
    generate.add_argument("--dry-run", action="store_true", help="Print planned outputs only")
    generate.add_argument("--force", action="store_true", help="Regenerate existing samples")
    generate.add_argument("--audience", choices=parse_ts_enum(STORY_ENUMS_PATH, "TargetAudience"))
    generate.add_argument("--locale", help="Generate a single locale, e.g. en-US")
    generate.add_argument("--voice", help="Generate a single voice, e.g. Sulafat")
    generate.add_argument("--model", help="Gemini TTS model. Defaults to GOOGLE_GENAI_TTS_MODEL")
    generate.add_argument("--bitrate", default="64k", help="MP3 bitrate (default 64k)")
    generate.add_argument("--min-seconds", type=float, default=10.0)
    generate.add_argument("--delay-seconds", type=float, default=0.0)
    generate.set_defaults(func=run_generate)

    audit = subparsers.add_parser("audit", help="Validate generated voice sample coverage")
    audit.add_argument("--min-kb", type=float, default=50.0)
    audit.set_defaults(func=run_audit)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
