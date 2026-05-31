'use client';

import Link from 'next/link';
import { useScroll, useTransform } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { useIntentContext } from '@/hooks/useIntentContext';
import PaperCutLayer from './PaperCutLayer';
import PaperCutStage from './PaperCutStage';
import FeatureCard from './FeatureCard';
import { resolveComposition } from './registry';
import type { PaperCutLayerConfig } from './types';

/**
 * How many pixels of scrolling the parallax plays over. Larger = slower, more
 * gradual parallax; smaller = layers reach their full travel sooner.
 */
const HERO_SCROLL_PX = 800;

/**
 * The paper-cut storytelling hero. Picks a composition from the visitor's
 * intent (defaults to kids_fantasy), then renders three bands:
 *   1. sky + headline/subtitle/CTA (text grows the band; sky sits behind it)
 *   2. the scene diorama (fixed-aspect stage of positioned layers)
 *   3. the bottom feature card overlapping the scene
 *
 * Rendered full-bleed (outside the page container). All internal z-indices are
 * < 50 so the sticky frosted header always stays on top.
 */
export default function PaperCutHero() {
  const t = useTranslations('HomePage');
  const locale = useLocale();
  const intentContext = useIntentContext();
  const composition = resolveComposition(intentContext?.intent);

  // Parallax driver. We use the document scroll position (rather than
  // useScroll({ target }), which needs a hydrated ref and can throw during SSR
  // hydration) and map the first ~800px of scrolling to a 0→1 progress shared by
  // every layer. Tune HERO_SCROLL_PX to lengthen/shorten the parallax travel.
  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, [0, HERO_SCROLL_PX], [0, 1]);

  const tr = (key: string): string => t(key);
  const altFor = (layer: PaperCutLayerConfig) => (layer.altKey ? tr(layer.altKey) : '');

  const { text, sky, scene, features } = composition;

  // Subtitle with an optional emphasized fragment wrapped in <em>.
  const subtitle = tr(text.subtitleKey);
  const emphasized = text.subtitleEmphasizedKey ? tr(text.subtitleEmphasizedKey) : '';
  const subtitleParts = emphasized ? subtitle.split(emphasized) : [subtitle];

  return (
    <section className="papercut-hero">
      {/* Sky band + headline / CTA */}
      <div className="relative overflow-hidden px-4 pb-2 pt-8 sm:pt-10">
        {sky.map((layer) => (
          <PaperCutLayer
            key={layer.id}
            layer={layer}
            alt={altFor(layer)}
            scrollYProgress={scrollYProgress}
          />
        ))}
        <div className="relative z-30 mx-auto max-w-2xl pt-24 text-center sm:pt-28 lg:pt-12">
          <h1 className="font-display text-3xl leading-tight font-bold text-[color:var(--pc-navy)] sm:text-4xl md:text-5xl">
            {tr(text.headlineKey)}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-base-content/80 sm:text-lg">
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
            href={`/${locale}/${text.ctaPath}`}
            className="btn btn-primary btn-lg mt-6 px-8 shadow-md"
          >
            {tr(text.ctaKey)}
          </Link>
        </div>
      </div>

      {/* Scene diorama */}
      <PaperCutStage aspect={composition.stageAspect}>
        {scene.map((layer) => (
          <PaperCutLayer
            key={layer.id}
            layer={layer}
            alt={altFor(layer)}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </PaperCutStage>

      {/* Bottom feature card overlapping the scene */}
      {features && features.length > 0 && <FeatureCard items={features} t={tr} />}
    </section>
  );
}
