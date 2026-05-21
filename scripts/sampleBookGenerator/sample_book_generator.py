#!/usr/bin/env python3
"""Suggest and generate Mythoria homepage sample books.

The script is intentionally self-contained because it is a development utility,
not part of the Next.js runtime.
"""

from __future__ import annotations

import argparse
import base64
import copy
import html
import json
import os
import re
import shutil
import sys
import textwrap
import unicodedata
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[2]
GENERATOR_DIR = Path(__file__).resolve().parent
SAMPLE_BOOKS_DIR = ROOT / "public" / "SampleBooks"
SAMPLE_BOOKS_JSON = SAMPLE_BOOKS_DIR / "SampleBooks.json"
GENERATED_DIR = GENERATOR_DIR / "generated"
BATCHES_DIR = GENERATED_DIR / "batches"
IMAGES_DIR = GENERATED_DIR / "images"

APP_SUPPORTED_LOCALES = ["en-US", "pt-PT", "es-ES", "fr-FR", "de-DE"]
DEFAULT_RARE_LOCALES = ["hi-IN", "zh-CN", "pl-PL", "bg-BG", "it-IT", "nl-NL", "en-GB"]
DEFAULT_SOURCES = [
    "https://mythoria.pt/en-US/blog/little-lanterns-personalized-books-help-children-grow"
]

DEFAULT_TEXT_MODEL = os.environ.get("GOOGLE_GENAI_TEXT_MODEL", "gemini-3.1-flash-lite")
DEFAULT_IMAGE_MODEL = os.environ.get(
    "GOOGLE_GENAI_IMAGE_MODEL", "gemini-3.1-flash-image-preview"
)
DEFAULT_COVER_SIDE_CROP_PERCENT = float(os.environ.get("SAMPLE_BOOK_COVER_SIDE_CROP_PERCENT", "0.08"))

HOMEPAGE_FIELDS = ["id", "title", "synopses", "locale", "intent", "recipients", "tags", "style"]
REVIEW_FIELDS = [
    *HOMEPAGE_FIELDS,
    "coverPrompt",
    "scenePrompt",
    "creatorPersona",
    "inspirationNotes",
    "qualityNotes",
]


class InspirationParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._tag_stack: list[str] = []
        self._current: list[str] = []
        self.title = ""
        self.meta_description = ""
        self.text_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self._tag_stack.append(tag)
        if tag == "meta":
            attr_map = {name.lower(): value or "" for name, value in attrs}
            if attr_map.get("name", "").lower() == "description":
                self.meta_description = html.unescape(attr_map.get("content", "")).strip()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"title", "h1", "h2", "h3", "p", "li"} and self._current:
            text = normalize_space(" ".join(self._current))
            if text:
                if tag == "title" and not self.title:
                    self.title = text
                elif len(text) > 30:
                    self.text_blocks.append(text)
            self._current = []
        if self._tag_stack:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._tag_stack and self._tag_stack[-1] in {"title", "h1", "h2", "h3", "p", "li"}:
            self._current.append(data)


@dataclass
class AuditResult:
    books: list[dict[str, Any]]
    errors: list[str]
    warnings: list[str]
    notes: list[str]


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def parse_ts_string_array(path: Path, export_name: str) -> list[str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"export const {re.escape(export_name)} = \[(.*?)\] as const;", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse {export_name} from {path}")
    return re.findall(r"'([^']+)'", match.group(1))


def load_story_intents() -> list[str]:
    return parse_ts_string_array(ROOT / "src" / "constants" / "intents.ts", "STORY_INTENTS")


def load_story_recipients() -> list[str]:
    return parse_ts_string_array(ROOT / "src" / "constants" / "recipients.ts", "STORY_RECIPIENTS")


def load_sample_books() -> list[dict[str, Any]]:
    data = load_json(SAMPLE_BOOKS_JSON)
    if not isinstance(data, list):
        raise RuntimeError(f"{SAMPLE_BOOKS_JSON} must contain a JSON array")
    return data


def locale_looks_valid(locale: str) -> bool:
    return bool(re.fullmatch(r"[a-z]{2,3}(?:-[A-Z]{2})?", locale))


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.lower()
    ascii_value = re.sub(r"[^a-z0-9]+", "-", ascii_value)
    return ascii_value.strip("-") or f"sample-{uuid4().hex[:8]}"


def unique_id(title: str, existing_ids: set[str]) -> str:
    base = slugify(title)
    candidate = base
    suffix = 2
    while candidate in existing_ids:
        candidate = f"{base}-{suffix:02d}"
        suffix += 1
    existing_ids.add(candidate)
    return candidate


def split_tags(value: str) -> list[str]:
    return [tag.strip() for tag in value.split(",") if tag.strip()]


def locale_lifestyle_context(locale: str) -> str:
    contexts = {
        "pt-PT": "Portugal, such as a Porto tiled table, Lisbon balcony, family living room, local cafe, or bookshop",
        "en-US": "the United States, such as a warm family kitchen, school reading corner, front porch, or independent bookstore",
        "es-ES": "Spain, such as a Madrid apartment, Valencia museum cafe, Barcelona tiled patio, or family reading nook",
        "fr-FR": "France, such as a Paris cafe table, Strasbourg winter window, family apartment, or neighborhood bookshop",
        "de-DE": "Germany, such as a Berlin apartment table, Munich cafe, garden bench, or cozy bookshop display",
        "hi-IN": "India, such as a Pune family home, monsoon window seat, school desk, or colorful neighborhood bookshop",
        "zh-CN": "China, such as a family apartment reading table, school corner, tea table, or city bookshop",
        "pl-PL": "Poland, such as a Krakow cafe table, family apartment, school desk, or neighborhood bookshop",
        "bg-BG": "Bulgaria, such as a Sofia family home, school reading corner, park bench, or local bookstore",
    }
    return contexts.get(
        locale,
        f"a realistic everyday setting common for locale {locale}, with culturally appropriate household or bookshop details",
    )


def build_scene_reference_prompt(item: dict[str, Any]) -> str:
    title = str(item.get("title", "the personalized book"))
    locale = str(item.get("locale", "en-US"))
    synopsis = str(item.get("synopses", ""))
    scene_prompt = str(item.get("scenePrompt", "")).strip()
    locale_context = locale_lifestyle_context(locale)

    return textwrap.dedent(
        f"""
        Create a photorealistic lifestyle product image, not an interior story illustration.

        Use the attached cover image as the exact printed cover of a real physical book titled
        "{title}". The visible book cover must match the reference image as closely as possible.

        Place the book in a real-life setting common for {locale_context}. The book should be the
        sharp central subject, standing or resting naturally on a tactile surface, with locale- and
        story-appropriate props nearby. Use realistic lighting, shallow depth of field, soft bokeh,
        professional product photography, portrait composition, and no logos or copyrighted brands.

        Story context for prop and location choices:
        {synopsis}

        Additional scene guidance:
        {scene_prompt}
        """
    ).strip()


def build_cover_art_prompt(item: dict[str, Any]) -> str:
    title = str(item.get("title", "the personalized book"))
    style = str(item.get("style", "storybook"))
    synopsis = str(item.get("synopses", ""))
    cover_prompt = str(item.get("coverPrompt", "")).strip()

    return textwrap.dedent(
        f"""
        Create ONLY the flat front cover artwork for a personalized storybook titled "{title}".
        The image must be true full-bleed edge-to-edge cover art in a vertical A5 portrait
        composition. The illustrated background and artwork must reach all four image edges.

        Critical restrictions:
        - Do not show a physical book, book mockup, spine, page edges, shelf, table, hands, shadows,
          reflections, or any 3D book structure.
        - Do not place the cover inside another scene or environment.
        - Do not add an outer border, mat, frame, blank margin, white margin, beige margin,
          drop shadow, rounded rectangle, or page-like edge.
        - Do not show the cover as a sheet, poster, card, or object photographed in space.
        - The entire output must be the 2D cover image itself.
        - Include the title text integrated over the artwork, not inside a border or blank band.

        Story context:
        {synopsis}

        Visual direction:
        {cover_prompt}

        Rendered in {style} style, safe, family-friendly, original artwork, no logos or copyrighted
        characters.
        """
    ).strip()


def scene_prompt_uses_cover_reference(prompt: str) -> bool:
    normalized = prompt.lower()
    return "attached cover image" in normalized or "reference image" in normalized


def cover_prompt_is_flat(prompt: str) -> bool:
    normalized = prompt.lower()
    return (
        "flat front cover artwork" in normalized
        and "do not show a physical book" in normalized
        and "do not add an outer border" in normalized
    )


def audit_samples() -> AuditResult:
    books = load_sample_books()
    intents = set(load_story_intents())
    recipients = set(load_story_recipients())
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []
    seen_ids: set[str] = set()

    for index, book in enumerate(books):
        label = book.get("id") or f"index {index}"
        missing_fields = [field for field in HOMEPAGE_FIELDS if field not in book]
        if missing_fields:
            errors.append(f"{label}: missing fields {', '.join(missing_fields)}")
            continue

        book_id = str(book["id"])
        if book_id in seen_ids:
            errors.append(f"{book_id}: duplicate id")
        seen_ids.add(book_id)

        if not (SAMPLE_BOOKS_DIR / f"{book_id}.jpeg").exists():
            errors.append(f"{book_id}: missing cover image {book_id}.jpeg")
        if not (SAMPLE_BOOKS_DIR / f"{book_id}_scene.jpeg").exists():
            errors.append(f"{book_id}: missing scene image {book_id}_scene.jpeg")

        if book["intent"] not in intents:
            errors.append(f"{book_id}: invalid intent {book['intent']}")
        invalid_recipients = [r for r in book.get("recipients", []) if r not in recipients]
        if invalid_recipients:
            errors.append(f"{book_id}: invalid recipients {', '.join(invalid_recipients)}")

        locale = str(book["locale"])
        if not locale_looks_valid(locale):
            warnings.append(f"{book_id}: locale does not look like a locale code: {locale}")

        if len(split_tags(str(book.get("tags", "")))) < 3:
            warnings.append(f"{book_id}: fewer than 3 tags")

    existing_intents = {str(book.get("intent")) for book in books}
    for intent in sorted(set(load_story_intents()) - existing_intents):
        notes.append(f"coverage gap: no existing homepage sample covers intent {intent}")

    return AuditResult(books=books, errors=errors, warnings=warnings, notes=notes)


def print_audit(result: AuditResult) -> None:
    by_locale: dict[str, int] = {}
    by_intent: dict[str, int] = {}
    for book in result.books:
        by_locale[str(book.get("locale"))] = by_locale.get(str(book.get("locale")), 0) + 1
        by_intent[str(book.get("intent"))] = by_intent.get(str(book.get("intent")), 0) + 1

    print(f"Sample books: {len(result.books)}")
    print("By locale:")
    for locale, count in sorted(by_locale.items(), key=lambda item: (-item[1], item[0])):
        print(f"  {locale}: {count}")
    print("By intent:")
    for intent, count in sorted(by_intent.items(), key=lambda item: (-item[1], item[0])):
        print(f"  {intent}: {count}")

    if result.warnings:
        print("\nWarnings:")
        for warning in result.warnings:
            print(f"  - {warning}")
    if result.errors:
        print("\nErrors:")
        for error in result.errors:
            print(f"  - {error}")
    if result.notes:
        print("\nNotes:")
        for note in result.notes:
            print(f"  - {note}")


def fetch_inspiration(urls: list[str]) -> list[dict[str, Any]]:
    inspirations: list[dict[str, Any]] = []
    for url in urls:
        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "MythoriaSampleBookGenerator/1.0 (+development utility)"
                },
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                body = response.read(2_000_000).decode("utf-8", errors="replace")
            parser = InspirationParser()
            parser.feed(body)
            blocks = dedupe_preserve_order(parser.text_blocks)
            inspirations.append(
                {
                    "url": url,
                    "title": parser.title,
                    "description": parser.meta_description,
                    "text": "\n".join(blocks[:24]),
                }
            )
        except Exception as exc:  # pragma: no cover - useful CLI diagnostics
            inspirations.append({"url": url, "error": str(exc), "text": ""})
    return inspirations


def dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def choose_locale(index: int, rare_every: int | None, rare_locales: list[str]) -> str:
    if rare_every and rare_every > 0 and index > 0 and (index + 1) % rare_every == 0:
        return rare_locales[(index // rare_every) % len(rare_locales)]
    weighted = [
        ("pt-PT", 45),
        ("en-US", 20),
        ("es-ES", 15),
        ("fr-FR", 12),
        ("de-DE", 8),
    ]
    expanded: list[str] = []
    for locale, weight in weighted:
        expanded.extend([locale] * weight)
    return expanded[index % len(expanded)]


def build_planning_context(
    count: int,
    existing_books: list[dict[str, Any]],
    rare_every: int | None,
    rare_locales: list[str],
) -> dict[str, Any]:
    by_intent: dict[str, int] = {}
    by_locale: dict[str, int] = {}
    for book in existing_books:
        by_intent[str(book.get("intent"))] = by_intent.get(str(book.get("intent")), 0) + 1
        by_locale[str(book.get("locale"))] = by_locale.get(str(book.get("locale")), 0) + 1

    intents = load_story_intents()
    missing_intents = sorted(intent for intent in intents if by_intent.get(intent, 0) == 0)
    target_intents = missing_intents or sorted(intents, key=lambda intent: (by_intent.get(intent, 0), intent))
    plan: list[dict[str, str]] = []
    for index in range(count):
        plan.append(
            {
                "locale": choose_locale(index, rare_every, rare_locales),
                "intent": target_intents[index % len(target_intents)],
            }
        )

    return {
        "existingCount": len(existing_books),
        "existingIds": [book.get("id") for book in existing_books],
        "existingTitles": [book.get("title") for book in existing_books],
        "byIntent": by_intent,
        "byLocale": by_locale,
        "supportedLocales": APP_SUPPORTED_LOCALES,
        "rareLocales": rare_locales,
        "suggestionPlan": plan,
        "allowedIntents": intents,
        "allowedRecipients": load_story_recipients(),
    }


def build_gemini_suggestion_prompt(
    count: int,
    inspiration: list[dict[str, Any]],
    context: dict[str, Any],
) -> str:
    inspiration_text = json.dumps(inspiration, ensure_ascii=False, indent=2)
    context_text = json.dumps(context, ensure_ascii=False, indent=2)
    return textwrap.dedent(
        f"""
        You are creating review-only homepage gallery samples for Mythoria, a premium personalized
        story platform. The samples must look like stories created by real end-users, not generic
        marketing examples.

        Create exactly {count} new sample book candidates.

        Rules:
        - Return only a JSON array.
        - Use the exact schema keys listed below, with no extra keys.
        - Do not reuse existing ids, titles, character setups, or locations too closely.
        - Prefer pt-PT overall. Use en-US, es-ES, fr-FR, and de-DE less often. Use rare locales only
          when the suggestion plan asks for them.
        - Localize title, synopses, tags, and creatorPersona naturally for the candidate locale.
        - coverPrompt and scenePrompt must always be in en-US and safe for image generation.
        - coverPrompt must describe ONLY flat 2D full-bleed front cover artwork whose illustrated
          background reaches all four image edges.
        - coverPrompt must forbid physical book mockups, book structure, spines, page edges,
          shadows, shelves, tables, hands, and surrounding environments.
        - coverPrompt must forbid outer borders, frames, blank margins, white margins, beige
          margins, drop shadows, and page-like edges.
        - coverPrompt must include visible title text integrated over the artwork, not inside a
          border or blank band.
        - The scenePrompt must describe a photorealistic lifestyle/product image where the physical
          printed book is incorporated into a real-life setting. It is NOT an interior story
          illustration.
        - The scenePrompt must say that the attached/generated cover image should be used as the
          exact visible cover of the physical book.
        - The scenePrompt must place the book in a locale-appropriate real setting with plausible
          local props, surfaces, and background details.
        - The scenePrompt must ask for professional product photography, sharp focus on the book,
          shallow depth of field, realistic lighting, and soft bokeh.
        - All child scenes must be wholesome, fully clothed, supervised or clearly safe, and family-friendly.
        - Avoid copyrighted characters, brand logos, celebrity likenesses, and protected franchises.
        - Keep synopses to 2-4 sentences.
        - tags must be a comma-separated string with 4-7 compact tags.
        - style should be a compact existing-style-like token such as watercolor, colored_pencil,
          digital_art, sketch, cartoon, minimalist, anime, comic_book, hand_drawn, disney_style, or pixar.

        Schema for each item:
        {{
          "id": "lowercase-url-safe-slug",
          "title": "string",
          "synopses": "string",
          "locale": "locale code",
          "intent": "one allowed intent",
          "recipients": ["one or more allowed recipients"],
          "tags": "comma,separated,tags",
          "style": "style token",
          "coverPrompt": "en-US prompt",
          "scenePrompt": "en-US prompt",
          "creatorPersona": "short end-user-like creator description",
          "inspirationNotes": "short note explaining inspiration source or gap",
          "qualityNotes": "short note explaining why this helps the homepage gallery"
        }}

        Existing gallery and desired distribution:
        {context_text}

        Online inspiration:
        {inspiration_text}
        """
    ).strip()


def get_google_api_key() -> str | None:
    return os.environ.get("GOOGLE_GENAI_API_KEY") or os.environ.get("GEMINI_API_KEY")


def gemini_generate_json(prompt: str, model: str) -> Any:
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY to use Gemini suggestions")
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "Missing google-genai. Install scripts/sampleBookGenerator/requirements.txt"
        ) from exc

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    text = getattr(response, "text", "") or ""
    text = strip_json_fences(text)
    return json.loads(text)


def strip_json_fences(value: str) -> str:
    value = value.strip()
    if value.startswith("```"):
        value = re.sub(r"^```(?:json)?", "", value, flags=re.I).strip()
        value = re.sub(r"```$", "", value).strip()
    return value


def heuristic_suggestions(count: int, context: dict[str, Any]) -> list[dict[str, Any]]:
    existing_ids = {str(item) for item in context["existingIds"] if item}
    ideas = [
        {
            "intent": "kids_transitions",
            "locale": "pt-PT",
            "title": "O João e a Primeira Noite no Quarto Novo",
            "synopses": "Quando o João passa para o seu quarto novo, a casa parece maior e a noite mais silenciosa. Com a ajuda da irmã Inês, de uma luz em forma de estrela e de um mapa de coragem desenhado pela família, ele descobre que crescer também pode ser aconchegante.",
            "recipients": ["child", "parent", "family"],
            "tags": "sono,crescer,coragem,família,rotina",
            "style": "watercolor",
            "creatorPersona": "Uma mãe do Porto a preparar o filho para dormir sozinho.",
        },
        {
            "intent": "learning_and_discovery",
            "locale": "pt-PT",
            "title": "Madalena e o Relógio das Marés",
            "synopses": "A Madalena visita a praia de Matosinhos com o avô Rui e quer perceber porque é que o mar vai e volta. Entre poças de maré, conchas e um relógio desenhado na areia, descobre que a ciência pode começar com uma pergunta feita em família.",
            "recipients": ["child", "grandparent", "family"],
            "tags": "ciência,mar,avô,curiosidade,porto",
            "style": "colored_pencil",
            "creatorPersona": "Um avô curioso que quer oferecer uma memória educativa à neta.",
        },
        {
            "intent": "holidays_festivals",
            "locale": "pt-PT",
            "title": "A Luzinha de São João",
            "synopses": "Na noite de São João, a pequena Clara perde o seu balão luminoso entre as ruas do Porto. Enquanto a família segue as músicas, os manjericos e as luzes junto ao Douro, Clara aprende que as tradições brilham mais quando são partilhadas.",
            "recipients": ["child", "family"],
            "tags": "são-joão,porto,família,festa,luzes",
            "style": "digital_art",
            "creatorPersona": "Uma família portuense a celebrar uma tradição local.",
        },
        {
            "intent": "kids_adventures",
            "locale": "pt-PT",
            "title": "A Mochila Secreta da Serra da Estrela",
            "synopses": "A Lara vai passar o fim de semana à Serra da Estrela e leva uma mochila que parece normal. Mas quando o nevoeiro desce, a mochila começa a revelar pequenos objetos mágicos que ajudam a família a encontrar o caminho de volta ao abrigo.",
            "recipients": ["child", "family"],
            "tags": "aventura,serra,família,magia,coragem",
            "style": "comic_book",
            "creatorPersona": "Um pai a transformar uma escapadinha em aventura personalizada.",
        },
        {
            "intent": "kids_transitions",
            "locale": "en-US",
            "title": "Mia's First Day Map",
            "synopses": "Mia worries that her first day at a new school will feel like landing on another planet. Her dad helps her draw a tiny map of brave steps, and by lunchtime Mia discovers that one friendly question can turn a strange hallway into a place she knows.",
            "recipients": ["child", "parent"],
            "tags": "school,confidence,new-start,friendship",
            "style": "cartoon",
            "creatorPersona": "A parent making a gentle school-start gift.",
        },
        {
            "intent": "learning_and_discovery",
            "locale": "es-ES",
            "title": "Lucía y el Museo de las Preguntas",
            "synopses": "Lucía entra en el Museo de Ciencias de Valencia con una libreta llena de preguntas. Cada sala le regala una pista, y al final descubre que las mejores respuestas no cierran la curiosidad: la hacen crecer.",
            "recipients": ["child", "class", "family"],
            "tags": "ciencia,valencia,museo,curiosidad",
            "style": "minimalist",
            "creatorPersona": "Una profesora que quiere motivar a su clase.",
        },
        {
            "intent": "holidays_festivals",
            "locale": "fr-FR",
            "title": "Le Ruban du Marché de Noël",
            "synopses": "À Strasbourg, Noé aide sa tante à retrouver un ruban rouge perdu entre les lumières du marché de Noël. Le petit mystère devient une promenade tendre sur la patience, les odeurs d'hiver et les cadeaux faits avec le cœur.",
            "recipients": ["child", "family"],
            "tags": "noël,strasbourg,famille,hiver",
            "style": "hand_drawn",
            "creatorPersona": "Une tante qui veut garder un souvenir de Noël.",
        },
        {
            "intent": "remembrance",
            "locale": "de-DE",
            "title": "Opas Garten im Mai",
            "synopses": "Emil kehrt mit seiner Mutter in Opas kleinen Garten zurück, wo die Tomatenstäbe noch an der Wand lehnen. Zwischen Erde, Samen und alten Gartenschuhen merkt Emil, dass Erinnerungen weiterwachsen können, wenn man sich um sie kümmert.",
            "recipients": ["child", "parent", "grandparent"],
            "tags": "erinnerung,garten,familie,trost",
            "style": "watercolor",
            "creatorPersona": "Eine Mutter, die eine sanfte Erinnerungsgeschichte sucht.",
        },
        {
            "intent": "learning_and_discovery",
            "locale": "hi-IN",
            "title": "Aarav and the Monsoon Compass",
            "synopses": "Aarav watches the first monsoon clouds gather above Pune and asks why the wind suddenly smells like rain. With his grandmother's stories and a handmade paper compass, he learns how weather, memory and home can all point in the same direction.",
            "recipients": ["child", "grandparent", "family"],
            "tags": "monsoon,science,grandmother,pune,weather",
            "style": "digital_art",
            "creatorPersona": "A family in India turning monsoon questions into a keepsake.",
        },
        {
            "intent": "kids_transitions",
            "locale": "zh-CN",
            "title": "小雨的新姐姐任务",
            "synopses": "When baby Chen arrives home, Xiao Yu is proud, confused and a little jealous all at once. Her parents give her a special helper notebook, and she learns that becoming a big sister does not mean becoming less loved.",
            "recipients": ["child", "parent", "family"],
            "tags": "new-sibling,family,feelings,growing-up",
            "style": "colored_pencil",
            "creatorPersona": "A family preparing an older child for a new sibling.",
        },
    ]

    planned = context["suggestionPlan"]
    output: list[dict[str, Any]] = []
    for index in range(count):
        planned_item = planned[index]
        matching_ideas = [
            idea
            for idea in ideas
            if idea["intent"] == planned_item["intent"] and idea["locale"] == planned_item["locale"]
        ] or [idea for idea in ideas if idea["intent"] == planned_item["intent"]]
        base = copy.deepcopy(
            matching_ideas[index % len(matching_ideas)]
            if matching_ideas
            else ideas[index % len(ideas)]
        )
        if index >= len(ideas):
            base["title"] = f"{base['title']} {index + 1}"
        if planned_item["intent"] not in {idea["intent"] for idea in ideas}:
            base["intent"] = planned_item["intent"]
        if planned_item["locale"] in DEFAULT_RARE_LOCALES:
            base["locale"] = planned_item["locale"]

        book_id = unique_id(base["title"], existing_ids)
        title_for_prompt = base["title"].replace('"', "'")
        style = base["style"]
        base.update(
            {
                "id": book_id,
                "coverPrompt": (
                    f"A5 vertical book cover for a personalized children's story titled "
                    f"'{title_for_prompt}', generous top margin for title text, wholesome "
                    f"family-friendly atmosphere, safe fully clothed characters, expressive "
                    f"storybook composition, rendered in {style} style."
                ),
                "scenePrompt": (
                    f"Photorealistic lifestyle product photo of the physical personalized book "
                    f"'{title_for_prompt}', using the attached cover image as the exact visible "
                    f"book cover. Place the book in a real-life setting common for "
                    f"{locale_lifestyle_context(str(base['locale']))}, surrounded by "
                    f"story-appropriate props, tactile surfaces, realistic lighting, shallow depth "
                    f"of field, soft bokeh, and sharp focus on the book."
                ),
                "inspirationNotes": "Inspired by transition, growth, family keepsake, and learning themes from the configured sources.",
                "qualityNotes": "Adds underrepresented homepage coverage while keeping the story plausible as an end-user-created book.",
            }
        )
        output.append({field: base[field] for field in REVIEW_FIELDS})
    return output


def normalize_candidate(raw: dict[str, Any], existing_ids: set[str]) -> dict[str, Any]:
    candidate = {field: raw.get(field) for field in REVIEW_FIELDS}
    if not candidate.get("title"):
        raise ValueError("candidate missing title")
    if not candidate.get("id"):
        candidate["id"] = unique_id(str(candidate["title"]), existing_ids)
    else:
        candidate["id"] = unique_id(str(candidate["id"]), existing_ids)
    if isinstance(candidate.get("recipients"), str):
        candidate["recipients"] = [item.strip() for item in candidate["recipients"].split(",")]
    if candidate.get("coverPrompt") and not cover_prompt_is_flat(str(candidate["coverPrompt"])):
        candidate["coverPrompt"] = build_cover_art_prompt(candidate)
    if candidate.get("scenePrompt") and not scene_prompt_uses_cover_reference(
        str(candidate["scenePrompt"])
    ):
        candidate["scenePrompt"] = build_scene_reference_prompt(candidate)
    return candidate


def validate_candidates(candidates: list[dict[str, Any]]) -> list[str]:
    intents = set(load_story_intents())
    recipients = set(load_story_recipients())
    errors: list[str] = []
    seen: set[str] = set()
    for index, candidate in enumerate(candidates):
        label = str(candidate.get("id") or f"candidate {index + 1}")
        for field in REVIEW_FIELDS:
            if field not in candidate or candidate[field] in (None, "", []):
                errors.append(f"{label}: missing review field {field}")
        if candidate.get("id") in seen:
            errors.append(f"{label}: duplicate candidate id")
        seen.add(str(candidate.get("id")))
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", str(candidate.get("id", ""))):
            errors.append(f"{label}: id must be lowercase URL-safe slug")
        if candidate.get("intent") not in intents:
            errors.append(f"{label}: invalid intent {candidate.get('intent')}")
        invalid_recipients = [r for r in candidate.get("recipients", []) if r not in recipients]
        if invalid_recipients:
            errors.append(f"{label}: invalid recipients {', '.join(invalid_recipients)}")
        locale = str(candidate.get("locale", ""))
        if not locale_looks_valid(locale):
            errors.append(f"{label}: invalid locale-looking value {locale}")
        if len(split_tags(str(candidate.get("tags", "")))) < 3:
            errors.append(f"{label}: tags should contain at least 3 comma-separated tags")
    return errors


def create_batch(args: argparse.Namespace) -> Path:
    source_urls = args.source or DEFAULT_SOURCES
    existing_books = load_sample_books()
    inspiration = fetch_inspiration(source_urls)
    rare_locales = args.rare_locale or DEFAULT_RARE_LOCALES
    context = build_planning_context(args.count, existing_books, args.rare_every, rare_locales)

    provider = args.provider
    if provider == "auto":
        provider = "gemini" if get_google_api_key() else "heuristic"

    if provider == "gemini":
        prompt = build_gemini_suggestion_prompt(args.count, inspiration, context)
        raw_candidates = gemini_generate_json(prompt, args.text_model)
        if not isinstance(raw_candidates, list):
            raise RuntimeError("Gemini suggestion response must be a JSON array")
    else:
        raw_candidates = heuristic_suggestions(args.count, context)

    existing_ids = {str(book["id"]) for book in existing_books if "id" in book}
    candidates = [normalize_candidate(item, existing_ids) for item in raw_candidates]
    errors = validate_candidates(candidates)
    if errors:
        raise RuntimeError("Generated invalid candidates:\n" + "\n".join(f"- {e}" for e in errors))

    batch_id = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
    batch = {
        "schemaVersion": 1,
        "batchId": batch_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "review",
        "provider": provider,
        "sources": inspiration,
        "distributionContext": context,
        "items": candidates,
    }
    path = BATCHES_DIR / f"{batch_id}.json"
    write_json(path, batch)
    print(f"Created review batch: {path}")
    print(f"Items: {len(candidates)}")
    return path


def load_batch(path: Path) -> dict[str, Any]:
    batch = load_json(path)
    if not isinstance(batch, dict) or not isinstance(batch.get("items"), list):
        raise RuntimeError(f"{path} is not a valid sample-book batch")
    errors = validate_candidates(batch["items"])
    if errors:
        raise RuntimeError("Batch validation failed:\n" + "\n".join(f"- {e}" for e in errors))
    return batch


def gemini_generate_image(
    prompt: str,
    model: str,
    aspect_ratio: str,
    reference_images: list[tuple[bytes, str]] | None = None,
) -> bytes:
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY to generate images")
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "Missing google-genai. Install scripts/sampleBookGenerator/requirements.txt"
        ) from exc

    client = genai.Client(api_key=api_key)
    contents: list[Any] = []
    for image_bytes, mime_type in reference_images or []:
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
    contents.append(prompt)

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
        ),
    )

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            inline_data = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
            data = getattr(inline_data, "data", None) if inline_data else None
            if data:
                if isinstance(data, bytes):
                    return data
                if isinstance(data, str):
                    return base64.b64decode(data)
    raise RuntimeError("Gemini response did not contain image bytes")


def save_as_jpeg(image_bytes: bytes, path: Path) -> None:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Missing Pillow. Install scripts/sampleBookGenerator/requirements.txt") from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(image_bytes)) as image:
        image.convert("RGB").save(path, "JPEG", quality=92, optimize=True)


def save_cover_as_jpeg(image_bytes: bytes, path: Path, side_crop_percent: float) -> None:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Missing Pillow. Install scripts/sampleBookGenerator/requirements.txt") from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(image_bytes)) as image:
        cover = image.convert("RGB")
        width, height = cover.size
        side_crop = max(0, min(int(width * side_crop_percent), width // 5))
        if side_crop:
            cover = cover.crop((side_crop, 0, width - side_crop, height)).resize(
                (width, height),
                Image.Resampling.LANCZOS,
            )
        cover.save(path, "JPEG", quality=92, optimize=True)


def generate_images(args: argparse.Namespace) -> None:
    batch_path = Path(args.batch).resolve()
    batch = load_batch(batch_path)
    batch_image_dir = IMAGES_DIR / batch["batchId"]
    batch_image_dir.mkdir(parents=True, exist_ok=True)

    for item in batch["items"]:
        book_id = item["id"]
        cover_path = batch_image_dir / f"{book_id}.jpeg"
        scene_path = batch_image_dir / f"{book_id}_scene.jpeg"

        if cover_path.exists() and not args.force:
            print(f"Skipping existing cover: {cover_path}")
        else:
            print(f"Generating cover for {book_id}")
            cover_prompt = (
                item["coverPrompt"]
                if cover_prompt_is_flat(str(item["coverPrompt"]))
                else build_cover_art_prompt(item)
            )
            cover_bytes = gemini_generate_image(cover_prompt, args.image_model, args.cover_aspect)
            save_cover_as_jpeg(cover_bytes, cover_path, args.cover_side_crop_percent)

        if scene_path.exists() and not args.force:
            print(f"Skipping existing scene: {scene_path}")
        else:
            print(f"Generating scene for {book_id}")
            cover_reference = cover_path.read_bytes()
            scene_prompt = (
                item["scenePrompt"]
                if scene_prompt_uses_cover_reference(str(item["scenePrompt"]))
                else build_scene_reference_prompt(item)
            )
            scene_bytes = gemini_generate_image(
                scene_prompt,
                args.image_model,
                args.scene_aspect,
                reference_images=[(cover_reference, "image/jpeg")],
            )
            save_as_jpeg(scene_bytes, scene_path)

    batch["status"] = "images-generated"
    batch["imageDirectory"] = str(batch_image_dir.relative_to(ROOT)).replace("\\", "/")
    write_json(batch_path, batch)
    print(f"Generated images under: {batch_image_dir}")


def apply_batch(args: argparse.Namespace) -> None:
    batch_path = Path(args.batch).resolve()
    batch = load_batch(batch_path)
    image_dir = Path(batch.get("imageDirectory") or IMAGES_DIR / batch["batchId"])
    if not image_dir.is_absolute():
        image_dir = ROOT / image_dir

    current_books = load_sample_books()
    existing_ids = {str(book.get("id")) for book in current_books}
    new_homepage_items: list[dict[str, Any]] = []

    for item in batch["items"]:
        book_id = item["id"]
        if book_id in existing_ids:
            raise RuntimeError(f"{book_id}: already exists in {SAMPLE_BOOKS_JSON}")
        cover_src = image_dir / f"{book_id}.jpeg"
        scene_src = image_dir / f"{book_id}_scene.jpeg"
        if not cover_src.exists():
            raise RuntimeError(f"{book_id}: missing generated cover {cover_src}")
        if not scene_src.exists():
            raise RuntimeError(f"{book_id}: missing generated scene {scene_src}")
        new_homepage_items.append({field: item[field] for field in HOMEPAGE_FIELDS})

    if args.dry_run:
        print(f"Dry run: would append {len(new_homepage_items)} books and copy images from {image_dir}")
        return

    for item in new_homepage_items:
        book_id = item["id"]
        shutil.copy2(image_dir / f"{book_id}.jpeg", SAMPLE_BOOKS_DIR / f"{book_id}.jpeg")
        shutil.copy2(image_dir / f"{book_id}_scene.jpeg", SAMPLE_BOOKS_DIR / f"{book_id}_scene.jpeg")

    current_books.extend(new_homepage_items)
    write_json(SAMPLE_BOOKS_JSON, current_books)
    batch["status"] = "applied"
    batch["appliedAt"] = datetime.now(timezone.utc).isoformat()
    write_json(batch_path, batch)
    print(f"Applied {len(new_homepage_items)} sample books to {SAMPLE_BOOKS_JSON}")


def run_audit(_args: argparse.Namespace) -> None:
    print_audit(audit_samples())


def add_common_suggest_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--count", type=int, default=12, help="Number of sample books to propose")
    parser.add_argument(
        "--source",
        action="append",
        help="Inspiration URL. Can be provided more than once. Defaults to the Little Lanterns blog.",
    )
    parser.add_argument(
        "--provider",
        choices=["auto", "gemini", "heuristic"],
        default="auto",
        help="Suggestion provider. auto uses Gemini when a key is present, otherwise heuristic.",
    )
    parser.add_argument("--text-model", default=DEFAULT_TEXT_MODEL, help="Gemini text model")
    parser.add_argument(
        "--rare-every",
        type=int,
        default=0,
        help="Every Nth suggestion should use a rare locale. 0 disables forced rare locales.",
    )
    parser.add_argument(
        "--rare-locale",
        action="append",
        help="Rare locale option, e.g. hi-IN or zh-CN. Can be provided more than once.",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit = subparsers.add_parser("audit", help="Audit existing homepage sample books")
    audit.set_defaults(func=run_audit)

    suggest = subparsers.add_parser("suggest", help="Create a review batch of new sample books")
    add_common_suggest_args(suggest)
    suggest.set_defaults(func=create_batch)

    images = subparsers.add_parser("generate-images", help="Generate temporary images for a batch")
    images.add_argument("--batch", required=True, help="Path to generated batch JSON")
    images.add_argument("--image-model", default=DEFAULT_IMAGE_MODEL, help="Gemini image model")
    images.add_argument("--cover-aspect", default="4:5", help="Cover image aspect ratio")
    images.add_argument("--scene-aspect", default="3:4", help="Scene image aspect ratio")
    images.add_argument(
        "--cover-side-crop-percent",
        type=float,
        default=DEFAULT_COVER_SIDE_CROP_PERCENT,
        help="Crop this fraction from both generated cover side edges before saving to remove model-added gutter/margin artifacts.",
    )
    images.add_argument("--force", action="store_true", help="Regenerate existing temporary images")
    images.set_defaults(func=generate_images)

    apply = subparsers.add_parser("apply", help="Copy generated images and append SampleBooks.json")
    apply.add_argument("--batch", required=True, help="Path to generated batch JSON")
    apply.add_argument("--dry-run", action="store_true", help="Validate without modifying files")
    apply.set_defaults(func=apply_batch)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
        return 0
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
