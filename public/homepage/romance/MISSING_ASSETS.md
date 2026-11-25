# romance — Missing / draft assets

Canonical naming: `{slot}.webp`, `{slot}_{device}.webp`, `{slot}_{device}_{locale}.webp`, `person{n}_{locale}.webp`.
Locales: `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`. Devices: `laptop` (also used by tablet), `mobile`.
See `assets_metadata.json` for per-asset specs (dimensions, transparency, status).

## Shared sky artwork

The romance hero uses the shared neutral clouds and gold sparkles alongside its pink balloon and heart.

## Person images

`person1_{locale}.webp` is now available for all supported locales: `en-US`, `pt-PT`, `es-ES`, `fr-FR`, and `de-DE`.

| File | Spec |
| --- | --- |
| `person2_{locale}.webp` (optional) | A second couple/pose to enable carousel rotation (currently only one person slide exists, so the hero renders a static image). |

## Missing locale backgrounds

| File | Spec |
| --- | --- |
| `background_laptop_de-DE.webp` | 1920×1072 — German variant (de-DE currently falls back to en-US) |
| `background_mobile_de-DE.webp` | 1080×1072 — German variant |

## Design guidance

- Persons must read as **real photographic people holding a real book** (the mockup couple holds "MARTA & TIAGO"), bottom-anchored, consistent scale across `person{n}` files.
- Palette: wine `#7a2b3f`, dusty rose `#9c3d54`, blush `#e8b4b8`, warm lamplight accents — keep the cardboard papercut texture.
