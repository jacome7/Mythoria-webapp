'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import ScrollFadeIn from './ScrollFadeIn';
import styles from './HowItWorks.module.css';

const ICON_BASE_PATH = '/homepage/kids_fantasy';

const steps = [
  {
    id: 'author',
    titleKey: 'steps.step1.title',
    descriptionKey: 'steps.step1.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Author_icon.webp`,
    width: 234,
    height: 268,
    iconTiltDeg: -4,
    tapeTiltDeg: 5,
  },
  {
    id: 'story',
    titleKey: 'steps.step2.title',
    descriptionKey: 'steps.step2.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Story_icon.webp`,
    width: 292,
    height: 243,
    iconTiltDeg: 3,
    tapeTiltDeg: -4,
  },
  {
    id: 'characters',
    titleKey: 'steps.step3.title',
    descriptionKey: 'steps.step3.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Characters_icon.webp`,
    width: 237,
    height: 252,
    iconTiltDeg: -2,
    tapeTiltDeg: 6,
  },
  {
    id: 'plot',
    titleKey: 'steps.step4.title',
    descriptionKey: 'steps.step4.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Plot_icon.webp`,
    width: 293,
    height: 286,
    iconTiltDeg: 4,
    tapeTiltDeg: -5,
  },
  {
    id: 'gift',
    titleKey: 'steps.step5.title',
    descriptionKey: 'steps.step5.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Gift_icon.webp`,
    width: 267,
    height: 235,
    iconTiltDeg: -3,
    tapeTiltDeg: 4,
  },
  {
    id: 'magic',
    titleKey: 'steps.step6.title',
    descriptionKey: 'steps.step6.description',
    icon: `${ICON_BASE_PATH}/howItWorks_The_Magic_icon.webp`,
    width: 207,
    height: 242,
    iconTiltDeg: 2,
    tapeTiltDeg: -6,
  },
] as const;

export default function HowItWorks() {
  const t = useTranslations('HomePage.howItWorks');

  return (
    <section id="how-it-works" className={`${styles.section} my-16`}>
      <ScrollFadeIn delay={0} threshold={0.1} rootMargin="0px 0px -20px 0px">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="font-display text-4xl font-bold leading-tight text-[color:var(--pc-navy)]">
            {t('title')}
          </h2>
        </div>
      </ScrollFadeIn>

      <div className={styles.stepsMap}>
        <svg
          className={`${styles.road} ${styles.roadMobile}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.roadTrack}
            d="M50 6 C34 14 66 22 50 31 S34 46 50 55 S66 70 50 79 S36 91 50 96"
          />
          <path
            className={styles.roadDash}
            d="M50 6 C34 14 66 22 50 31 S34 46 50 55 S66 70 50 79 S36 91 50 96"
          />
        </svg>
        <svg
          className={`${styles.road} ${styles.roadTablet}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.roadTrack}
            d="M24 14 C38 5 60 23 76 14 C93 29 90 41 76 49 C58 60 42 38 24 49 C7 59 9 73 24 84 C40 73 58 95 76 84"
          />
          <path
            className={styles.roadDash}
            d="M24 14 C38 5 60 23 76 14 C93 29 90 41 76 49 C58 60 42 38 24 49 C7 59 9 73 24 84 C40 73 58 95 76 84"
          />
        </svg>
        <svg
          className={`${styles.road} ${styles.roadDesktop}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.roadTrack}
            d="M16 24 C28 13 39 34 50 24 S72 13 84 24 C97 35 96 54 84 62 C64 76 36 48 16 62 C3 72 5 87 16 86 C31 84 36 75 50 86 S70 97 84 86"
          />
          <path
            className={styles.roadDash}
            d="M16 24 C28 13 39 34 50 24 S72 13 84 24 C97 35 96 54 84 62 C64 76 36 48 16 62 C3 72 5 87 16 86 C31 84 36 75 50 86 S70 97 84 86"
          />
        </svg>

        <ol className={styles.stepGrid}>
          {steps.map((step, index) => {
            const style = {
              '--how-icon-tilt': `${step.iconTiltDeg}deg`,
              '--how-tape-tilt': `${step.tapeTiltDeg}deg`,
            } as CSSProperties;

            return (
              <li key={step.id} className={styles.stepItem}>
                <ScrollFadeIn
                  delay={80 + index * 70}
                  threshold={0.1}
                  rootMargin="0px 0px -20px 0px"
                  className="h-full"
                >
                  <article className={styles.stepCard} style={style}>
                    <div className={styles.iconStage} aria-hidden="true">
                      <Image
                        src={step.icon}
                        alt=""
                        width={step.width}
                        height={step.height}
                        sizes="(min-width: 1024px) 132px, (min-width: 640px) 116px, 104px"
                        className={styles.iconImage}
                      />
                    </div>
                    <h3 className="font-display text-2xl font-bold leading-tight text-[color:var(--pc-navy)]">
                      {index + 1}. {t(step.titleKey)}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-base-content/80">
                      {t(step.descriptionKey)}
                    </p>
                  </article>
                </ScrollFadeIn>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
