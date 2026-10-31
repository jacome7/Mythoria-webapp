'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAudiobookProgress, type AudiobookProgress } from '@/hooks/useAudiobookProgress';

export default function AudiobookGenerationProgress({
  storyId,
  onComplete,
}: {
  storyId: string;
  onComplete?: () => void;
}) {
  const { progress, error, refresh } = useAudiobookProgress(storyId);
  const completed = useRef(false);
  useEffect(() => {
    if (progress?.audiobookGenerationStatus === 'completed' && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  }, [progress, onComplete]);
  return <AudiobookProgressPanel progress={progress} error={error} refresh={refresh} />;
}

export function AudiobookProgressPanel({
  progress,
  error,
  refresh,
}: {
  progress: AudiobookProgress | null;
  error: boolean;
  refresh: () => Promise<void>;
}) {
  const t = useTranslations('AudiobookGenerationProgress');
  const remaining = progress?.estimatedRemainingSeconds;
  return (
    <div className="mx-auto max-w-md space-y-3 py-6 text-center">
      <h3 className="text-xl font-semibold">{t('generatingAudiobook')}</h3>
      <p className="text-sm">{t('estimatedProgress')}</p>
      <progress
        className="progress progress-primary w-full"
        aria-label={t('estimatedProgress')}
        max={100}
        value={progress?.audiobookGenerationCompletedPercentage ?? undefined}
      />
      <p className="text-sm" aria-live="polite">
        {progress?.audiobookGenerationStatus === 'failed'
          ? t('generationFailed')
          : progress?.estimateExceeded
            ? t('takingLonger')
            : remaining != null
              ? remaining < 60
                ? t('lessThanMinute')
                : t('minutesRemaining', { minutes: Math.ceil(remaining / 60) })
              : t('preparing')}
      </p>
      <p className="text-sm text-base-content/70">{t('leaveAndReturn')}</p>
      {error && (
        <div role="alert">
          <p>{t('errors.failedToLoad')}</p>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
            {t('checkAgain')}
          </button>
        </div>
      )}
    </div>
  );
}
