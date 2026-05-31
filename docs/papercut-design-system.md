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
- **Composition per intent.** The scene shown adapts to the visitor's intent
  (see the [intent feature](./features/homepage.md)). `kids_fantasy` is the
  launch composition and the default for everyone; more are added over time.

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

## 5. Layout

Two bands plus a card, assembled by `PaperCutHero`:

1. **Sky + text band** — full-bleed, cream background. Sky decorations are
   absolutely positioned behind the headline/subtitle/CTA, which sit in normal
   flow so the band **grows with translated copy** (handles long DE/FR strings).
2. **Scene stage** (`PaperCutStage`) — a `relative` band with a **locked,
   responsive `aspect-ratio`** (`stageAspect`), so its percentage-positioned
   layers stay pixel-stable. `overflow-hidden` lets hills/clouds bleed off-edge.
3. **Feature card** (`FeatureCard`) — contained, pulled up with a negative margin
   to overlap the bottom of the scene.

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

- One **`priority`** layer only — the LCP image (the character photo). Everything
  else loads normally.
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

## 8. Recipe: author a new composition

1. **Add art.** Drop transparent PNGs into
   `public/homepage/<composition-id>/`.
2. **Create the config** `src/components/papercut/compositions/<id>.ts`,
   exporting a `PaperCutComposition` (see `kidsFantasy.ts` as the reference):
   - `stageAspect` (base/md/lg),
   - `sky[]` and `scene[]` layers (`src`, `intrinsic`, `z`, `anchor`, `base`
     placement, optional `md`/`lg`, `shadow`, `anim`, `hideBelow`, one
     `priority` on the LCP photo),
   - `text` (i18n keys + `ctaPath`),
   - optional `features[]`.
3. **Register it** in `src/components/papercut/registry.ts` — map the relevant
   intent(s) (and/or `default`) to the new composition. One line.
4. **Add copy** keys under `HomePage` in `src/messages/en-US/HomePage.json`,
   then mirror to the other locales and run `npm run i18n:parity`.
5. **Tune live.** Run `npm run dev`, nudge the percentage positions and shadow
   tiers in the config until the diorama reads well at 375px / 768px / 1280px.

No changes to the renderer (`PaperCutHero` / `PaperCutLayer` / `PaperCutStage`)
are needed.

---

## File map

- Renderer & schema: `src/components/papercut/{types,PaperCutHero,PaperCutLayer,PaperCutStage,FeatureCard,registry,index}.ts(x)`
- Compositions: `src/components/papercut/compositions/*.ts`
- Styles & keyframes: `src/app/globals.css` (`.papercut-hero`, `.pc-*`, `@keyframes pc-*`)
- Font: `src/app/layout.tsx` (Fraunces → `--font-display`)
- Assets: `public/homepage/<composition-id>/*.png`
- Mount point: `src/app/[locale]/page.tsx`
