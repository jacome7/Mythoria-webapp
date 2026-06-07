#!/usr/bin/env python3
"""Generate static graphic-style gallery samples for Mythoria."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
GENERATOR_DIR = Path(__file__).resolve().parent
WORKFLOW_ROOT = ROOT.parent / "story-generation-workflow"
MANIFEST_PATH = GENERATOR_DIR / "audience_samples.json"
OUTPUT_ROOT = ROOT / "public" / "images" / "GraphicTemplates"
FRONT_COVER_PROMPT_PATH = WORKFLOW_ROOT / "src" / "prompts" / "images" / "front_cover.json"
IMAGE_STYLES_PATH = WORKFLOW_ROOT / "src" / "prompts" / "imageStyles.json"
STORY_ENUMS_PATH = ROOT / "src" / "types" / "story-enums.ts"
DEFAULT_MODEL = "gemini-3.1-flash-image"
DEFAULT_ASPECT_RATIO = "2:3"
DEFAULT_IMAGE_SIZE = "1K"
PLACEHOLDER_PATH = ROOT / "public" / "placeholder-story-image.jpg"


@dataclass(frozen=True)
class AudienceSample:
    target_audience: str
    title: str
    prompt_text: str


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
    merged: dict[str, str] = {}
    for env_path in [ROOT / ".env.local", WORKFLOW_ROOT / ".env.local"]:
        for key, value in parse_env_file(env_path).items():
            merged.setdefault(key, value)
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


def load_samples() -> list[AudienceSample]:
    data = load_json(MANIFEST_PATH)
    samples = data.get("samples")
    if not isinstance(samples, list):
        raise RuntimeError(f"{MANIFEST_PATH} must contain a samples array")
    result: list[AudienceSample] = []
    for item in samples:
        result.append(
            AudienceSample(
                target_audience=str(item["targetAudience"]),
                title=str(item["title"]),
                prompt_text=str(item["promptText"]),
            )
        )
    return result


def validate_contract() -> tuple[list[str], list[str], dict[str, Any], list[AudienceSample]]:
    target_audiences = parse_ts_enum(STORY_ENUMS_PATH, "TargetAudience")
    graphical_styles = parse_ts_enum(STORY_ENUMS_PATH, "GraphicalStyle")
    image_styles = load_json(IMAGE_STYLES_PATH)
    front_cover_prompt = load_json(FRONT_COVER_PROMPT_PATH)
    samples = load_samples()

    style_keys = set(image_styles.keys())
    enum_style_keys = set(graphical_styles)
    if style_keys != enum_style_keys:
        missing = sorted(enum_style_keys - style_keys)
        extra = sorted(style_keys - enum_style_keys)
        raise RuntimeError(
            "GraphicalStyle enum and imageStyles.json do not match "
            f"(missing={missing}, extra={extra})"
        )

    sample_audiences = {sample.target_audience for sample in samples}
    enum_audiences = set(target_audiences)
    if sample_audiences != enum_audiences:
        missing = sorted(enum_audiences - sample_audiences)
        extra = sorted(sample_audiences - enum_audiences)
        raise RuntimeError(
            "TargetAudience enum and audience_samples.json do not match "
            f"(missing={missing}, extra={extra})"
        )

    return target_audiences, graphical_styles, front_cover_prompt, samples


def process_prompt(template: str, variables: dict[str, Any]) -> str:
    output = template
    for key, value in variables.items():
        output = output.replace(f"{{{{{key}}}}}", str(value or ""))

    for key, value in variables.items():
        pattern = re.compile(rf"\{{\{{#{re.escape(key)}\}}\}}(.*?)\{{\{{/{re.escape(key)}\}}\}}", re.S)
        replacement = r"\1" if value and str(value).strip() else ""
        output = pattern.sub(replacement, output)

    return output


def refine_image_prompt(raw: str, style_hint: str = "vibrant cover illustration, detailed, soft lighting") -> str:
    prompt = re.sub(r"\s+", " ", raw or "").strip().strip('"')
    prompt = re.sub(r"^(?:An?|The)\s+", "", prompt, flags=re.I)
    prompt = re.sub(r"^Imagine\s+", "", prompt, flags=re.I)
    lower = prompt.lower()
    style_provided = re.search(
        r"(illustration|digital painting|oil painting|watercolor|pixel art|anime|storybook|cinematic|render)",
        lower,
    )
    style = "" if style_provided else style_hint
    if len(prompt) > 600:
        cut = prompt[:600]
        last_period = cut.rfind(".")
        prompt = cut[: last_period + 1] if last_period > 60 else cut
    prompt = re.sub(r"[-,;:]+$", "", prompt).strip()
    return f"{prompt} - {style}" if style else prompt


def build_prompts(
    _front_cover_prompt: dict[str, Any],
    style_config: dict[str, str],
    sample: AudienceSample,
) -> tuple[str, str]:
    prompt_text = refine_image_prompt(sample.prompt_text)
    style_system_prompt = str(style_config.get("systemPrompt") or "").strip()
    system_prompt = f"""
<task>
Title-free front cover sample artwork in vertical A5 format.
</task>

<description>
{prompt_text}
</description>

<composition>
- Create professional cover-style illustration/artwork only.
- The artwork should represent the story concept and target audience visually.
- Use a clean, eye-catching vertical composition suitable for a graphic style gallery.
- Do not reserve blank bands or typography areas.
</composition>

<text_restrictions>
- Do NOT render any title, subtitle, author name, illustrator name, byline, signature, caption, label, logo, watermark, or text of any kind.
- Do NOT include phrases such as "by ...", "written by ...", "illustrated by ...", "art by ...", or any equivalent credit line.
- Do NOT include letters, numbers, pseudo-writing, invented glyphs, book-series marks, publisher marks, badges, speech bubbles with text, signs, posters, or handwritten notes.
- If the scene naturally contains books, papers, tickets, labels, screens, signs, clocks, dials, doors, plaques, clothing, vehicles, or maps, keep those surfaces plain, blank, or purely abstract with no character-like marks.
- Avoid signboards, tickets, placards, document close-ups, readable pages, storefronts, station boards, train plates, license plates, logos, emblems, or any object that invites text.
</text_restrictions>

<critical_instruction>
Generate ONLY the flat cover illustration/artwork. DO NOT show a physical book, book spine, page edges, 3D book mockup, table, shelf, frame, border, or any representation of an actual book object.
</critical_instruction>
""".strip()
    if style_system_prompt:
        system_prompt = f"{system_prompt}\n\n{style_system_prompt}"
    user_prompt = (
        "Generate the title-free vertical cover artwork now. "
        "The final image must contain no text, no pseudo-writing, no title, no byline, "
        "no author or illustrator credit, no logo, no watermark, and no letters or numbers."
    )
    return system_prompt, user_prompt


def output_path(sample: AudienceSample, style: str) -> Path:
    return OUTPUT_ROOT / sample.target_audience / f"{style}.jpg"


def iter_jobs(
    samples: list[AudienceSample],
    styles: list[str],
    audience_filter: str | None = None,
    style_filter: str | None = None,
):
    for sample in samples:
        if audience_filter and sample.target_audience != audience_filter:
            continue
        for style in styles:
            if style_filter and style != style_filter:
                continue
            yield sample, style


def extract_image_bytes(response: Any) -> bytes:
    parts = list(getattr(response, "parts", None) or [])
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        parts.extend(getattr(content, "parts", None) or [])

    for part in parts:
        as_image = getattr(part, "as_image", None)
        if callable(as_image):
            try:
                image = as_image()
                if image is not None:
                    buffer = BytesIO()
                    image.save(buffer, format="PNG")
                    return buffer.getvalue()
            except Exception:
                pass

        inline_data = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
        data = getattr(inline_data, "data", None) if inline_data else None
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)

    raise RuntimeError("Gemini response did not contain image bytes")


def build_generate_config(
    types: Any,
    system_prompt: str,
    aspect_ratio: str,
    image_size: str,
) -> Any:
    image_config_kwargs = {"aspect_ratio": aspect_ratio}
    if image_size:
        image_config_kwargs["image_size"] = image_size
    try:
        image_config = types.ImageConfig(**image_config_kwargs)
    except TypeError:
        image_config_kwargs.pop("image_size", None)
        image_config = types.ImageConfig(**image_config_kwargs)

    config_kwargs = {
        "response_modalities": ["IMAGE"],
        "image_config": image_config,
        "system_instruction": system_prompt,
    }
    try:
        return types.GenerateContentConfig(**config_kwargs)
    except TypeError:
        config_kwargs.pop("system_instruction", None)
        return types.GenerateContentConfig(**config_kwargs)


def generate_image(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    aspect_ratio: str,
    image_size: str,
) -> bytes:
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "Missing google-genai. Install scripts/graphicTemplateGenerator/requirements.txt"
        ) from exc

    client = genai.Client(api_key=api_key)
    config = build_generate_config(types, system_prompt, aspect_ratio, image_size)
    response = client.models.generate_content(
        model=model,
        contents=[user_prompt],
        config=config,
    )
    return extract_image_bytes(response)


def save_jpeg(image_bytes: bytes, path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Missing Pillow. Install scripts/graphicTemplateGenerator/requirements.txt") from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(image_bytes)) as image:
        rgb = image.convert("RGB")
        width, height = rgb.size
        rgb.save(path, "JPEG", quality=92, optimize=True)
        return width, height


def dimensions(path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Missing Pillow. Install scripts/graphicTemplateGenerator/requirements.txt") from exc

    with Image.open(path) as image:
        return image.size


def run_generate(args: argparse.Namespace) -> int:
    target_audiences, styles, front_cover_prompt, samples = validate_contract()
    image_styles = load_json(IMAGE_STYLES_PATH)
    env = load_environment()
    model = args.model or env.get("GOOGLE_GENAI_IMAGE_MODEL") or DEFAULT_MODEL
    api_key = get_api_key(env)
    jobs = list(iter_jobs(samples, styles, args.audience, args.style))

    print(f"Planned graphic template jobs: {len(jobs)}")
    print(f"Model: {model}")
    print(f"Aspect ratio: {args.aspect_ratio}; image size: {args.image_size}")
    for sample, style in jobs:
        path = output_path(sample, style)
        status = "exists" if path.exists() else "missing"
        print(f"  {sample.target_audience}/{style}.jpg ({status})")

    if args.dry_run:
        return 0
    if not api_key:
        raise RuntimeError(
            "Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY, or add GOOGLE_GENAI_API_KEY to .env.local"
        )

    for index, (sample, style) in enumerate(jobs, start=1):
        path = output_path(sample, style)
        if path.exists() and not args.force:
            print(f"[{index}/{len(jobs)}] Skipping existing {path}")
            continue
        system_prompt, user_prompt = build_prompts(front_cover_prompt, image_styles[style], sample)
        print(f"[{index}/{len(jobs)}] Generating {sample.target_audience}/{style}.jpg")
        image_bytes = generate_image(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            aspect_ratio=args.aspect_ratio,
            image_size=args.image_size,
        )
        width, height = save_jpeg(image_bytes, path)
        print(f"  saved {path} ({width}x{height})")
        if args.delay_seconds > 0 and index < len(jobs):
            time.sleep(args.delay_seconds)

    missing = [
        f"missing: {output_path(sample, style)}"
        for sample, style in jobs
        if not output_path(sample, style).exists()
    ]
    if missing:
        raise RuntimeError("Generation finished with missing files:\n" + "\n".join(missing))
    return 0


def audit_missing(target_audiences: list[str], styles: list[str]) -> list[str]:
    missing: list[str] = []
    for audience in target_audiences:
        for style in styles:
            path = OUTPUT_ROOT / audience / f"{style}.jpg"
            if not path.exists():
                missing.append(f"missing: {path}")
    return missing


def run_audit(args: argparse.Namespace) -> int:
    target_audiences, styles, _front_cover_prompt, _samples = validate_contract()
    errors: list[str] = []
    warnings: list[str] = []
    image_count = 0

    for audience in target_audiences:
        for style in styles:
            path = OUTPUT_ROOT / audience / f"{style}.jpg"
            if not path.exists():
                errors.append(f"missing: {path}")
                continue
            image_count += 1
            width, height = dimensions(path)
            if width <= 0 or height <= 0:
                errors.append(f"invalid dimensions: {path}")
                continue
            ratio = width / height
            if abs(ratio - (2 / 3)) > 0.035:
                errors.append(f"not 2:3-ish: {path} ({width}x{height})")
            if min(width, height) < args.min_short_side:
                warnings.append(
                    f"small image: {path} ({width}x{height}); expected short side >= {args.min_short_side}"
                )

    if not PLACEHOLDER_PATH.exists():
        warnings.append(f"placeholder missing: {PLACEHOLDER_PATH}")

    print(f"Audited graphic template images: {image_count}")
    print(f"Expected images: {len(target_audiences) * len(styles)}")
    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")
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

    generate = subparsers.add_parser("generate", help="Generate static graphic template images")
    generate.add_argument("--dry-run", action="store_true", help="Print planned outputs only")
    generate.add_argument("--force", action="store_true", help="Regenerate existing images")
    generate.add_argument("--audience", choices=parse_ts_enum(STORY_ENUMS_PATH, "TargetAudience"))
    generate.add_argument("--style", choices=parse_ts_enum(STORY_ENUMS_PATH, "GraphicalStyle"))
    generate.add_argument("--model", help="Gemini image model. Defaults to GOOGLE_GENAI_IMAGE_MODEL")
    generate.add_argument("--aspect-ratio", default=DEFAULT_ASPECT_RATIO)
    generate.add_argument("--image-size", default=DEFAULT_IMAGE_SIZE)
    generate.add_argument("--delay-seconds", type=float, default=0.0)
    generate.set_defaults(func=run_generate)

    audit = subparsers.add_parser("audit", help="Validate generated static image coverage")
    audit.add_argument("--min-short-side", type=int, default=700)
    audit.set_defaults(func=run_audit)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
