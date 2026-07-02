'use client';

import Link from 'next/link';
import { useScroll, useTransform } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { useIntentContext } from '@/hooks/useIntentContext';
import { useIntentOverride } from '@/hooks/useIntentOverride';
import ArtDirectedImage from './ArtDirectedImage';
import FeatureCard from './FeatureCard';
import PaperCutLayer from './PaperCutLayer';
import PaperCutStage from './PaperCutStage';
import PersonCarousel from './PersonCarousel';
import { resolveAsset, resolvePersons, type HeroStyleId } from './heroManifest';
import { resolveComposition } from './registry';
import type { IntentContext } from '@/types/intent-context';
import type {
  DecorSlot,
  DecorTuning,
  FeatureItem,
  HeroComposition,
  PaperCutLayerConfig,
  Placement,
  StageAspect,
  StyleVars,
} from './types';

/**
 * How many pixels of scrolling the parallax plays over. Larger = slower, more
 * gradual parallax; smaller = layers reach their full travel sooner.
 */
const HERO_SCROLL_PX = 800;

/** Scene aspect matches the canonical artwork: 1080×1072 mobile, 1920×1072 up. */
const SCENE_ASPECT: StageAspect = { base: '1080 / 1072', md: '1920 / 1072', lg: '1920 / 1072' };

/**
 * Canonical placement + animation for the five sky-band decor slots. Every
 * style fills the same slots with its own artwork (cloud behind, themed
 * floater in front slightly below, mirrored on the right, sparkles centered
 * above the title); compositions only nudge these via `composition.decor`.
 */
const DECOR_TEMPLATE: Record<DecorSlot, Omit<PaperCutLayerConfig, 'id' | 'src' | 'intrinsic'>> = {
  cloud_left: {
    z: 2,
    anchor: 'top',
    base: { x: -7, y: 15, width: 33 },
    md: { x: 1, y: 15, width: 22 },
    lg: { x: 5, y: 15, width: 13 },
    shadow: 'sky',
    anim: 'drift',
    animDelayMs: 1200,
    animDurMs: 14000,
    enter: { fromOpacity: 0, fromX: -28, durationMs: 850, delayMs: 120 },
    parallax: { speed: -42 },
  },
  sky_left: {
    z: 4,
    anchor: 'top',
    base: { x: -1, y: 18, width: 23 },
    md: { x: 5, y: 22, width: 15 },
    lg: { x: 9, y: 24, width: 9 },
    shadow: 'front',
    anim: 'balloon',
    animDurMs: 9500,
    enter: { fromOpacity: 0, fromScale: 0.86, fromY: -12, durationMs: 750 },
    parallax: { speed: -90, fadeOut: true },
  },
  cloud_right: {
    z: 2,
    anchor: 'top',
    base: { x: 82, y: 26, width: 31 },
    md: { x: 80, y: 22, width: 22 },
    lg: { x: 82, y: 18, width: 13 },
    shadow: 'sky',
    anim: 'drift',
    animDelayMs: 2600,
    animDurMs: 15000,
    enter: { fromOpacity: 0, fromX: 28, durationMs: 850, delayMs: 220 },
    parallax: { speed: -52, fadeOut: true },
  },
  sky_right: {
    z: 3,
    anchor: 'top',
    base: { x: 78, y: 6, width: 18 },
    md: { x: 80, y: 5, width: 12 },
    lg: { x: 83, y: 5, width: 8 },
    shadow: 'sky',
    anim: 'bob',
    animDurMs: 6000,
    enter: { fromOpacity: 0, fromScale: 0.76, durationMs: 700, delayMs: 180 },
    parallax: { speed: -36 },
  },
  sparkles: {
    z: 3,
    anchor: 'top',
    base: { x: 50, y: 17, width: 14, center: true },
    md: { y: 8, width: 10 },
    lg: { y: 2, width: 6 },
    shadow: 'none',
    anim: 'twinkle',
    animDelayMs: 700,
    animDurMs: 4800,
    enter: { fromOpacity: 0, fromScale: 0.5, durationMs: 600, delayMs: 380 },
    parallax: { speed: -44 },
  },
};

const DECOR_ORDER: DecorSlot[] = ['cloud_left', 'sky_left', 'cloud_right', 'sky_right', 'sparkles'];

function mergePlacement(base: Placement, tune?: Partial<Placement>): Placement {
  return tune ? { ...base, ...tune } : base;
}

/** Template + per-style tuning + manifest asset → a renderable layer config. */
function buildDecorLayer(style: HeroStyleId, slot: DecorSlot, tuning?: DecorTuning) {
  const asset = resolveAsset(style, slot);
  if (!asset) return null;
  const template = DECOR_TEMPLATE[slot];
  const layer: PaperCutLayerConfig = {
    ...template,
    id: slot,
    src: asset.src,
    intrinsic: { w: asset.w, h: asset.h },
    base: mergePlacement(template.base, tuning?.base),
    md: template.md ? mergePlacement(template.md as Placement, tuning?.md) : undefined,
    lg: template.lg ? mergePlacement(template.lg as Placement, tuning?.lg) : undefined,
    anim: tuning?.anim ?? template.anim,
    animDurMs: tuning?.animDurMs ?? template.animDurMs,
    animDelayMs: tuning?.animDelayMs ?? template.animDelayMs,
  };
  return layer;
}

/**
 * The paper-cut storytelling hero. Picks a style composition from the
 * visitor's intent (defaults to kids_fantasy), then renders one shared
 * skeleton:
 *   1. sky band — cloud/sky decor pairs + sparkles behind the headline,
 *      subtitle and CTA (all copy from the style's translation namespace)
 *   2. the scene — background (art-directed mobile/laptop, locale-aware),
 *      the rotating person-with-book carousel, and the foreground strip
 *   3. the bottom feature card overlapping the scene
 *
 * Rendered full-bleed (outside the page container). All internal z-indices are
 * < 50 so the sticky frosted header always stays on top.
 */
interface PaperCutHeroProps {
  initialIntentOverride?: string | null;
  initialIntentContext?: IntentContext | null;
}

export default function PaperCutHero({
  initialIntentOverride = null,
  initialIntentContext = null,
}: PaperCutHeroProps) {
  const t = useTranslations('HomePage');
  const locale = useLocale();
  const intentContext = useIntentContext();
  const intentOverride = useIntentOverride();
  // Precedence: ?intent= query param > intent cookie > default composition.
  const composition: HeroComposition = resolveComposition(
    intentOverride ??
      initialIntentOverride ??
      intentContext?.intent ??
      initialIntentContext?.intent,
  );
  const style = composition.id;
  const ns = composition.textNamespace;

  // Parallax driver. We use the document scroll position (rather than
  // useScroll({ target }), which needs a hydrated ref and can throw during SSR
  // hydration) and map the first ~800px of scrolling to a 0→1 progress shared by
  // every layer. Tune HERO_SCROLL_PX to lengthen/shorten the parallax travel.
  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, [0, HERO_SCROLL_PX], [0, 1]);

  const tr = (key: string): string => t(`${ns}.${key}` as Parameters<typeof t>[0]);

  // --- Sky decor (template + per-style tuning) -------------------------------
  const decorLayers = DECOR_ORDER.map((slot) =>
    buildDecorLayer(style, slot, composition.decor?.[slot]),
  ).filter((l): l is PaperCutLayerConfig => l !== null);

  // --- Scene assets (locale-aware, deterministic build-time fallback) --------
  const backgroundMobile = resolveAsset(style, 'background', { device: 'mobile', locale });
  const backgroundLaptop = resolveAsset(style, 'background', { device: 'laptop', locale });
  const foregroundMobile = resolveAsset(style, 'foreground', { device: 'mobile', locale });
  const foregroundLaptop = resolveAsset(style, 'foreground', { device: 'laptop', locale });
  const persons = resolvePersons(style, locale);

  const features: FeatureItem[] = [1, 2, 3].flatMap((n) => {
    const icon = resolveAsset(style, `icon${n}`);
    return icon
      ? [
          {
            id: `feature${n}`,
            icon: icon.src,
            titleKey: `features.feature${n}.title`,
            descKey: `features.feature${n}.desc`,
          },
        ]
      : [];
  });

  // --- Person band geometry (CSS-var cascade shared with .pc-layer) ----------
  const personWidth = composition.person?.width;
  const personBottom = composition.person?.bottom;
  const personStyle: StyleVars = {
    zIndex: 5,
    '--pc-x': '50%',
    '--pc-y': `${personBottom?.base ?? 8}%`,
    '--pc-w': `${personWidth?.base ?? 54}%`,
    '--pc-md-x': '50%',
    '--pc-md-y': `${personBottom?.md ?? 7}%`,
    '--pc-md-w': `${personWidth?.md ?? 34}%`,
    '--pc-lg-x': '50%',
    '--pc-lg-y': `${personBottom?.lg ?? 6}%`,
    '--pc-lg-w': `${personWidth?.lg ?? 26}%`,
  };

  // Subtitle with an optional emphasized fragment wrapped in <em>.
  const subtitle = tr('subtitle');
  const emphasized = tr('subtitleEmphasized');
  const subtitleParts = emphasized ? subtitle.split(emphasized) : [subtitle];
  const heroClassName = ['papercut-hero', composition.rootClassName].filter(Boolean).join(' ');

  return (
    <section className={heroClassName}>
      {/* Sky band + headline / CTA */}
      <div className="relative overflow-hidden px-4 pt-10 pb-1 sm:pt-12 sm:pb-4 lg:pt-8">
        {decorLayers.map((layer) => (
          <PaperCutLayer key={layer.id} layer={layer} alt="" scrollYProgress={scrollYProgress} />
        ))}
        <div className="relative z-30 mx-auto max-w-[23rem] pt-28 text-center sm:max-w-[28rem] sm:pt-32 md:max-w-2xl lg:pt-16">
          <h1 className="font-display text-[2.65rem] leading-[1.02] font-bold text-[color:var(--pc-navy)] sm:text-5xl md:text-6xl">
            {tr('headline')}
          </h1>
          <p className="mx-auto mt-5 max-w-[25rem] text-lg leading-relaxed text-base-content/80 sm:text-xl md:max-w-xl">
            {subtitleParts.map((part, i) => (
              <span key={i}>
                {i > 0 && (
                  <em className="font-semibold text-[color:var(--pc-navy)] not-italic">
                    {emphasized}
                  </em>
                )}
                {part}
              </span>
            ))}
          </p>
          <Link
            href={`/${locale}/${composition.ctaPath}`}
            className="btn btn-lg pc-cta mt-7 w-full max-w-[24rem] px-8 text-lg shadow-lg"
          >
            {tr('cta')}
          </Link>
        </div>
      </div>

      {/* Scene: background → person carousel → foreground */}
      <PaperCutStage aspect={SCENE_ASPECT} className="pc-scene">
        {backgroundMobile && backgroundLaptop && (
          <ArtDirectedImage
            mobile={backgroundMobile}
            desktop={backgroundLaptop}
            priority
            className="pc-scene-bg"
          />
        )}
        <div className="pc-layer pc-anchor-bottom pc-center pc-shadow-front" style={personStyle}>
          <PersonCarousel
            persons={persons}
            alt={tr('alt.person')}
            holdMs={composition.personHoldMs}
          />
        </div>
        {foregroundMobile && foregroundLaptop && (
          <ArtDirectedImage
            mobile={foregroundMobile}
            desktop={foregroundLaptop}
            className="pc-scene-fg"
          />
        )}
      </PaperCutStage>

      {/* Bottom feature card overlapping the scene */}
      {features.length > 0 && <FeatureCard items={features} t={tr} />}
    </section>
  );
}
