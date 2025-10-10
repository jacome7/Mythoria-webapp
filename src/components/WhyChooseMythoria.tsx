'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LuBadgeCheck,
  LuRocket,
  LuPencilLine,
  LuBrush,
  LuImagePlus,
  LuLock,
  LuUsers,
  LuCoins,
  LuSparkles,
} from 'react-icons/lu';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function FeatureCard({
  icon,
  title,
  description,
  details,
  isExpanded,
  onToggle,
}: FeatureCardProps) {
  return (
    <div
      className={`card bg-base-100 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
        isExpanded ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onToggle}
    >
      <div className="card-body p-6">
        <div className="flex items-start gap-3">
          <div className="text-primary text-3xl flex-shrink-0 mt-1">{icon}</div>
          <div className="flex-1">
            <h3 className="card-title text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm opacity-80">{description}</p>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-base-300">
                <p className="text-sm italic opacity-70">{details}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhyChooseMythoria() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const t = useTranslations('HomePage.whyChooseMythoria');

  const features = [
    {
      icon: <LuBadgeCheck />,
      title: t('features.youOwnTheStory.title'),
      description: t('features.youOwnTheStory.description'),
      details: t('features.youOwnTheStory.details'),
    },
    {
      icon: <LuRocket />,
      title: t('features.ideaToBookFast.title'),
      description: t('features.ideaToBookFast.description'),
      details: t('features.ideaToBookFast.details'),
    },
    {
      icon: <LuPencilLine />,
      title: t('features.fullStoryEditing.title'),
      description: t('features.fullStoryEditing.description'),
      details: t('features.fullStoryEditing.details'),
    },
    {
      icon: <LuBrush />,
      title: t('features.multipleArtStyles.title'),
      description: t('features.multipleArtStyles.description'),
      details: t('features.multipleArtStyles.details'),
    },
    {
      icon: <LuImagePlus />,
      title: t('features.addYourOwnPhotos.title'),
      description: t('features.addYourOwnPhotos.description'),
      details: t('features.addYourOwnPhotos.details'),
    },
    {
      icon: <LuLock />,
      title: t('features.privateByDefault.title'),
      description: t('features.privateByDefault.description'),
      details: t('features.privateByDefault.details'),
    },
    {
      icon: <LuUsers />,
      title: t('features.madeForEveryAudience.title'),
      description: t('features.madeForEveryAudience.description'),
      details: t('features.madeForEveryAudience.details'),
    },
    {
      icon: <LuCoins />,
      title: t('features.gentleCreditSystem.title'),
      description: t('features.gentleCreditSystem.description'),
      details: t('features.gentleCreditSystem.details'),
    },
    {
      icon: <LuSparkles />,
      title: t('features.inspirationOnTap.title'),
      description: t('features.inspirationOnTap.description'),
      details: t('features.inspirationOnTap.details'),
    },
  ];

  return (
    <section className="my-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">{t('title')}</h2>
        <p className="text-lg opacity-80 max-w-2xl mx-auto">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            {...feature}
            isExpanded={expandedCard === index}
            onToggle={() => setExpandedCard(expandedCard === index ? null : index)}
          />
        ))}
      </div>
    </section>
  );
}
