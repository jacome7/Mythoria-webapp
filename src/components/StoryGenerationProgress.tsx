'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
const getFunnyMessage = (
  step: string,
  t: ReturnType<typeof import('next-intl').useTranslations>,
) => {
  const messages = t.raw(`funnyMessages.${step}`) || t.raw('funnyMessages.default');
  return messages[Math.floor(Math.random() * messages.length)];
};

const calculateEstimatedTime = (
  percentage: number,
  t: ReturnType<typeof import('next-intl').useTranslations>,
): string => {
  const totalEstimatedTime = 14 * 60; // 14 minutes in seconds
  const remainingTime = Math.max(0, totalEstimatedTime - (totalEstimatedTime * percentage) / 100);

  if (remainingTime < 60) {
    const value = Math.ceil(remainingTime);
    const unit = value === 1 ? t('timeUnits.second') : t('timeUnits.seconds');
    return `${value} ${unit}`;
  }

  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.ceil(remainingTime % 60);
  const minuteLabel = minutes === 1 ? t('timeUnits.minute') : t('timeUnits.minutes');

  return seconds > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')} ${minuteLabel}`
    : `${minutes} ${minuteLabel}`;
};

export default function StoryGenerationProgress({
  storyId,
  onComplete,
}: StoryGenerationProgressProps) {
  const tCommonStoryGenerationProgress = useTranslations('StoryGenerationProgress');
  const router = useRouter();
  const params = useParams() as { locale?: string } | null;
  const locale = params?.locale && typeof params.locale === 'string' ? params.locale : 'en-US';

  const [progress, setProgress] = useState<StoryProgress>({
    storyGenerationCompletedPercentage: 0,
    storyGenerationStatus: 'running',
    status: 'writing',
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
        setCurrentMessage(
          getFunnyMessage(
            progress.currentStep || 'generate_outline',
            tCommonStoryGenerationProgress,
          ),
        );
        setIsAnimating(false);
      }, 300);
    };

    // Initial message
    updateMessage();

    // Update message every 8 seconds
    const messageInterval = setInterval(updateMessage, 8000);
    return () => clearInterval(messageInterval);
  }, [progress.currentStep, progress.status, tCommonStoryGenerationProgress]); // Poll for progress updates
  useEffect(() => {
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
            currentStep: story.currentStep,
          }); // If completed, call onComplete callback
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
  const estimatedTime = calculateEstimatedTime(percentage, tCommonStoryGenerationProgress);
  const isCompleted = progress.status === 'published';

  // Show completion state when story is published
  if (isCompleted) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#d9b86c]/50 bg-[#fff9ec] p-5 text-center shadow-lg sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-[#e9cb82]/25"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-[#72aaa6]/15"
        />

        <div className="relative">
          <div className="mx-auto mb-5 w-fit rounded-[2rem] border border-primary/15 bg-white p-2 shadow-sm">
            <Image
              src="/Papercut_icons/fa-wand-magic-sparkles.webp"
              alt=""
              width={144}
              height={144}
              className="h-28 w-28 rounded-3xl object-contain sm:h-32 sm:w-32"
              priority
            />
          </div>

          <h2 className="mb-2 text-3xl font-bold text-primary">
            {tCommonStoryGenerationProgress('completion.title')}
          </h2>
          <p className="mx-auto max-w-xl text-base-content/70 sm:text-lg">
            {tCommonStoryGenerationProgress('completion.description')}
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
              className="btn btn-primary btn-lg min-h-12 whitespace-nowrap border-none shadow-md sm:min-w-48"
            >
              {tCommonStoryGenerationProgress('completion.buttons.readStory')}
            </button>
            <button
              onClick={() => router.push(`/${locale}/stories`)}
              className="btn btn-outline min-h-12 whitespace-nowrap border-primary/40 text-primary hover:border-primary hover:bg-primary hover:text-primary-content"
            >
              {tCommonStoryGenerationProgress('completion.buttons.myStories')}
            </button>
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
          {tCommonStoryGenerationProgress('progress.title')}
        </h2>
        <p className="text-base-content/70">
          {tCommonStoryGenerationProgress('progress.description')}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-base-content">
            {tCommonStoryGenerationProgress('progress.progressLabel')}
          </span>
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
            <p className="text-sm text-base-content/70">
              {tCommonStoryGenerationProgress('progress.estimatedTimeLabel')}
            </p>
            <p className="text-lg font-bold text-primary">{estimatedTime}</p>
          </div>
        </div>
      </div>

      {/* Animated Message */}
      <div className="mb-6 min-h-[80px] flex items-center justify-center">
        <div
          className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        >
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
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          ></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
        <span className="text-base-content/70 ml-2 font-medium">
          {tCommonStoryGenerationProgress('progress.creatingMagic')}
        </span>
      </div>

      {/* Current Step Info */}
      {progress.currentStep && (
        <div className="text-sm text-base-content/70">
          <p>
            {tCommonStoryGenerationProgress('progress.currentlyLabel')}{' '}
            <span className="font-semibold">
              {tCommonStoryGenerationProgress(`steps.${progress.currentStep}`) ||
                progress.currentStep}
            </span>
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-neutral rounded-lg border border-neutral-focus">
        <div className="flex items-start space-x-2">
          <span className="text-xl">💡</span>
          <div className="text-left">
            <p className="text-neutral-content font-medium text-sm mb-1">
              {tCommonStoryGenerationProgress('progress.tip.title')}
            </p>
            <p className="text-neutral-content/80 text-sm">
              {tCommonStoryGenerationProgress('progress.tip.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
