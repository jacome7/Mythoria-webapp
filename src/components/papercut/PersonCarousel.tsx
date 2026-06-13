'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ResolvedAsset } from './heroManifest';

/** Slide-in from the right, in seconds. */
const ENTER_S = 0.6;
/** Slide-out to the left, in seconds. */
const EXIT_S = 0.45;

/** `sizes` hint matching the person band widths set by PaperCutHero. */
const PERSON_SIZES = '(min-width: 1024px) 26vw, (min-width: 768px) 34vw, 54vw';

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

function PersonImage({
  person,
  alt,
  priority = false,
}: {
  person: ResolvedAsset;
  alt: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={person.src}
      alt={alt}
      width={person.w}
      height={person.h}
      className="pc-img"
      sizes={PERSON_SIZES}
      priority={priority}
      quality={75}
    />
  );
}

/**
 * The rotating "real person holding a real book" centerpiece of the hero
 * scene. Each slide eases in from the right, holds centered for `holdMs`,
 * then eases out to the left while the next slide enters (AnimatePresence
 * `mode="sync"` overlaps exit and enter, so the stage is never empty).
 *
 * LCP safety: `initial={false}` makes the first slide server-render at its
 * resting state (no enter animation), and it carries `priority` so the
 * preload is emitted. Subsequent slides animate normally; the upcoming slide
 * is pre-decoded in a visually-hidden copy during the hold to avoid pop-in.
 *
 * The rotation pauses (WCAG 2.2.2) whenever any of these hold:
 * `prefers-reduced-motion` (renders fully static), the carousel is scrolled
 * off-screen, the tab is hidden, or the visitor hovers/focuses the band.
 * With a single slide (e.g. romance today) it renders a static image only.
 */
export default function PersonCarousel({
  persons,
  alt,
  holdMs = 4000,
}: {
  persons: ResolvedAsset[];
  /** Localized alt text describing the person + book (same for all slides). */
  alt: string;
  holdMs?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const pageVisible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  const rotating = persons.length > 1 && !reduced;

  useEffect(() => {
    if (!rotating || !inView || !pageVisible || paused) return;
    // The hold starts once the slide has finished entering.
    const id = setTimeout(() => setIndex((i) => (i + 1) % persons.length), holdMs + ENTER_S * 1000);
    return () => clearTimeout(id);
  }, [rotating, inView, pageVisible, paused, index, holdMs, persons.length]);

  if (persons.length === 0) return null;

  if (!rotating) {
    return (
      <div className="pc-person-viewport" style={personViewportAspect(persons)}>
        <div className="pc-person-slide">
          <PersonImage person={persons[0]} alt={alt} priority />
        </div>
      </div>
    );
  }

  const next = persons[(index + 1) % persons.length];

  return (
    <div
      ref={ref}
      className="pc-person-viewport"
      style={personViewportAspect(persons)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={index}
          className="pc-person-slide"
          initial={{ x: '70%', opacity: 0 }}
          animate={{ x: 0, opacity: 1, transition: { duration: ENTER_S, ease: 'easeOut' } }}
          exit={{ x: '-70%', opacity: 0, transition: { duration: EXIT_S, ease: 'easeIn' } }}
        >
          <PersonImage person={persons[index]} alt={alt} priority={index === 0} />
        </motion.div>
      </AnimatePresence>
      {/* Pre-decode the upcoming slide during the hold so it never pops in. */}
      <div className="pc-person-preload" aria-hidden="true">
        <Image src={next.src} alt="" width={next.w} height={next.h} sizes={PERSON_SIZES} />
      </div>
    </div>
  );
}

/**
 * Reserve enough vertical room for the tallest slide at the shared carousel
 * width. Locale-specific person cutouts can have different aspect ratios.
 */
function personViewportAspect(persons: ResolvedAsset[]): React.CSSProperties {
  const maxHeightRatio = Math.max(...persons.map((person) => person.h / person.w));
  return { aspectRatio: `1 / ${maxHeightRatio}` };
}
