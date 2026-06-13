# kids_fantasy — Missing / draft assets

Canonical naming: `{slot}.webp`, `{slot}_{device}.webp`, `{slot}_{device}_{locale}.webp`, `person{n}_{locale}.webp`.
Locales: `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`. Devices: `laptop` (also used by tablet), `mobile`.
See `assets_metadata.json` for per-asset specs (dimensions, transparency, status).

## Placeholders to replace with final art

| File | Target spec | Notes |
| --- | --- | --- |
| `background_laptop.webp` | 1920×1072, opaque scene | Currently a copy of the legacy 3840×2160 panorama. Re-crop/re-export for the new HeroScene (castle, hills, ship — leave the center free for the person). |
| `background_mobile.webp` | 1080×1072 | Same as above, portrait-friendly crop. |
| `foreground_laptop.webp` | 1920×~900, transparent top | Currently the legacy 1920×1080 foreground. Bottom hills/flowers strip only. |
| `foreground_mobile.webp` | ~1080 wide, transparent top | Mobile crop of the foreground strip. |

## Missing person images (carousel skips missing locales via fallback)

| File | Spec |
| --- | --- |
| `person1_en-US.webp` | 572×1024, transparent, real child holding a real Mythoria fantasy book, English cover |
| `person1_de-DE.webp` | 572×1024, transparent, German cover |
| `person2_de-DE.webp` | 572×1024, transparent, German cover |

## Re-exports

| File | Issue |
| --- | --- |
| `person1_pt-PT.webp` | Legacy 461×717 cutout — re-export at 572×1024 with the same bottom anchor as the other person images. |

## Design guidance

- Persons must read as **real photographic people holding a real book**, bottom-anchored, consistent scale across all `person{n}` files (the carousel crossfades them in place).
- Keep the papercut cardboard texture for everything that is not the person/book.
