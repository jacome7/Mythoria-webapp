import type { CSSProperties } from 'react';
import type { StoryIntent } from '@/constants/intents';
import type { HeroStyleId } from './heroManifest';

/**
 * Paper-cut storytelling hero — data model.
 *
 * A "composition" is a themed style variant of ONE shared hero skeleton
 * (e.g. kids_fantasy, sports_teams, romance). The renderer (`PaperCutHero`)
 * owns the canonical layout — cloud/sky decor pairs, sparkles, title block,
 * background → person carousel → foreground scene sandwich, feature card —
 * and a composition only supplies the style id (== its asset folder under
 * public/homepage/), the theme CSS, the translation namespace and small
 * per-slot animation/placement tuning. Assets resolve by slot name through
 * `heroManifest.ts`, so a new style is: asset folder + metadata + a ~25-line
 * composition + one registry entry.
 *
 * See docs/papercut-design-system.md for authoring guidance and conventions.
 */

export type Anchor = 'top' | 'bottom';

/** Drop-shadow depth tier. Sky elements sit shallow, foreground sits deep. */
export type ShadowTier = 'none' | 'sky' | 'mid' | 'front';

/** Idle animation applied to a layer's image (disabled under reduced-motion). */
export type AnimName =
  | 'none'
  | 'bob'
  | 'balloon'
  | 'drift'
  | 'sway'
  | 'twinkle'
  | 'breathe'
  | 'arc';

/**
 * Easing for the enter animation. A named curve, or a cubic-bezier array
 * [x1, y1, x2, y2] (e.g. [0.16, 1, 0.3, 1] for a soft "back-out").
 */
export type Easing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | [number, number, number, number];

/**
 * One-shot ENTER animation — played the first time the layer scrolls into view
 * (above-the-fold layers play on load). The values below are the state to
 * animate FROM; every layer settles to its resting state (opacity 1, no offset,
 * scale 1, rotate 0). Only transform + opacity are animated (compositor-thread
 * → 60fps). Automatically skipped on the `priority` layer (to protect LCP) and
 * under `prefers-reduced-motion`.
 */
export interface EnterAnimation {
  /** Start opacity for a fade-in. Default 0 (set 1 to keep it fully visible). */
  fromOpacity?: number;
  /** Start X offset in px (slide in horizontally). Default 0. */
  fromX?: number;
  /** Start Y offset in px (slide in vertically; + = from below, - = from above). Default 0. */
  fromY?: number;
  /** Start scale (grow-in with <1, shrink-in with >1). Default 1. */
  fromScale?: number;
  /** Start rotation in degrees. Default 0. */
  fromRotate?: number;
  /** Animation length in ms. Default 700. */
  durationMs?: number;
  /** Delay before starting, in ms — stagger layers by increasing this. Default 0. */
  delayMs?: number;
  /** Easing curve. Default 'easeOut'. */
  ease?: Easing;
  /** Replay every time the layer re-enters view? Default false (play once). */
  repeat?: boolean;
}

/**
 * SCROLL-LINKED parallax. As the hero scrolls past, the layer translates (and
 * optionally fades), driven by the hero's scroll progress (0 = hero pinned at
 * top, 1 = hero fully scrolled away). Give foreground layers a larger `speed`
 * and background layers a smaller one to create depth. Keep it subtle
 * (≈ 20–80px) — strong parallax can trigger motion sickness. Disabled under
 * `prefers-reduced-motion`.
 */
export interface ParallaxConfig {
  /**
   * Travel distance in px over the hero's scroll. Positive moves the layer DOWN
   * (lags behind, feels far away); negative moves it UP (exits sooner, feels
   * close). Default 0 (no movement).
   */
  speed?: number;
  /** Axis to translate along. Default 'y'. */
  axis?: 'x' | 'y';
  /** Also fade the layer out as the hero scrolls away. Default false. */
  fadeOut?: boolean;
  /** Smooth the motion with a spring (recommended for parallax). Default true. */
  spring?: boolean;
}

/** A layer's geometry within its band. All values are percentages. */
export interface Placement {
  /** Left position of the layer's anchor point, % of the band width. */
  x: number;
  /** Offset from the anchored edge (top or bottom), % of the band height. */
  y: number;
  /** Layer width, % of the band width (height follows the intrinsic ratio). */
  width: number;
  /** Apply translateX(-50%) so `x` becomes the horizontal center. */
  center?: boolean;
}

/** One transparent-PNG layer rendered on its own element. */
export interface PaperCutLayerConfig {
  id: string;
  /** Public path, e.g. /homepage/kids_fantasy/sky_left.webp */
  src: string;
  /** Intrinsic pixel size — lets next/image reserve the aspect ratio (no CLS). */
  intrinsic: { w: number; h: number };
  /** i18n key for alt text. Omit for decorative scenery (renders alt=""). */
  altKey?: string;
  /** Stacking order within the hero. Keep < 50 so the sticky header wins. */
  z: number;
  anchor: Anchor;
  base: Placement;
  /** >= 768px overrides (only the provided fields change). */
  md?: Partial<Placement>;
  /** >= 1024px overrides (only the provided fields change). */
  lg?: Partial<Placement>;
  /** Default 'mid'. */
  shadow?: ShadowTier;
  /** Default 'none'. */
  anim?: AnimName;
  animDelayMs?: number;
  animDurMs?: number;
  /** Hide the layer below a breakpoint to declutter small screens. */
  hideBelow?: 'sm' | 'md';
  /** Set true on exactly one layer per page (the LCP image). */
  priority?: boolean;
  quality?: number;
  /** Base opacity / transparency, 0–1. Default 1 (fully opaque). */
  opacity?: number;
  /** One-shot entrance animation (fade / slide / scale-in). */
  enter?: EnterAnimation;
  /** Scroll-linked parallax (translate / fade as the hero scrolls). */
  parallax?: ParallaxConfig;
}

/** One column of the bottom feature card. */
export interface FeatureItem {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
}

/** Responsive aspect ratios for the scene stage (CSS `aspect-ratio` values). */
export interface StageAspect {
  base: string;
  md: string;
  lg: string;
}

/** The five fixed sky-band decoration slots of the hero skeleton. */
export type DecorSlot = 'cloud_left' | 'sky_left' | 'cloud_right' | 'sky_right' | 'sparkles';

/**
 * Per-style tuning for one decor slot. The renderer's template provides the
 * canonical placement/animation; a composition only overrides what differs
 * (e.g. a pennant sways while a balloon floats). Placement overrides are
 * nudges merged field-by-field onto the template.
 */
export interface DecorTuning {
  anim?: AnimName;
  animDurMs?: number;
  animDelayMs?: number;
  base?: Partial<Placement>;
  md?: Partial<Placement>;
  lg?: Partial<Placement>;
}

/** Width/offset tuning for the centered person carousel band (% of stage). */
export interface PersonPlacement {
  /** Band width, % of stage width. Defaults: base 54, md 34, lg 26. */
  width?: { base?: number; md?: number; lg?: number };
  /** Offset from the stage bottom, % of stage height. Defaults: base 8, md 7, lg 6. */
  bottom?: { base?: number; md?: number; lg?: number };
}

/**
 * One themed style variant of the shared hero skeleton. `id` doubles as the
 * asset folder name (public/homepage/<id>/) and the manifest style id.
 */
export interface HeroComposition {
  id: HeroStyleId;
  /** Composition-owned CSS classes: shared animations root + theme palette. */
  rootClassName: string;
  /**
   * next-intl namespace (under HomePage) for this style's copy,
   * e.g. 'intents.kids_fantasy.hero'. Expected keys: headline, subtitle,
   * subtitleEmphasized, cta, alt.person, features.feature{1..3}.{title,desc}.
   */
  textNamespace: `intents.${string}.hero`;
  /** Per-slot overrides of the renderer's decor template. */
  decor?: Partial<Record<DecorSlot, DecorTuning>>;
  /** Person carousel band geometry overrides. */
  person?: PersonPlacement;
  /** How long each person stays centered before rotating, ms. Default 4000. */
  personHoldMs?: number;
  /** Canonical story intent carried into the creation journey. */
  storyIntent: StoryIntent;
}

/** Minimal translator shape — assignable from next-intl's `useTranslations`. */
export type Translator = (key: string) => string;

/** CSSProperties extended to allow inline CSS custom properties (--pc-*). */
export type StyleVars = CSSProperties & Record<`--${string}`, string | number>;
