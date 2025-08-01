'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface StoryGenerationProgressProps {
  storyId: string;
  onComplete?: () => void;
}

interface StoryProgress {
  storyGenerationCompletedPercentage: number;
  storyGenerationStatus: 'draft' | 'running' | 'completed' | 'failed';
  status: 'draft' | 'writing' | 'published';
  currentStep?: string;
}

// Funny Oompa-Loompa messages based on current step
const getFunnyMessage = (step: string, t: ReturnType<typeof import('next-intl').useTranslations>) => {
  const messages = t.raw(`funnyMessages.${step}`) || t.raw('funnyMessages.default');
  return messages[Math.floor(Math.random() * messages.length)];
};

interface TimeUnits {
  seconds: string;
  minutes: string;
}

const calculateEstimatedTime = (percentage: number, timeUnits: TimeUnits): string => {
  const totalEstimatedTime = 14 * 60; // 14 minutes in seconds
  const remainingTime = Math.max(0, totalEstimatedTime - (totalEstimatedTime * percentage / 100));

  if (remainingTime < 60) {
    return `${Math.ceil(remainingTime)} ${timeUnits.seconds}`;
  } else {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.ceil(remainingTime % 60);
    return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')} ${timeUnits.minutes}` : `${minutes} ${timeUnits.minutes}`;
  }
};

export default function StoryGenerationProgress({ storyId, onComplete }: StoryGenerationProgressProps) {
  const t = useTranslations('common.storyGenerationProgress');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [progress, setProgress] = useState<StoryProgress>({
    storyGenerationCompletedPercentage: 0,
    storyGenerationStatus: 'running',
    status: 'writing'
  });
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  // Update funny message periodically
  useEffect(() => {
    // Don't update messages if story is completed
    if (progress.status === 'published') {
      return;
    }
    
    const updateMessage = () => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentMessage(getFunnyMessage(progress.currentStep || 'generate_outline', t));
        setIsAnimating(false);
      }, 300);
    };

    // Initial message
    updateMessage();

    // Update message every 8 seconds
    const messageInterval = setInterval(updateMessage, 8000);    return () => clearInterval(messageInterval);
  }, [progress.currentStep, progress.status, t]);// Poll for progress updates
  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let intervalId: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/my-stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          const story = data.story;
            setProgress({
            storyGenerationCompletedPercentage: story.storyGenerationCompletedPercentage || 0,
            storyGenerationStatus: story.storyGenerationStatus || 'running',
            status: story.status || 'writing',
            currentStep: story.currentStep
          });          // If completed, call onComplete callback
          if (story.status === 'published' && onComplete) {
            clearInterval(intervalId);
            onComplete();
          }
          
          // Also stop polling if story is published
          if (story.status === 'published') {
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error('Error fetching story progress:', error);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 15 seconds
    intervalId = setInterval(fetchProgress, 15000);

    return () => clearInterval(intervalId);
  }, [storyId, onComplete]);
  const percentage = progress.storyGenerationCompletedPercentage;
  const estimatedTime = calculateEstimatedTime(percentage, {
    seconds: t('timeUnits.seconds'),
    minutes: t('timeUnits.minutes'),
  });
  const isCompleted = progress.status === 'published';

  // Show completion state when story is published
  if (isCompleted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center">
        {/* Completion Header */}
        <div className="mb-6">
          <div className="text-6xl mb-4">🎉</div>          <h2 className="text-3xl font-bold text-green-800 mb-2">
            {t('completion.title')}
          </h2>
          <p className="text-green-600 text-lg">
            {t('completion.description')}
          </p>
        </div>

        {/* Success Animation */}
        <div className="mb-6">
          <div className="w-full bg-green-200 rounded-full h-4 relative overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
            </div>
          </div>
          <p className="text-green-800 font-bold text-lg mt-2">{t('completion.progress')}</p>
        </div>

        {/* Call to Action */}
        <div className="mb-6">          <button
            onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
            className="btn btn-primary btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-none text-white shadow-lg"
          >
            {t('completion.buttons.readStory')}
          </button>
        </div>

        {/* Additional Options */}
        <div className="p-4 bg-white/60 rounded-lg border border-green-200">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">            <button
              onClick={() => router.push(`/${locale}/stories`)}
              className="btn btn-outline btn-sm border-green-500 text-green-700 hover:bg-green-500 hover:text-white"
            >
              {t('completion.buttons.myStories')}
            </button>
          </div>
        </div>

        {/* Celebration Message */}
        <div className="mt-6 p-4 bg-green-100 rounded-lg border border-green-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">✨</span>
            <div>              <p className="text-green-800 font-medium text-sm">
                {t('completion.celebration.title')}
              </p>
              <p className="text-green-700 text-sm">
                {t('completion.celebration.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show progress state when story is still being generated
  return (
    <div className="bg-gradient-to-br from-base-200 to-base-100 border-2 border-base-300 rounded-xl p-8 text-center">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t('progress.title')}
        </h2>
        <p className="text-base-content/70">
          {t('progress.description')}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-base-content">{t('progress.progressLabel')}</span>
          <span className="text-sm font-bold text-primary">{percentage}%</span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-4 relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-primary to-primary-focus h-4 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${percentage}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="mb-6 p-4 bg-base-100 rounded-lg border border-base-300">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-sm text-base-content/70">{t('progress.estimatedTimeLabel')}</p>
            <p className="text-lg font-bold text-primary">{estimatedTime}</p>
          </div>
        </div>
      </div>

      {/* Animated Message */}
      <div className="mb-6 min-h-[80px] flex items-center justify-center">
        <div className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="bg-base-100 rounded-lg p-4 border border-base-300 shadow-sm">
            <p className="text-base-content font-medium text-lg leading-relaxed">
              {currentMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Writing Animation */}
      <div className="flex justify-center items-center space-x-1 mb-6">
        <span className="text-2xl">✍️</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-base-content/70 ml-2 font-medium">{t('progress.creatingMagic')}</span>
      </div>

      {/* Current Step Info */}
      {progress.currentStep && (
        <div className="text-sm text-base-content/70">
          <p>{t('progress.currentlyLabel')} <span className="font-semibold">{t(`steps.${progress.currentStep}`) || progress.currentStep}</span></p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-neutral rounded-lg border border-neutral-focus">
        <div className="flex items-start space-x-2">
          <span className="text-xl">💡</span>
          <div className="text-left">
            <p className="text-neutral-content font-medium text-sm mb-1">{t('progress.tip.title')}</p>
            <p className="text-neutral-content/80 text-sm">
              {t('progress.tip.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
