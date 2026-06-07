'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import ScrollFadeIn from './ScrollFadeIn';
import styles from './WhyChooseMythoria.module.css';

const ICON_BASE_PATH = '/homepage/kids_fantasy';

interface HighlightIcon {
  src: string;
  width: number;
  height: number;
  tiltDeg: number;
}

interface FeatureCardProps {
  id: string;
  icon: HighlightIcon;
  title: string;
  description: string;
  details: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function FeatureCard({
  id,
  icon,
  title,
  description,
  details,
  isExpanded,
  onToggle,
}: FeatureCardProps) {
  const detailsId = `why-choose-${id}-details`;
  const iconStyle = { '--why-icon-tilt': `${icon.tiltDeg}deg` } as CSSProperties;

  return (
    <button
      type="button"
      className={`${styles.paperCard} ${isExpanded ? styles.paperCardExpanded : ''}`}
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailsId}
    >
      <span className="flex h-full items-start gap-4 p-5 text-left sm:gap-5 sm:p-6">
        <span className={styles.iconStage} style={iconStyle} aria-hidden="true">
          <Image
            src={icon.src}
            alt=""
            width={icon.width}
            height={icon.height}
            sizes="(min-width: 1024px) 92px, 84px"
            className={styles.iconImage}
          />
        </span>
        <span className="min-w-0 flex-1 pt-1">
          <span className="font-display block text-xl leading-tight font-bold text-[color:var(--pc-navy)] sm:text-2xl">
            {title}
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-base-content/80">
            {description}
          </span>
          <span
            id={detailsId}
            className={`mt-4 border-t border-base-content/10 pt-4 text-sm leading-relaxed text-base-content/70 italic ${
              isExpanded ? 'block' : 'hidden'
            }`}
          >
            {details}
          </span>
        </span>
      </span>
    </button>
  );
}

export default function WhyChooseMythoria() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const t = useTranslations('HomePage.whyChooseMythoria');

  const features = [
    {
      id: 'you-own-the-story',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_your_own_story_icon.webp`,
        width: 160,
        height: 201,
        tiltDeg: -4,
      },
      title: t('features.youOwnTheStory.title'),
      description: t('features.youOwnTheStory.description'),
      details: t('features.youOwnTheStory.details'),
    },
    {
      id: 'idea-to-book-fast',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_from_idea_to_book_icon.webp`,
        width: 160,
        height: 207,
        tiltDeg: 3,
      },
      title: t('features.ideaToBookFast.title'),
      description: t('features.ideaToBookFast.description'),
      details: t('features.ideaToBookFast.details'),
    },
    {
      id: 'full-story-editing',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_full_story_editing_icon.webp`,
        width: 160,
        height: 206,
        tiltDeg: -2,
      },
      title: t('features.fullStoryEditing.title'),
      description: t('features.fullStoryEditing.description'),
      details: t('features.fullStoryEditing.details'),
    },
    {
      id: 'multiple-art-styles',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_multiple_art_styles_icon.webp`,
        width: 160,
        height: 200,
        tiltDeg: 4,
      },
      title: t('features.multipleArtStyles.title'),
      description: t('features.multipleArtStyles.description'),
      details: t('features.multipleArtStyles.details'),
    },
    {
      id: 'add-your-own-photos',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_add_your_own_photos_icon.webp`,
        width: 278,
        height: 290,
        tiltDeg: -3,
      },
      title: t('features.addYourOwnPhotos.title'),
      description: t('features.addYourOwnPhotos.description'),
      details: t('features.addYourOwnPhotos.details'),
    },
    {
      id: 'private-by-default',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_private_by_default_icon.webp`,
        width: 160,
        height: 226,
        tiltDeg: 2,
      },
      title: t('features.privateByDefault.title'),
      description: t('features.privateByDefault.description'),
      details: t('features.privateByDefault.details'),
    },
    {
      id: 'made-for-every-audience',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_made_for_every_audience_icon.webp`,
        width: 160,
        height: 148,
        tiltDeg: -4,
      },
      title: t('features.madeForEveryAudience.title'),
      description: t('features.madeForEveryAudience.description'),
      details: t('features.madeForEveryAudience.details'),
    },
    {
      id: 'gentle-credit-system',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_gentle_credit_system_icon.webp`,
        width: 160,
        height: 168,
        tiltDeg: 3,
      },
      title: t('features.gentleCreditSystem.title'),
      description: t('features.gentleCreditSystem.description'),
      details: t('features.gentleCreditSystem.details'),
    },
    {
      id: 'inspiration-on-tap',
      icon: {
        src: `${ICON_BASE_PATH}/highlights_inspiration_on_tap_icon.webp`,
        width: 140,
        height: 238,
        tiltDeg: -2,
      },
      title: t('features.inspirationOnTap.title'),
      description: t('features.inspirationOnTap.description'),
      details: t('features.inspirationOnTap.details'),
    },
  ];

  return (
    <section className={`${styles.section} my-16`}>
      <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
        <div className="text-center mb-12">
          <h2 className="font-display mb-4 text-4xl font-bold text-[color:var(--pc-navy)]">
            {t('title')}
          </h2>
          <p className="text-lg opacity-80 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>
      </ScrollFadeIn>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <li key={feature.id} className="h-full">
            <ScrollFadeIn
              delay={50 + index * 50}
              threshold={0.1}
              rootMargin="0px 0px -20px 0px"
              className="h-full"
            >
              <FeatureCard
                {...feature}
                isExpanded={expandedCard === index}
                onToggle={() => setExpandedCard(expandedCard === index ? null : index)}
              />
            </ScrollFadeIn>
          </li>
        ))}
      </ul>
    </section>
  );
}
