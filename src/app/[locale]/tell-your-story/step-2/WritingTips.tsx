'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const WRITING_TIPS = [
  { iconSrc: '/Papercut_icons/fa-globe-americas-papercut.webp', key: 'setting' },
  { iconSrc: '/Papercut_icons/fa-users-papercut.webp', key: 'characters' },
  { iconSrc: '/Papercut_icons/gi-crossed-swords-papercut.webp', key: 'conflict' },
  { iconSrc: '/Papercut_icons/fa-heart-papercut.webp', key: 'emotion' },
  { iconSrc: '/Papercut_icons/gi-drama-masks-papercut.webp', key: 'twist' },
  { iconSrc: '/Papercut_icons/fa-bullseye-papercut.webp', key: 'goal' },
  { iconSrc: '/Papercut_icons/fa-magic-papercut.webp', key: 'magic' },
];

export default function WritingTips() {
  const t = useTranslations('StorySteps.step2');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % WRITING_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = WRITING_TIPS[currentTipIndex];

  return (
    <div className="p-4 bg-base-200 rounded-lg">
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        <Image src={currentTip.iconSrc} alt="" width={24} height={24} aria-hidden="true" />
        <span className="text-sm">{t('writingTipsTitle')}</span>
      </h4>
      <p className="text-sm leading-relaxed animate-fade-in">
        {t(`writingTips.${currentTipIndex}.text`)}
      </p>
    </div>
  );
}
