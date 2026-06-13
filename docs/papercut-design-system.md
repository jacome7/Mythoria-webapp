# Paper-Cut Design System

The home experience uses a **whimsical layered paper-cut storytelling** look — a
warm cream "stage" populated by transparent paper-cut PNGs (with soft alpha
shadows) plus a real photo of a reader holding a finished book, evoking a
paper-cut theatre. This document is the source of truth for the palette,
typography, layering rules, animation, and **how to author a new composition**.

> Implementation lives in `src/components/papercut/`. The hero is mounted by
> `src/app/[locale]/page.tsx` and styled in `src/app/globals.css`.

---

## 1. Vision

- **Diorama, not a photo collage.** Each scene reads as stacked layers of cut
  paper: foreground, mid-ground, characters, and sky, each casting a soft shadow
  onto the layer behind it.
- **One layer = one HTML element.** Every paper-cut is its own positioned
  element so it can be animated independently.
- **One skeleton, many styles.** The hero renderer owns a single canonical
  layout; a "composition" is a style variant that fills the same named slots
  with its own artwork, palette and copy. The style shown adapts to the
  visitor's intent (see the [intent feature](./features/homepage.md)) —
  `kids_fantasy` is the default; `sports_teams` and `romance` are live variants.
- **A real person holding a real book, always.** The center of every style is a
  photographic person (or couple/animal) holding a physical Mythoria book — the
  "human feeling" anchor and the product shot. Everything around them is paper.

---

## 2. Palette

The global app theme is **DaisyUI "autumn"** (defined in `globals.css`). The
paper-cut hero **does not change the global theme**; it layers a few extra
tokens scoped to `.papercut-hero`:

| Token (`.papercut-hero`) | Value                        | Use                           |
| ------------------------ | ---------------------------- | ----------------------------- |
| `--pc-cream`             | `#f4ead6`                    | Stage paper background        |
| `--pc-cream-deep`        | `#efe1c6`                    | Background gradient base      |
| `--pc-navy`              | = `--color-primary` (autumn) | Headline, CTA, feature titles |
| `--pc-gold`              | = `--color-accent` (autumn)  | Moon / sparkle / icon warmth  |

The mockup's deep-navy headline/CTA and golden moon/sparkle already match the
autumn `primary` and `accent`, so we alias them rather than hard-code new
values. Foliage greens, dragon purple, and balloon warm tones live **inside the
PNG art**, not as CSS tokens.

**Rule:** never edit the `@plugin "daisyui/theme"` block to restyle the hero —
add a hero-scoped token instead.

---

## 3. Typography

- **Display serif:** [Fraunces](https://fonts.google.com/specimen/Fraunces),
  loaded via `next/font/google` in `src/app/layout.tsx` and exposed as the
  `--font-display` CSS variable. Applied **only** through the `.font-display`
  utility (headline + feature titles). Header and body text stay **Arial**
  (system stack) — the header is intentionally untouched.
- **Headline scale:** `text-3xl` → `sm:text-4xl` → `md:text-5xl`, `font-bold`,
  color `var(--pc-navy)`.
- **Body / subtitle:** Arial, `text-base`/`sm:text-lg`, `text-base-content/80`.

To use the serif anywhere new: add the `font-display` class (do not change the
global body font).

---

## 4. Paper-cut rules

- **Assets:** tightly-cropped transparent PNGs under
  `public/homepage/<composition>/`. Served through `next/image` (auto WebP/AVIF +
  resize). Keep source PNGs reasonably sized; never ship the giant "elements
  overview" sheet.
- **Shadows use `filter: drop-shadow()`** (not `box-shadow`) so the shadow
  follows the PNG's alpha contour. Three depth tiers (set via `shadow` in the
  layer config):

  | Tier       | Class             | Approx. value                                |
  | ---------- | ----------------- | -------------------------------------------- |
  | Sky        | `pc-shadow-sky`   | `drop-shadow(0 2px 3px rgba(60,40,20,.12))`  |
  | Mid-ground | `pc-shadow-mid`   | `drop-shadow(0 5px 6px rgba(60,40,20,.18))`  |
  | Foreground | `pc-shadow-front` | `drop-shadow(0 10px 9px rgba(40,28,12,.24))` |

  Shallower/softer for distant sky elements, deeper for foreground.

- **Z-index discipline:** keep every hero layer **below 50**. The sticky header
  (`bg-base-100/60 backdrop-blur-xl`, `z-50`) must always paint on top. Order
  within a scene runs roughly: back hills (5–6) → mid-ground scenery (7–12) →
  water (13–15) → character photo (16) → front hill (17) → bushes (18) →
  feature card (30).

---

## 5. Layout — the shared hero skeleton

Two bands plus a card, assembled by `PaperCutHero` (the renderer owns all
placements; compositions only tune them):

1. **Sky + text band** — full-bleed, cream background. Five fixed decor slots
   are absolutely positioned behind the headline/subtitle/CTA: `cloud_left`
   behind with `sky_left` in front slightly below (top-left), the mirrored
   `cloud_right`/`sky_right` pair (top-right), and `sparkles` centered above
   the title. Text sits in normal flow so the band **grows with translated
   copy** (handles long DE/FR strings). The CTA uses `.pc-cta`, themed per
   style via `--pc-cta-bg` / `--pc-cta-fg`.
2. **Scene stage** (`PaperCutStage` + `.pc-scene`) — a `relative` band with a
   locked responsive `aspect-ratio` (1080×1072 art on mobile, 1920×1072 from
   `md` up) and `overflow: clip`, containing a three-layer sandwich:
   - **back (z1):** `background_{laptop|mobile}[_{locale}].webp` via
     `ArtDirectedImage` — `<picture>` + `getImageProps`, so only the matching
     device file downloads; locale variants resolve at build time.
   - **middle (z5):** `PersonCarousel` — the rotating
     `person{n}_{locale}.webp` slides (real person holding a real book),
     bottom-anchored and horizontally centered. Each slide eases in from the
     right, holds ~4s, eases out to the left.
   - **front (z10):** `foreground_{laptop|mobile}[_{locale}].webp`, hugging the
     stage bottom, `pointer-events: none`.
3. **Feature card** (`FeatureCard`) — contained, pulled up with a negative margin
   to overlap the bottom of the scene; icons are the style's `icon1..3` slots.

### Style folders — the drop-in contract

Every style folder `public/homepage/<styleId>/` fills the **same slot grammar**
with lowercase canonical filenames:

```
{slot}.webp                       sky_left, cloud_left, sparkles, icon1..3, ...
{slot}_{device}.webp              background_laptop, foreground_mobile, ...
{slot}_{device}_{locale}.webp     background_mobile_pt-PT, ...
person{n}_{locale}.webp           person1_pt-PT, person2_en-US, ...
```

Same names across folders ⇒ swap the folder = swap the style. Each folder
carries an `assets_metadata.json` (schema v2: per-entry `slot`, `device?`,
`locale?`, `dimensions`, `status: final|draft|placeholder|missing`) and a
`MISSING_ASSETS.md` for designers. `npm run homepage:assets` validates
metadata ↔ filesystem in CI.

### Locale fallback (no runtime probing)

`src/components/papercut/heroManifest.ts` imports the metadata JSONs at build
time and resolves every slot through a deterministic chain:

```
exact locale → en-US → unsuffixed default → first available
```

so a missing `foreground_laptop_de-DE.webp` silently serves
`foreground_laptop.webp` — never a 404. `resolvePersons` builds the carousel
list the same way (person slots that only exist in one locale fall back rather
than disappear).

The hero is rendered **full-bleed**, before the page's `container mx-auto px-4`,
so the cream background and hills span edge-to-edge while text/card stay within a
readable max-width.

### Responsive positioning (no JS)

Each layer's geometry is expressed in **percentages** and emitted as inline CSS
custom properties (`--pc-x/-y/-w`, plus optional `--pc-md-*` / `--pc-lg-*`). A
single cascade in `globals.css` selects the right value per breakpoint via
fallback chaining (`var(--pc-lg-x, var(--pc-md-x, var(--pc-x)))`). This is
SSR-stable and flicker-free — no breakpoint hook. Edit a position by changing a
number in the composition config.

---

## 6. Animation

Three complementary layers of motion — all auto-disabled under
`@media (prefers-reduced-motion: reduce)`:

1. **Idle loops** — continuous ambient CSS `@keyframes pc-*` on the inner image
   (so they never clobber a wrapper's transform); per-instance timing via
   `--pc-delay` / `--pc-dur`. See the table below.
2. **Entrance** (`enter`) — one-shot fade / slide / scale-in via
   [Motion](https://motion.dev) (`motion/react`), played as a layer scrolls into
   view (staggered for a pop-up-book reveal). The LCP photo is excluded so it
   paints instantly.
3. **Scroll parallax** (`parallax`) — Motion translates/fades layers as the page
   scrolls; foreground travels more than background for depth.

Entrance + parallax animate `transform`/`opacity` only (compositor-thread →
60fps). **Full tuning + animation how-to: the
[Adjust & Animate Guide](./papercut-animation-guide.md).**

| `anim`    | Motion                 | Typical layer      |
| --------- | ---------------------- | ------------------ |
| `balloon` | drift + bob + tilt     | hot-air balloon    |
| `bob`     | gentle vertical        | boat               |
| `drift`   | slow horizontal        | clouds, waves      |
| `sway`    | small rotate from base | trees, bushes      |
| `twinkle` | opacity + scale pulse  | moon, stars        |
| `breathe` | subtle scale from base | dragon / creatures |

All animations are disabled under `@media (prefers-reduced-motion: reduce)`. Keep
motion small and slow (5–15s loops); this is ambient, not attention-grabbing.
Keyframes live in `globals.css` alongside the existing `fade-in`.

---

## 7. Performance

- **`priority` only on the LCP candidates** — the scene background
  (`ArtDirectedImage priority`) and the first person slide (server-rendered with
  no enter animation via `AnimatePresence initial={false}`). Everything else
  loads normally; only one of `background_mobile`/`background_laptop` downloads
  thanks to `<picture>` art direction.
- Always provide intrinsic `width`/`height` (the config's `intrinsic`) so
  `next/image` reserves space → near-zero CLS, reinforced by the stage's
  `aspect-ratio`.
- Per-layer `sizes` is derived from the layer width (≈ vw) so the optimizer picks
  a sensible resolution.
- **Image `quality` defaults to `75`** — the value allowed by `images.qualities`
  in `next.config.ts` (Next 16's default). If you set a layer `quality` to a
  different value, add it to `images.qualities` too, or Next will warn (and fail
  `next build`).
- Copy only the PNGs a composition uses into its public folder.

---

## 8. Recipe: author a new style

1. **Add art.** Drop slot-named transparent assets into
   `public/homepage/<styleId>/` following the drop-in contract (section 5):
   `cloud_left`, `cloud_right`, `sky_left`, `sky_right`, `sparkles`,
   `background_{laptop,mobile}[_{locale}]`, `foreground_{laptop,mobile}[_{locale}]`,
   `person{n}_{locale}` and `icon1..3`. Copy
   `public/homepage/romance/assets_metadata.json` as a starting template and
   document every asset (`status: "placeholder"` until the real art lands);
   list outstanding work in `MISSING_ASSETS.md`. Run `npm run homepage:assets`.

2. **Add the style id** to `HeroStyleId` and the `MANIFEST` map in
   `src/components/papercut/heroManifest.ts` (one import + one entry).

3. **Create the theme** `src/components/papercut/compositions/<id>/theme.module.css` —
   declare palette overrides on `.root` (`--pc-navy`, `--pc-gold`, `--pc-cta-bg`,
   `--pc-cta-fg`, optionally `--pc-cream`/`--pc-cream-deep` for a tinted sky).

4. **Create the config** `src/components/papercut/compositions/<id>/index.ts`,
   exporting a ~25-line `HeroComposition` (see `romance/index.ts` as the
   reference): `id`, `rootClassName` (anims + theme), `textNamespace:
'intents.<id>.hero'`, optional `decor` tuning (per-slot `anim`, timing,
   placement nudges), optional `person` band geometry, `ctaPath`.

5. **Register it** in `src/components/papercut/registry.ts` — map the relevant
   intent(s) (and/or `default`) to the new composition. One line.

6. **Add copy** keys under `intents.<id>.hero` in `src/messages/en-US/HomePage.json`
   (`headline`, `subtitle`, `subtitleEmphasized`, `cta`, `alt.person`,
   `features.feature{1..3}.{title,desc}`), mirror to the other locales, run
   `npm run i18n:keys` and `npm run i18n:parity`.

7. **Tune live.** Run `npm run dev` and check `/?intent=<intent>` at
   375px / 768px / 1280px. Nudge `decor`/`person` values until it reads well.

The renderer (`PaperCutHero` / `PaperCutLayer` / `PersonCarousel` /
`ArtDirectedImage`) needs no changes.

---

## File map

- Renderer & schema: `src/components/papercut/{types,PaperCutHero,PaperCutLayer,PaperCutStage,PersonCarousel,ArtDirectedImage,FeatureCard,registry,index}.ts(x)`
- Asset manifest/resolver: `src/components/papercut/heroManifest.ts` (`resolveAsset`, `resolvePersons`)
- Compositions: `src/components/papercut/compositions/<id>/index.ts` + `theme.module.css`
- Shared keyframes: `src/components/papercut/compositions/shared/animations.module.css`
- Styles: `src/app/globals.css` (`.papercut-hero`, `.pc-*`, `.pc-scene`, `.pc-cta`, shadow utilities)
- Font: `src/app/layout.tsx` (Fraunces → `--font-display`)
- Assets: `public/homepage/<styleId>/` (slot-named; `assets_metadata.json` + `MISSING_ASSETS.md` in each folder)
- Asset validation: `scripts/check-homepage-assets.ts` (`npm run homepage:assets`)
- Section asset helper: `src/constants/homepageAssets.ts` (`HOMEPAGE_ASSET_BASE`, `homepageAsset()` — sections below the hero, always kids_fantasy chrome)
- Intent override: `src/hooks/useIntentOverride.ts` (`?intent=` query param, reads `window.location.search` in `useEffect`)
- Mount point: `src/app/[locale]/page.tsx`
