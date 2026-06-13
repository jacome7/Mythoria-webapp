# sports_teams — Missing / draft assets

Canonical naming: `{slot}.webp`, `{slot}_{device}.webp`, `{slot}_{device}_{locale}.webp`, `person{n}_{locale}.webp`.
Locales: `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`. Devices: `laptop` (also used by tablet), `mobile`.
See `assets_metadata.json` for per-asset specs (dimensions, transparency, status).

## Missing assets

| File | Spec |
| --- | --- |
| `foreground_laptop.webp` | 1920×1072, transparent top ~70% — a **low** pitch-edge grass strip with sports balls. The previous export was full-height bushes and covered the person, so it was removed; the hero currently renders this style without a foreground (which works — the props are in the background). |
| `foreground_mobile.webp` | 1080×1072, same as above, mobile crop. |

## Placeholders to replace with final art

| File | Target spec | Notes |
| --- | --- | --- |
| `cloud_left.webp` | ~460×350, transparent | Copy of kids_fantasy cloud — optionally tint cooler/sportier. |
| `cloud_right.webp` | ~489×317, transparent | Copy of kids_fantasy cloud. |
| `sparkles.webp` | ~328×318, transparent | Copy of kids_fantasy sparkles — final art could add a small football accent. |

## Drafts to refine

| File | Issue |
| --- | --- |
| `sky_left.webp` (pennant), `sky_right.webp` (trophy) | gpt-image-2 drafts — refine to match the papercut texture of the rest of the scene. |
| `person1_{locale}.webp` (all 5) | All five files are currently the SAME image — each needs a localized book cover (the pt-PT mockup shows "A Nossa Equipa"). |
| `person2_{locale}.webp` (all 5) | Currently identical to person1 — needs a distinct second person (e.g. girl player, or coach with the team book). |

## Design guidance

- Persons must read as **real photographic people holding a real book**, bottom-anchored, 572×1024, consistent scale across all `person{n}` files.
- Background/foreground are final (1920×1072 laptop, 1080×1072 mobile) — use them as the reference for horizon line and palette.
