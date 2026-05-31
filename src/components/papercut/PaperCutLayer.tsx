'use client';

import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import type { PaperCutLayerConfig, StyleVars } from './types';

/**
 * Approximate `sizes` for the optimizer. The stage spans ~100vw, so a layer's
 * width-% is close to its rendered vw at each breakpoint.
 */
function buildSizes(layer: PaperCutLayerConfig): string {
  const b = layer.base.width;
  const m = layer.md?.width ?? b;
  const l = layer.lg?.width ?? m;
  return `(min-width: 1024px) ${l}vw, (min-width: 768px) ${m}vw, ${b}vw`;
}

interface PaperCutLayerProps {
  layer: PaperCutLayerConfig;
  /** Resolved alt text ('' for decorative scenery). */
  alt: string;
  /**
   * The hero's scroll progress (0 = pinned at top → 1 = fully scrolled away),
   * supplied by `PaperCutHero`. Used to drive scroll-linked parallax.
   */
  scrollYProgress?: MotionValue<number>;
}

/**
 * Renders ONE paper-cut layer. Up to three nested elements, each owning a
 * different transform so they never fight each other:
 *
 *   <div .pc-layer>            ← POSITIONER: place + center (left/bottom/width
 *                                via the CSS-var cascade in globals.css; the
 *                                drop-shadow + idle-animation classes also live
 *                                here and target the inner image)
 *     <motion.div>             ← PARALLAX:  scroll-linked translate / fade
 *       <motion.div>           ← ENTER:     one-shot fade / slide / scale-in
 *         <Image .pc-img>      ← IMAGE:     base opacity + CSS idle loop
 *
 * The parallax / enter wrappers are only rendered when configured (and motion
 * is allowed), so a static layer stays a single positioned <img>. Animation
 * uses transform + opacity only (compositor-thread → 60fps).
 *
 * Accessibility: under `prefers-reduced-motion` both wrappers are skipped (the
 * CSS idle loop is also disabled in globals.css), so the scene renders fully
 * static. The `priority` image (LCP) never gets the enter fade so it paints
 * immediately.
 */
export default function PaperCutLayer({ layer, alt, scrollYProgress }: PaperCutLayerProps) {
  const { base, md, lg } = layer;
  const prefersReduced = useReducedMotion();
  const allowMotion = !prefersReduced;

  // --- Scroll-linked parallax MotionValues -----------------------------------
  // Hooks must run unconditionally, so we always create these; they are only
  // attached to the DOM when `parallax` is configured below.
  const fallbackProgress = useMotionValue(0);
  const progress = scrollYProgress ?? fallbackProgress;
  const travel = layer.parallax?.speed ?? 0;
  const rawShift = useTransform(progress, [0, 1], [0, travel]);
  const smoothShift = useSpring(rawShift, { stiffness: 120, damping: 30, mass: 0.4 });
  const scrollFade = useTransform(progress, [0, 1], [1, 0]);

  // --- Positioner geometry (CSS-variable cascade; see globals.css) ------------
  const style: StyleVars = {
    zIndex: layer.z,
    '--pc-x': `${base.x}%`,
    '--pc-y': `${base.y}%`,
    '--pc-w': `${base.width}%`,
  };
  if (md) {
    style['--pc-md-x'] = `${md.x ?? base.x}%`;
    style['--pc-md-y'] = `${md.y ?? base.y}%`;
    style['--pc-md-w'] = `${md.width ?? base.width}%`;
  }
  if (lg) {
    style['--pc-lg-x'] = `${lg.x ?? md?.x ?? base.x}%`;
    style['--pc-lg-y'] = `${lg.y ?? md?.y ?? base.y}%`;
    style['--pc-lg-w'] = `${lg.width ?? md?.width ?? base.width}%`;
  }
  if (layer.animDelayMs != null) style['--pc-delay'] = `${layer.animDelayMs}ms`;
  if (layer.animDurMs != null) style['--pc-dur'] = `${layer.animDurMs}ms`;

  const hideClass =
    layer.hideBelow === 'sm' ? 'pc-hide-sm' : layer.hideBelow === 'md' ? 'pc-hide-md' : '';

  const className = [
    'pc-layer',
    `pc-anchor-${layer.anchor}`,
    base.center ? 'pc-center' : '',
    `pc-shadow-${layer.shadow ?? 'mid'}`,
    `pc-anim-${layer.anim ?? 'none'}`,
    hideClass,
  ]
    .filter(Boolean)
    .join(' ');

  // --- The image. Base transparency lives here so the enter / scroll opacity on
  //     the wrappers multiplies cleanly on top of it. ---------------------------
  const imgStyle: CSSProperties | undefined =
    layer.opacity != null ? { opacity: layer.opacity } : undefined;

  let content: ReactNode = (
    <Image
      src={layer.src}
      alt={alt}
      width={layer.intrinsic.w}
      height={layer.intrinsic.h}
      className="pc-img"
      style={imgStyle}
      sizes={buildSizes(layer)}
      priority={layer.priority ?? false}
      quality={layer.quality ?? 75}
    />
  );

  // --- ENTER: one-shot fade / slide / scale-in (skipped on the LCP image) -----
  if (allowMotion && layer.enter && !layer.priority) {
    const e = layer.enter;
    content = (
      <motion.div
        initial={{
          opacity: e.fromOpacity ?? 0,
          x: e.fromX ?? 0,
          y: e.fromY ?? 0,
          scale: e.fromScale ?? 1,
          rotate: e.fromRotate ?? 0,
        }}
        whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        viewport={{ once: !e.repeat, amount: 0.15 }}
        transition={{
          duration: (e.durationMs ?? 700) / 1000,
          delay: (e.delayMs ?? 0) / 1000,
          ease: e.ease ?? 'easeOut',
        }}
      >
        {content}
      </motion.div>
    );
  }

  // --- PARALLAX: scroll-linked translate / fade -------------------------------
  const p = layer.parallax;
  if (allowMotion && p && (p.speed || p.fadeOut)) {
    const shift = p.spring === false ? rawShift : smoothShift;
    const parallaxStyle: {
      x?: MotionValue<number>;
      y?: MotionValue<number>;
      opacity?: MotionValue<number>;
    } = {};
    if (p.speed) {
      if ((p.axis ?? 'y') === 'x') parallaxStyle.x = shift;
      else parallaxStyle.y = shift;
    }
    if (p.fadeOut) parallaxStyle.opacity = scrollFade;
    content = <motion.div style={parallaxStyle}>{content}</motion.div>;
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
