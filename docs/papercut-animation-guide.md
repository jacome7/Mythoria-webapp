# Paper-Cut Hero — Adjust & Animate Guide

A practical, copy-paste guide for positioning and animating the home hero's
paper-cut layers. **You don't touch React to do this** — every element is a
plain data object in one file. Edit it, save, and the dev server hot-reloads.

- **Edit layers here:** `src/components/papercut/compositions/kidsFantasy.ts`
- **Field definitions (with comments):** `src/components/papercut/types.ts`
- **Renderer (rarely touched):** `src/components/papercut/PaperCutLayer.tsx`
- **Global parallax distance + CSS keyframes:** `PaperCutHero.tsx` / `src/app/globals.css`
- **Animation library:** [Motion](https://motion.dev) (Framer Motion), `motion/react`

> Run `npm run dev`, open the homepage, change a number, save → it updates live.

---

## 1. Anatomy of one layer

Each papercut is one object in the composition's `sky[]` or `scene[]` array:

```ts
{
  id: 'dragon',                          // unique name
  src: '/homepage/kids_fantasy/dragon.png',
  intrinsic: { w: 498, h: 668 },         // the PNG's real pixel size (keep accurate → no layout shift)
  z: 9,                                  // stacking order (see §3)
  anchor: 'bottom',                      // measure y from 'top' or 'bottom'
  base: { x: 64, y: 15, width: 36 },     // position + size, mobile-first (see §2)
  md:   { width: 30 },                   // overrides at ≥768px
  lg:   { x: 74, y: 11, width: 19 },     // overrides at ≥1024px
  shadow: 'mid',                         // paper depth: 'none' | 'sky' | 'mid' | 'front'
  anim: 'breathe',                       // idle loop (see §4a)
  animDurMs: 6500,
  enter: { fromOpacity: 0, fromY: 30, fromScale: 0.92, durationMs: 800, delayMs: 300 }, // §4b
  parallax: { speed: -18 },              // scroll motion (§5)
}
```

At render time a layer becomes up to three nested elements, each owning a
different transform so they never conflict:

```
positioner (place + center)  →  parallax wrapper (scroll)  →  enter wrapper (entrance)  →  <img> (idle loop)
```

You never write that markup — you just set the fields above.

---

## 2. Position & size (the static knobs)

All geometry is in **percentages of the band** the layer lives in (the sky band
or the scene stage), so it scales with the viewport.

| Field         | Meaning                                                                                                                                             | Range                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `base.x`      | Horizontal position of the layer's left edge, **% of band width** (0 = left, 100 = right).                                                          | can go negative / >100 to bleed off-edge |
| `base.y`      | Distance **from the anchored edge**, % of band height. With `anchor:'bottom'`, `y:0` sits on the floor; with `anchor:'top'`, `y:0` sits at the top. | usually 0–40                             |
| `base.width`  | Layer width, **% of band width**. Height follows the image's aspect ratio automatically.                                                            | e.g. 10–40                               |
| `base.center` | If `true`, `x` becomes the **horizontal center** of the layer (used for the girl).                                                                  | `true`/omit                              |
| `anchor`      | `'bottom'` for things standing on the ground, `'top'` for sky things.                                                                               | —                                        |

**Responsive:** add a `md` and/or `lg` object with only the fields that change
at ≥768px / ≥1024px. Anything you omit inherits from `base` (then `md`). Example:
a layer that's big on mobile and small on desktop → `base:{width:36}, lg:{width:19}`.

> Tip: nudge in steps of 1–2 (%) and watch the browser. To move something off the
> edge of the stage on purpose (e.g. rolling hills), use `x` < 0 or `width` > 100.

---

## 3. Depth (`z`), transparency (`opacity`), and shadow

- **`z`** — stacking order. Higher = in front. **Keep every value < 50** so the
  sticky site header always stays on top. The kids_fantasy order is
  back→front: hills (5–6) → scenery (7–12) → water (13–15) → girl (16) →
  front hill (17) → bushes (18) → feature card (30).
- **`opacity`** — base transparency, `0`–`1` (default `1`). Use for faint/ghosted
  layers. Enter/scroll fades multiply on top of this.
- **`shadow`** — the paper-cut drop shadow depth: `'none'`, `'sky'` (faint),
  `'mid'`, `'front'` (deepest). Farther layers = softer; foreground = deeper.
- **`hideBelow`** — `'sm'` or `'md'` to hide a layer on small screens and reduce
  clutter.

---

## 4. Time-based animation

### 4a. Idle loops (`anim`) — always running, subtle

Set `anim` plus optional `animDurMs` (loop length) and `animDelayMs` (offset so
neighbours don't move in sync).

| `anim`      | Motion                     | Good for               |
| ----------- | -------------------------- | ---------------------- |
| `'bob'`     | gentle up/down             | boats, floating things |
| `'balloon'` | drift + bob + tilt         | the hot-air balloon    |
| `'drift'`   | slow sideways              | clouds, waves          |
| `'sway'`    | small rotate from the base | trees, bushes, grass   |
| `'twinkle'` | opacity + scale pulse      | stars, moon, sparkles  |
| `'breathe'` | subtle scale from the base | creatures (the dragon) |
| `'none'`    | static                     | everything else        |

```ts
anim: 'sway', animDurMs: 7000, animDelayMs: 600,
```

Idle loops are pure CSS (`@keyframes pc-*` in `globals.css`). To add a new loop:
add a `@keyframes pc-myloop` + `.pc-anim-myloop .pc-img { animation: ... }` there
and add `'myloop'` to the `AnimName` union in `types.ts`.

### 4b. Entrance (`enter`) — plays once when the layer appears

The layer animates **from** the values you give **to** its resting state
(opaque, no offset, scale 1). Above-the-fold layers play on load; lower ones play
when scrolled into view. Combine fields freely.

| Field             | Effect                                                              | Default        |
| ----------------- | ------------------------------------------------------------------- | -------------- |
| `fromOpacity`     | fade-in start opacity                                               | `0`            |
| `fromX` / `fromY` | slide-in offset in **px** (`+y` = from below, `-y` = from above)    | `0`            |
| `fromScale`       | `<1` grows in, `>1` shrinks in                                      | `1`            |
| `fromRotate`      | start rotation in **deg**                                           | `0`            |
| `durationMs`      | length                                                              | `700`          |
| `delayMs`         | wait before starting — **stagger** layers with this                 | `0`            |
| `ease`            | `'easeOut'`, `'easeInOut'`, `'linear'`, or a bezier `[x1,y1,x2,y2]` | `'easeOut'`    |
| `repeat`          | replay every time it re-enters view                                 | `false` (once) |

```ts
// Fade + rise in, a beat after its neighbour:
enter: { fromOpacity: 0, fromY: 28, durationMs: 750, delayMs: 250 },

// "Pop" in with a soft overshoot:
enter: { fromOpacity: 0, fromScale: 0.8, ease: [0.16, 1, 0.3, 1], durationMs: 600 },
```

**Stagger** a back-to-front reveal by increasing `delayMs` per layer (kids_fantasy
goes sky → scenery → foreground, ~150 → 700ms).

---

## 5. Scroll-based animation (`parallax`)

As the page scrolls, layers translate (and optionally fade). Give **foreground
layers a bigger `speed`** and **background layers a smaller one** to create depth.

| Field     | Effect                                                                                                                    | Default |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| `speed`   | travel in **px** over the scroll. `-` = moves **up** (exits sooner, feels close); `+` = moves **down** (lags, feels far). | `0`     |
| `axis`    | `'y'` (default) or `'x'`                                                                                                  | `'y'`   |
| `fadeOut` | also fade the layer out as you scroll past                                                                                | `false` |
| `spring`  | smooth the motion with a spring (recommended)                                                                             | `true`  |

```ts
// Distant hill barely moves; foreground bush moves a lot:
parallax: { speed: -10 },      // background
parallax: { speed: -75 },      // foreground

// Sky element floats up and fades away:
parallax: { speed: -120, fadeOut: true },
```

**Global travel distance:** the parallax plays over the first `HERO_SCROLL_PX`
(default **800**) pixels of scrolling — change that constant at the top of
`PaperCutHero.tsx` to make the whole effect more gradual or snappier.

> Keep parallax **subtle**. Big speed differences look dramatic but can cause
> motion sickness (see §7). ±10–80px is a good range.

---

## 6. Cookbook (copy-paste)

```ts
// Quietly fade in:               enter: { fromOpacity: 0, durationMs: 600 }
// Rise + fade in:                enter: { fromOpacity: 0, fromY: 30 }
// Drift in from the left:        enter: { fromOpacity: 0, fromX: -40, durationMs: 800 }
// Grow in (zoom):                enter: { fromOpacity: 0, fromScale: 0.7 }
// Tilt + settle:                 enter: { fromOpacity: 0, fromRotate: -6, fromY: 20 }
// Staggered group:               give each layer delayMs: 100, 200, 300, …
// Depth parallax:                background speed: -10 … foreground speed: -70
// Float-up-and-vanish (sky):     parallax: { speed: -120, fadeOut: true }
// Continuous gentle life:        anim: 'sway' (trees) / 'breathe' (creatures) / 'drift' (clouds)
// Ghosted background layer:      opacity: 0.6
```

---

## 7. Tips & best practices (researched)

**Performance — animate only `transform` & `opacity`.** These run on the GPU
compositor thread and stay at 60fps even when JS is busy. Animating `width`,
`top`, `margin`, etc. forces layout recalculation and janks. Our enter/parallax
use only transform + opacity by design — keep it that way. `will-change` is set
sparingly (only on the looping images); don't sprinkle it everywhere or you can
exhaust GPU memory. ([web.dev](https://web.dev/articles/animations-and-performance), [Motion performance tier list](https://motion.dev/magazine/web-animation-performance-tier-list))

**Accessibility — respect reduced motion.** All enter/parallax/idle motion is
automatically disabled under `prefers-reduced-motion: reduce` (an accessibility
requirement — motion can make some users physically ill). Test it: Chrome
DevTools → Rendering → "Emulate prefers-reduced-motion". ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion))

**Parallax can cause motion sickness** for users with vestibular disorders —
keep speed differences gentle and the overall effect restrained. ([web.dev](https://web.dev/articles/animations-and-performance))

**Protect the LCP.** The girl photo is the Largest Contentful Paint element, so
it has `priority: true` and **no `enter`** (fading it in would delay LCP). Don't
add an entrance to the priority layer.

**Less is more / stagger.** A few well-timed moves read as "premium"; everything
moving at once reads as noise. Stagger entrances and vary durations. Use
spring/`easeOut` easing for natural motion (scroll parallax already springs).
([Motion scroll docs](https://motion.dev/docs/react-scroll-animations), [Motion parallax tutorial](https://motion.dev/tutorials/react-parallax))

**Use motion only where needed.** Layers with no `enter`/`parallax` render as a
plain image (no Motion wrapper, no cost). Only add animation that earns its keep.

**Test on mobile.** Heavy parallax + many layers can tax low-end phones; if it
feels heavy, reduce parallax `speed`, drop a few `enter`s, or `hideBelow:'sm'`
some decorations.

---

## 8. Full field reference

```ts
interface PaperCutLayerConfig {
  id: string;
  src: string; // /homepage/<composition>/<file>.png
  intrinsic: { w: number; h: number }; // real PNG pixel size
  altKey?: string; // i18n key; omit ⇒ decorative (alt="")
  z: number; // stacking, < 50
  anchor: 'top' | 'bottom';
  base: { x: number; y: number; width: number; center?: boolean }; // %, mobile-first
  md?: Partial<typeof base>; // ≥768px overrides
  lg?: Partial<typeof base>; // ≥1024px overrides
  shadow?: 'none' | 'sky' | 'mid' | 'front'; // default 'mid'
  opacity?: number; // 0–1, default 1

  // time-based idle loop
  anim?: 'none' | 'bob' | 'balloon' | 'drift' | 'sway' | 'twinkle' | 'breathe';
  animDelayMs?: number;
  animDurMs?: number;

  // one-shot entrance
  enter?: {
    fromOpacity?: number;
    fromX?: number;
    fromY?: number;
    fromScale?: number;
    fromRotate?: number;
    durationMs?: number;
    delayMs?: number;
    ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | [number, number, number, number];
    repeat?: boolean;
  };

  // scroll-linked parallax
  parallax?: { speed?: number; axis?: 'x' | 'y'; fadeOut?: boolean; spring?: boolean };

  hideBelow?: 'sm' | 'md';
  priority?: boolean; // exactly one per page (the LCP image)
  quality?: number; // must be in next.config images.qualities (default 75)
}
```

---

## 9. Adding a whole new themed scene

Animation lives in the per-layer config, so a new composition (e.g. a romance or
sci-fi scene) gets its own animations for free. See the
[Paper-Cut Design System](./papercut-design-system.md) §8 for the "author a new
composition" recipe (add PNGs → config file → one registry line).

## Sources

- [Motion — React scroll animations](https://motion.dev/docs/react-scroll-animations) · [Parallax tutorial](https://motion.dev/tutorials/react-parallax)
- [Motion — Web animation performance tier list](https://motion.dev/magazine/web-animation-performance-tier-list)
- [web.dev — Animations and performance](https://web.dev/articles/animations-and-performance)
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
