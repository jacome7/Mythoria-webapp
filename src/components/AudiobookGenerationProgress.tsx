'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface AudiobookGenerationProgressProps {
  storyId: string;
  onComplete?: () => void;
}

interface AudiobookProgress {
  audiobookGenerationCompletedPercentage: number;
  audiobookGenerationStatus: 'generating' | 'completed' | 'failed';
  currentStep?: string;
  chaptersProcessed?: number;
  totalChapters?: number;
}

// Funny narrator messages based on current step
const getFunnyMessage = (step: string, t: ReturnType<typeof import('next-intl').useTranslations>) => {
  const messages = t.raw(`narrationMessages.${step}`) || t.raw('narrationMessages.default');
  return messages[Math.floor(Math.random() * messages.length)];
};

const calculateEstimatedTime = (percentage: number): string => {
  const totalEstimatedTime = 8 * 60; // 8 minutes in seconds (typically faster than story generation)
  const remainingTime = Math.max(0, totalEstimatedTime - (totalEstimatedTime * percentage / 100));
  
  if (remainingTime < 60) {
    return `${Math.ceil(remainingTime)} seconds`;
  } else {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.ceil(remainingTime % 60);
    return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')} minutes` : `${minutes} minutes`;
  }
};

export default function AudiobookGenerationProgress({ storyId, onComplete }: AudiobookGenerationProgressProps) {
  const t = useTranslations('common.audiobookGenerationProgress');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [progress, setProgress] = useState<AudiobookProgress>({
    audiobookGenerationCompletedPercentage: 0,
    audiobookGenerationStatus: 'generating',
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch progress data from API
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}/audiobook-progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch audiobook progress');
      }
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Error fetching audiobook progress:', error);
      setError('Failed to load audiobook generation progress');
    }
  }, [storyId]);

  // Update funny message based on current step
  useEffect(() => {
    if (progress.currentStep) {
      setCurrentMessage(getFunnyMessage(progress.currentStep, t));
    }
  }, [progress.currentStep, t]);

  // Poll for progress updates
  useEffect(() => {
    const interval = setInterval(fetchProgress, 3000); // Poll every 3 seconds
    fetchProgress(); // Initial fetch

    return () => clearInterval(interval);
  }, [storyId, fetchProgress]);

  // Handle completion
  useEffect(() => {
    if (progress.audiobookGenerationStatus === 'completed') {
      if (onComplete) {
        onComplete();
      } else {
        // Redirect to story view where user can listen to the audiobook
        setTimeout(() => {
          router.push(`/${locale}/my-stories/${storyId}`);
        }, 2000);
      }
    }
  }, [progress.audiobookGenerationStatus, onComplete, router, locale, storyId]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
        <div className="mt-4 text-center">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  if (progress.audiobookGenerationStatus === 'failed') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="alert alert-error">
          <h3 className="font-bold">{t('generationFailed')}</h3>
          <p>{t('generationFailedMessage')}</p>
        </div>
        <div className="mt-4 text-center">
          <button 
            className="btn btn-primary"
            onClick={() => router.push(`/${locale}/my-stories/${storyId}`)}
          >
            {t('backToStory')}
          </button>
        </div>
      </div>
    );
  }

  if (progress.audiobookGenerationStatus === 'completed') {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-success mb-2">{t('generationComplete')}</h2>
          <p className="text-lg">{t('audiobookReady')}</p>
        </div>
        
        <div className="space-y-4">
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => router.push(`/${locale}/my-stories/${storyId}`)}
          >
            {t('listenToAudiobook')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-4">{t('generatingAudiobook')}</h2>
        <p className="text-gray-600">{t('processingMessage')}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{t('progress')}</span>
          <span className="text-sm text-gray-500">
            {progress.audiobookGenerationCompletedPercentage}%
          </span>
        </div>
        <progress 
          className="progress progress-primary w-full h-3" 
          value={progress.audiobookGenerationCompletedPercentage} 
          max={100}
        />
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>{t('estimatedTimeRemaining')}: {calculateEstimatedTime(progress.audiobookGenerationCompletedPercentage)}</span>
          {progress.chaptersProcessed && progress.totalChapters && (
            <span>{t('chaptersProcessed', { 
              processed: progress.chaptersProcessed, 
              total: progress.totalChapters 
            })}</span>
          )}
        </div>
      </div>

      {/* Current Step Info */}
      {progress.currentStep && (
        <div className="bg-base-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="loading loading-spinner loading-sm"></div>
            <div>
              <p className="font-medium">{t(`steps.${progress.currentStep}`)}</p>
              {currentMessage && (
                <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{currentMessage}&rdquo;</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          {t('statusMessage')}
        </p>
        <p className="text-xs text-gray-500">
          {t('doNotClose')}
        </p>
      </div>
    </div>
  );
}
