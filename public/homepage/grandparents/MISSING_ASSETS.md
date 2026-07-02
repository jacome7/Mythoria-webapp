# grandparents — Missing / draft assets

Canonical naming: `{slot}.webp`, `{slot}_{device}.webp`, `{slot}_{device}_{locale}.webp`, `person{n}_{locale}.webp`.
Locales: `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`. Devices: `laptop` (also used by tablet), `mobile`.
See `assets_metadata.json` for per-asset specs (dimensions, transparency, status).

## Required runtime assets

No required runtime assets are currently missing. The `grandparents` hero has:

- sky decor: `cloud_left`, `cloud_right`, `sky_left`, `sky_right`, `sparkles`
- scene art: `background_{laptop,mobile}` with all five supported locale suffixes
- foreground art: `foreground_{laptop,mobile}`
- person art: `person1_{locale}` for all five supported locales
- feature icons: `icon1`, `icon2`, `icon3`

The background locale variants are intentionally identical today because the artwork contains no embedded text.

## Optional future improvements

| Asset | Target spec | Notes |
| --- | --- | --- |
| `person2_{locale}.webp` | Transparent WebP, same family-story scale and bottom anchor as `person1_{locale}.webp` | Optional second grandparent/grandchild pose if the hero should rotate instead of rendering one static family image. |
| warmer `foreground_{device}.webp` variants | Transparent WebP matching current dimensions | Optional if the scene should match the red/plum foliage in `homepage_mobile_mockup.png` more closely. Current green/blue foliage is final and usable. |

## Design guidance

- Persons must read as real photographic grandparents and a grandchild holding a real Mythoria book.
- Keep the visual focus on intergenerational warmth: family memories, recipes, places, sayings, photos, shared reading, audio, and printed keepsakes.
- Palette: heritage plum `#552235`, rose CTA `#a33152`, warm gold `#d99a2b`, cream paper sky `#f8ead7` / `#efd6b8`.
