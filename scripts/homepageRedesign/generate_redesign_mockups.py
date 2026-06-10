#!/usr/bin/env python3
"""Generate papercut redesign mockups from current mobile screenshots.

Temporary tool for the Mythoria all-pages redesign. It reads screenshots from
scripts/homepageRedesign/currentVersion and writes generated mockups to
scripts/homepageRedesign/papercutMockups.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import random
import string
import struct
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT_DIR = Path(__file__).resolve().parent / "currentVersion"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "papercutMockups"
ENV_FILE = ROOT / ".env.local"
OPENAI_IMAGES_EDIT_URL = "https://api.openai.com/v1/images/edits"
DEFAULT_STYLE_REFERENCE = ROOT / "public" / "homepage" / "kids_fantasy" / "Homepage_KidsFantasy.png"


STYLE_PROMPT = """Redesign the first Mythoria mobile screenshot in the same whimsical cardboard papercut visual language shown in the second reference image from the existing homepage.

Keep the page's purpose, information hierarchy, visible text density, form controls, navigation, tables, lists, cards, tabs, disabled states, and primary actions recognizable. Do not invent new product features, rewrite the content, remove critical controls, or change the workflow.

Transform the visual treatment only:
- warm cream paper background with layered cardboard depth;
- cut-paper panels with tactile fiber texture, subtle uneven edges, and soft drop shadows;
- handmade paper tabs, buttons, inputs, cards, progress elements, and table/list rows;
- restrained playful accents that feel like a premium storybook craft interface;
- clear dark-blue typography, readable labels, and high contrast on mobile;
- maintain a polished app UI, not a marketing poster;
- reuse the style cues from Mythoria's existing kids_fantasy papercut assets: layered hills, moon and stars, clouds, dragon, hot-air balloon, boat, flower/leaf accents, rounded yellow stars, storybook paper icons, and the warm cream/navy/gold palette.

Return a clean mobile app screenshot mockup. Keep text legible where possible and preserve the original layout proportions for this screen.
"""


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def image_info(path: Path) -> tuple[int, int, str]:
    with path.open("rb") as file:
        header = file.read(24)

    if len(header) >= 24 and header[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", header[16:24])
        return width, height, "image/png"

    if len(header) >= 2 and header[:2] == b"\xff\xd8":
        with path.open("rb") as file:
            file.read(2)
            while True:
                marker_prefix = file.read(1)
                if not marker_prefix:
                    break
                if marker_prefix != b"\xff":
                    continue
                marker = file.read(1)
                while marker == b"\xff":
                    marker = file.read(1)
                if marker in {b"\xc0", b"\xc1", b"\xc2", b"\xc3", b"\xc5", b"\xc6", b"\xc7", b"\xc9", b"\xca", b"\xcb", b"\xcd", b"\xce", b"\xcf"}:
                    file.read(3)
                    height, width = struct.unpack(">HH", file.read(4))
                    return width, height, "image/jpeg"
                segment_size_bytes = file.read(2)
                if len(segment_size_bytes) != 2:
                    break
                segment_size = struct.unpack(">H", segment_size_bytes)[0]
                file.seek(max(segment_size - 2, 0), 1)

    raise ValueError(f"{path.name} is not a supported PNG or JPEG file")


def round_to_multiple(value: float, multiple: int = 16) -> int:
    return max(multiple, int(round(value / multiple) * multiple))


def choose_output_size(source: Path) -> str:
    width, height, _mime = image_info(source)
    aspect = height / max(width, 1)

    # gpt-image-2 supports custom sizes, but the output ratio must not exceed 3:1.
    # Long full-page screenshots are compressed into the tallest valid portrait.
    output_width = 1024
    output_height = round_to_multiple(output_width * aspect)
    output_height = max(1024, min(3072, output_height))
    return f"{output_width}x{output_height}"


def multipart_body(fields: dict[str, str], file_field: str, file_paths: list[Path]) -> tuple[bytes, str]:
    boundary = "----mythoria-" + "".join(random.choice(string.ascii_letters) for _ in range(24))
    chunks: list[bytes] = []

    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    for file_path in file_paths:
        _width, _height, mime_type = image_info(file_path)
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                (
                    f'Content-Disposition: form-data; name="{file_field}"; '
                    f'filename="{file_path.name}"\r\n'
                ).encode(),
                f"Content-Type: {mime_type}\r\n\r\n".encode(),
                file_path.read_bytes(),
                b"\r\n",
            ]
        )

    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), boundary


def call_openai(
    api_key: str,
    image_path: Path,
    style_reference: Path | None,
    prompt: str,
    model: str,
    quality: str,
    size: str,
    timeout: int,
) -> tuple[bytes, str | None]:
    fields = {
        "model": model,
        "prompt": prompt,
        "quality": quality,
        "size": size,
    }
    image_paths = [image_path]
    if style_reference:
        image_paths.append(style_reference)
    body, boundary = multipart_body(fields, "image[]", image_paths)
    request = urllib.request.Request(
        OPENAI_IMAGES_EDIT_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )

    with urllib.request.urlopen(request, timeout=timeout) as response:
        response_body = response.read()
        request_id = response.headers.get("x-request-id")

    payload = json.loads(response_body.decode("utf-8"))
    image_base64 = payload["data"][0]["b64_json"]
    return base64.b64decode(image_base64), request_id


def generate_one(
    api_key: str,
    source: Path,
    output: Path,
    model: str,
    quality: str,
    timeout: int,
    retries: int,
    style_reference: Path | None,
) -> None:
    size = choose_output_size(source)
    prompt = f"{STYLE_PROMPT}\n\nSource screenshot filename: {source.name}"
    for attempt in range(retries + 1):
        try:
            image_bytes, request_id = call_openai(
                api_key=api_key,
                image_path=source,
                style_reference=style_reference,
                prompt=prompt,
                model=model,
                quality=quality,
                size=size,
                timeout=timeout,
            )
            output.write_bytes(image_bytes)
            suffix = f" request_id={request_id}" if request_id else ""
            print(f"generated {output.name} size={size}{suffix}")
            return
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if error.code in {429, 500, 502, 503, 504} and attempt < retries:
                delay = 2**attempt
                print(f"retry {source.name} after HTTP {error.code} in {delay}s")
                time.sleep(delay)
                continue
            raise RuntimeError(f"OpenAI request failed for {source.name}: HTTP {error.code} {body}")
        except urllib.error.URLError as error:
            if attempt < retries:
                delay = 2**attempt
                print(f"retry {source.name} after network error in {delay}s")
                time.sleep(delay)
                continue
            raise RuntimeError(f"OpenAI request failed for {source.name}: {error}") from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--pattern", default="*.png", help="Input filename glob, e.g. tell-your-story_step-1.png")
    parser.add_argument("--model", default="gpt-image-2")
    parser.add_argument("--quality", default="low", choices=["low", "medium", "high", "auto"])
    parser.add_argument("--style-reference", type=Path, default=DEFAULT_STYLE_REFERENCE)
    parser.add_argument("--no-style-reference", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--retries", type=int, default=2)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_env(ENV_FILE)
    api_key = os.environ.get("OPENAI_API_KEY")

    sources = sorted(args.input_dir.glob(args.pattern))
    if args.limit is not None:
        sources = sources[: args.limit]

    if not sources:
        print(f"No PNG screenshots found in {args.input_dir}", file=sys.stderr)
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    style_reference = None if args.no_style_reference else args.style_reference
    if style_reference and not style_reference.exists():
        print(f"Style reference not found: {style_reference}", file=sys.stderr)
        return 1

    jobs: list[tuple[Path, Path, str]] = []
    for source in sources:
        output = args.output_dir / f"{source.stem}_papercut.png"
        size = choose_output_size(source)
        if output.exists() and not args.overwrite:
            print(f"skip existing {output.name}")
            continue
        jobs.append((source, output, size))

    print(f"input={args.input_dir}")
    print(f"output={args.output_dir}")
    print(f"style_reference={style_reference if style_reference else 'disabled'}")
    print(f"model={args.model} quality={args.quality} jobs={len(jobs)}")

    if args.dry_run:
        for source, output, size in jobs:
            print(f"would generate {source.name} -> {output.name} size={size}")
        return 0

    if not api_key:
        print("OPENAI_API_KEY is missing from .env.local or the environment.", file=sys.stderr)
        return 2

    for source, output, _size in jobs:
        generate_one(
            api_key=api_key,
            source=source,
            output=output,
            model=args.model,
            quality=args.quality,
            timeout=args.timeout,
            retries=args.retries,
            style_reference=style_reference,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
