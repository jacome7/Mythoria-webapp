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
| `person1_de-DE.webp` | 572×1024, transparent, German cover |
| `person2_de-DE.webp` | 572×1024, transparent, German cover |
| `person3_fr-FR.webp` | 572×1024, transparent, French cover |
| `person3_de-DE.webp` | 572×1024, transparent, German cover |

## Intentional locale fallback

| Requested locale | Slot | Asset used |
| --- | --- | --- |
| `de-DE` | `person4` | `person4_en-US.webp` |

## Re-exports

| File | Issue |
| --- | --- |
| `person1_pt-PT.webp` | Legacy 461×717 cutout — re-export at 572×1024 with the same bottom anchor as the other person images. |
| `person3_pt-PT.webp` | Current 540×717 cutout — re-export at 572×1024 with the same bottom anchor as the other person images. |
| `person3_en-US.webp` | Current 539×717 file is a duplicate of the Spanish asset and has a Spanish cover — replace with an English-cover 572×1024 cutout, bottom-anchored like the other person images. |
| `person3_es-ES.webp` | Current 539×717 cutout — re-export at 572×1024 with the same bottom anchor as the other person images. |

## Design guidance

- Persons must read as **real photographic people holding a real book**, bottom-anchored, consistent scale across all `person{n}` files (the carousel crossfades them in place).
- Keep the papercut cardboard texture for everything that is not the person/book.
