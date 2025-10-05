'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const WRITING_TIPS = [
  { icon: '🌍', key: 'setting' },
  { icon: '👥', key: 'characters' },
  { icon: '⚔️', key: 'conflict' },
  { icon: '❤️', key: 'emotion' },
  { icon: '🎭', key: 'twist' },
  { icon: '🎯', key: 'goal' },
  { icon: '✨', key: 'magic' },
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
        <span className="text-xl">{currentTip.icon}</span>
        <span className="text-sm">{t('writingTipsTitle')}</span>
      </h4>
      <p className="text-sm leading-relaxed animate-fade-in">
        {t(`writingTips.${currentTipIndex}.text`)}
      </p>
    </div>
  );
}
