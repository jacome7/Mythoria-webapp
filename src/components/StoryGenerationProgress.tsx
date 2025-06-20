'use client';

import { useState, useEffect } from 'react';
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

// Story generation steps with approximate durations (in seconds)
const STEP_INFO = {
  'generate_outline': { name: 'Crafting your story outline', duration: 15 },
  'write_chapters': { name: 'Writing magical chapters', duration: 25 },
  'generate_front_cover': { name: 'Designing the front cover', duration: 60 },
  'generate_back_cover': { name: 'Creating the back cover', duration: 60 },
  'generate_images': { name: 'Painting beautiful illustrations', duration: 30 },
  'assemble': { name: 'Binding your story together', duration: 10 },
  'generate_audiobook': { name: 'Recording your audiobook', duration: 20 },
  'done': { name: 'Finishing touches', duration: 1 }
};

// Funny Oompa-Loompa messages based on current step
const getFunnyMessage = (step: string) => {
  const messages = {
    'generate_outline': [
      "🍫 Our Oompa-Loompas are sketching your story blueprint on chocolate paper!",
      "📋 The writing elves are mapping out your adventure with enchanted quills!",
      "✨ Story architects are designing the perfect plot structure!"
    ],
    'write_chapters': [
      "📖 Oompa-Loompas are furiously typing on their tiny typewriters!",
      "✍️ Our literary elves are weaving your tale with golden threads!",
      "🎭 Story scribes are bringing your characters to life with magic ink!",
      "📚 Chapter wizards are crafting each page with literary spells!"
    ],
    'generate_front_cover': [
      "🎨 Our artistic Oompa-Loompas are mixing magical paint for your cover!",
      "🖌️ Master illustrators are sketching your cover with rainbow brushes!",
      "🌟 Cover designers are sprinkling stardust on your book's face!"
    ],
    'generate_back_cover': [
      "🎭 Back-cover poets are writing mysterious blurbs with invisible ink!",
      "📖 Our synopsis scribes are crafting the perfect teaser!",
      "✨ Cover completion elves are adding the final magical touches!"
    ],
    'generate_images': [
      "🖼️ Illustration Oompa-Loompas are painting each scene with emotion!",
      "🎨 Picture wizards are bringing your characters to colorful life!",
      "🌈 Art fairies are adding magical details to every illustration!",
      "🖌️ Visual storytellers are creating windows into your world!"
    ],
    'assemble': [
      "📚 Book binding Oompa-Loompas are stitching everything together!",
      "🔧 Assembly elves are making sure every page is perfect!",
      "📋 Quality control wizards are checking every magical detail!"
    ],
    'generate_audiobook': [
      "🎤 Voice acting Oompa-Loompas are narrating your story!",
      "🎵 Audio wizards are adding the perfect storytelling rhythm!",
      "🎧 Sound engineers are polishing every magical word!"
    ],
    'done': [
      "🎉 Ta-da! Your magical story is ready for its grand adventure!",
      "✨ All done! The Oompa-Loompas are taking a well-deserved cocoa break!",
      "🏆 Mission accomplished! Your story is complete and ready to enchant!"
    ]
  };

  const stepMessages = messages[step as keyof typeof messages] || [
    "⚡ Our magical Oompa-Loompas are working their creative wonders!"
  ];
  
  return stepMessages[Math.floor(Math.random() * stepMessages.length)];
};

const calculateEstimatedTime = (percentage: number): string => {
  const totalEstimatedTime = 14 * 60; // 14 minutes in seconds
  const remainingTime = Math.max(0, totalEstimatedTime - (totalEstimatedTime * percentage / 100));
  
  if (remainingTime < 60) {
    return `${Math.ceil(remainingTime)} seconds`;
  } else {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.ceil(remainingTime % 60);
    return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')} minutes` : `${minutes} minutes`;
  }
};

export default function StoryGenerationProgress({ storyId, onComplete }: StoryGenerationProgressProps) {
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
        setCurrentMessage(getFunnyMessage(progress.currentStep || 'generate_outline'));
        setIsAnimating(false);
      }, 300);
    };

    // Initial message
    updateMessage();

    // Update message every 8 seconds
    const messageInterval = setInterval(updateMessage, 8000);

    return () => clearInterval(messageInterval);
  }, [progress.currentStep, progress.status]);// Poll for progress updates
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
  const estimatedTime = calculateEstimatedTime(percentage);
  const isCompleted = progress.status === 'published';

  // Show completion state when story is published
  if (isCompleted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center">
        {/* Completion Header */}
        <div className="mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-800 mb-2">
            Your Story is Ready!
          </h2>
          <p className="text-green-600 text-lg">
            Congratulations! Your magical story has been created and is ready to be read.
          </p>
        </div>

        {/* Success Animation */}
        <div className="mb-6">
          <div className="w-full bg-green-200 rounded-full h-4 relative overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
            </div>
          </div>
          <p className="text-green-800 font-bold text-lg mt-2">100% Complete!</p>
        </div>

        {/* Call to Action */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
            className="btn btn-primary btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-none text-white shadow-lg"
          >
            📖 Read Your Story Now
          </button>
        </div>

        {/* Additional Options */}
        <div className="p-4 bg-white/60 rounded-lg border border-green-200">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push(`/${locale}/stories`)}
              className="btn btn-outline btn-sm border-green-500 text-green-700 hover:bg-green-500 hover:text-white"
            >
              📚 My Stories
            </button>
            <button
              onClick={() => router.push(`/${locale}/stories/actions/${storyId}`)}
              className="btn btn-outline btn-sm border-green-500 text-green-700 hover:bg-green-500 hover:text-white"
            >
              🎧 More Options
            </button>
          </div>
        </div>

        {/* Celebration Message */}
        <div className="mt-6 p-4 bg-green-100 rounded-lg border border-green-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">✨</span>
            <div>
              <p className="text-green-800 font-medium text-sm">
                Your story is now part of the Mythoria collection!
              </p>
              <p className="text-green-700 text-sm">
                Share it with friends or create another magical adventure.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show progress state when story is still being generated
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-8 text-center">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-purple-800 mb-2">
          🏭 Story Factory in Action!
        </h2>
        <p className="text-purple-600">
          Your story will be ready in up to 14 minutes
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-purple-700">Progress</span>
          <span className="text-sm font-bold text-purple-900">{percentage}%</span>
        </div>
        <div className="w-full bg-purple-200 rounded-full h-4 relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${percentage}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="mb-6 p-4 bg-white/60 rounded-lg border border-purple-200">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-sm text-purple-600">Estimated time remaining</p>
            <p className="text-lg font-bold text-purple-900">{estimatedTime}</p>
          </div>
        </div>
      </div>

      {/* Animated Message */}
      <div className="mb-6 min-h-[80px] flex items-center justify-center">
        <div className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="bg-white/80 rounded-lg p-4 border border-purple-200 shadow-sm">
            <p className="text-purple-800 font-medium text-lg leading-relaxed">
              {currentMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Writing Animation */}
      <div className="flex justify-center items-center space-x-1 mb-6">
        <span className="text-2xl">✍️</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-purple-600 ml-2 font-medium">Creating magic...</span>
      </div>

      {/* Current Step Info */}
      {progress.currentStep && (
        <div className="text-sm text-purple-600">
          <p>Currently: <span className="font-semibold">{STEP_INFO[progress.currentStep as keyof typeof STEP_INFO]?.name || progress.currentStep}</span></p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <span className="text-xl">💡</span>
          <div className="text-left">
            <p className="text-blue-800 font-medium text-sm mb-1">Pro tip!</p>            <p className="text-blue-700 text-sm">
              While you wait, you can visit &ldquo;My Stories&rdquo; to track progress in real-time or start creating another story!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
