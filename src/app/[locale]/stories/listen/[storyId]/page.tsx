'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  FiBook,
  FiVolume2,
  FiEdit3,
  FiShare2,
  FiPlay,
  FiPause,
  FiSquare,
  FiArrowLeft,
  FiCreditCard,
  FiLoader,
  FiPrinter
} from 'react-icons/fi';
import { trackStoryManagement } from '../../../../../lib/analytics';
import ShareModal from '../../../../../components/ShareModal';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  htmlUri?: string;
  audiobookUri?: Array<{
    chapterTitle: string;
    audioUri: string;
    duration: number;
    imageUri?: string;
  }> | Record<string, string>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserCredits {
  currentBalance: number;
  creditHistory: Array<{
    id: string;
    amount: number;
    description: string;
    transactionType: string;
    createdAt: string;
    balanceAfter: number;
  }>;
}

interface AudiobookCost {
  credits: number;
  name: string;
  description: string;
}

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  voiceOptions: Array<{ value: string; label: string }>;
  tCommon: (key: string) => string;
}

function VoiceSelector({ selectedVoice, onVoiceChange, voiceOptions, tCommon }: VoiceSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-medium">{tCommon('voices.selectVoice')}</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
        >
          {voiceOptions.map((voice) => (
            <option key={voice.value} value={voice.value}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>
      
      {selectedVoice && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-sm">{tCommon(`voices.descriptions.${selectedVoice}`)}</span>
        </div>
      )}
    </div>
  );
}

export default function ListenStoryPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [audiobookCost, setAudiobookCost] = useState<AudiobookCost | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioGenerationProgress, setAudioGenerationProgress] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('coral');

  // Audio playback states (for when audio is available)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});

  // Voice options for narration
  const voiceOptions = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'ash', label: 'Ash' },
    { value: 'ballad', label: 'Ballad' },
    { value: 'coral', label: 'Coral' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'nova', label: 'Nova' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'sage', label: 'Sage' },
    { value: 'shimmer', label: 'Shimmer' },
    { value: 'verse', label: 'Verse' }
  ];  // Check if story has audiobook
  const hasAudiobook = () => {
    if (!story?.audiobookUri) return false;
    if (Array.isArray(story.audiobookUri)) {
      const result = story.audiobookUri.length > 0;
      console.log(`hasAudiobook: Array format, length=${story.audiobookUri.length}, result=${result}`);
      return result;
    }
    if (typeof story.audiobookUri === 'object') {
      const audiobookData = story.audiobookUri as Record<string, unknown>;
      
      // Check for chapter_ keys first (Format 1)
      let chapterKeys = Object.keys(audiobookData).filter(key => key.startsWith('chapter_'));
      
      // If no chapter_ keys, check for numeric keys (Format 2)
      if (chapterKeys.length === 0) {
        chapterKeys = Object.keys(audiobookData).filter(key => /^\d+$/.test(key));
      }
      
      const result = chapterKeys.some(key => audiobookData[key] && typeof audiobookData[key] === 'string');
      console.log(`hasAudiobook: Object format, chapterKeys=${chapterKeys}, result=${result}`);
      return result;
    }
    console.log('hasAudiobook: Unknown format');
    return false;
  };  // Get audiobook chapters as array
  const getAudioChapters = () => {
    if (!story?.audiobookUri) return [];
    if (Array.isArray(story.audiobookUri)) {
      return story.audiobookUri;
    }
    if (typeof story.audiobookUri === 'object') {
      // Handle both database formats:
      // Format 1: {"chapter_1": "url", "chapter_2": "url", ...}
      // Format 2: {"1": "url", "2": "url", "3": "url", ...}
      const audiobookData = story.audiobookUri as Record<string, unknown>;
      const chapters = [];
      
      // First, try to find chapter_ keys (Format 1)
      let chapterKeys = Object.keys(audiobookData)
        .filter(key => key.startsWith('chapter_'))
        .sort((a, b) => {
          const aNum = parseInt(a.replace('chapter_', ''));
          const bNum = parseInt(b.replace('chapter_', ''));
          return aNum - bNum;
        });

      // If no chapter_ keys found, try numeric keys (Format 2)
      if (chapterKeys.length === 0) {
        chapterKeys = Object.keys(audiobookData)
          .filter(key => /^\d+$/.test(key)) // Only numeric keys
          .sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
      }

      for (const chapterKey of chapterKeys) {
        let chapterNumber: number;
        
        if (chapterKey.startsWith('chapter_')) {
          // Format 1: chapter_1, chapter_2, etc.
          chapterNumber = parseInt(chapterKey.replace('chapter_', ''));
        } else {
          // Format 2: 1, 2, 3, etc.
          chapterNumber = parseInt(chapterKey);
        }
        
        const audioUri = audiobookData[chapterKey];
        
        if (audioUri && typeof audioUri === 'string') {
          chapters.push({
            chapterTitle: `Chapter ${chapterNumber}`,
            audioUri: audioUri,
            duration: 0, // We don't have duration for object format
            imageUri: undefined
          });
        }
      }
      
      return chapters;
    }
    return [];
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch story, user credits, and audiobook pricing in parallel
        const [storyResponse, creditsResponse, pricingResponse] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch('/api/my-credits'),
          fetch('/api/pricing')
        ]);
        
        // Handle story
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          if (storyData.story.status !== 'published') {
            setError(tCommon('Errors.storyNotAvailableYet'));
            return;
          }
          setStory(storyData.story);
        } else if (storyResponse.status === 404) {
          setError(tCommon('Errors.storyNotFoundGeneric'));
          return;
        } else if (storyResponse.status === 403) {
          setError(tCommon('Errors.noPermission'));
          return;
        } else {
          setError(tCommon('Errors.failedToLoad'));
          return;
        }

        // Handle credits
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setUserCredits(creditsData);
        }

        // Handle pricing
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          if (pricingData.success && pricingData.deliveryOptions?.audiobook) {
            setAudiobookCost(pricingData.deliveryOptions.audiobook);
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(tCommon('Errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchInitialData();
    }
  }, [storyId, tCommon]);

  // Poll for audiobook updates when generating
  useEffect(() => {
    if (!isGeneratingAudio) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.story.audiobookUri) {
            // Check if we now have audiobook
            const tempStory = data.story;
            if (Array.isArray(tempStory.audiobookUri) && tempStory.audiobookUri.length > 0) {
              setStory(tempStory);
              setIsGeneratingAudio(false);
              setAudioGenerationProgress('Audiobook generation completed!');
              clearInterval(pollInterval);
            } else if (typeof tempStory.audiobookUri === 'object' && Object.keys(tempStory.audiobookUri).length > 0) {
              setStory(tempStory);
              setIsGeneratingAudio(false);
              setAudioGenerationProgress('Audiobook generation completed!');
              clearInterval(pollInterval);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for audiobook updates:', error);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [isGeneratingAudio, storyId]);  const handleGenerateAudiobook = async () => {
    try {
      setIsGeneratingAudio(true);
      setAudioGenerationProgress('Starting audiobook generation...');
      
      const response = await fetch(`/api/stories/${storyId}/generate-audiobook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: selectedVoice
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAudioGenerationProgress('Audiobook generation started! The Mythoria elfs will take around 5 minutes to narrate all the story.');
        
        // Update user credits if provided
        if (result.newBalance !== undefined && userCredits) {
          setUserCredits(prev => prev ? { ...prev, currentBalance: result.newBalance } : prev);
        }
        
        // Start polling for updates
      } else {
        const errorData = await response.json();
        if (response.status === 402) {
          // Insufficient credits
          throw new Error(`You need ${errorData.shortfall} more credits to generate an audiobook.`);
        } else {
          throw new Error(errorData.error || 'Failed to start audiobook generation');
        }
      }
    } catch (error) {
      console.error('Error generating audiobook:', error);
      setIsGeneratingAudio(false);
      setAudioGenerationProgress('');
      
      if (error instanceof Error) {
        alert(`Failed to start audiobook generation: ${error.message}`);
      } else {
        alert('Failed to start audiobook generation. Please try again later.');
      }
    }
  };

  // Audio playbook functions (for when audio is available)
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const playAudio = async (chapterIndex: number) => {
    try {
      // Stop any currently playing audio
      if (currentlyPlaying !== null && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
        audioElements[currentlyPlaying].currentTime = 0;
      }

      setAudioLoading(prev => ({ ...prev, [chapterIndex]: true }));

      // Use the proxy API endpoint instead of direct Google Cloud Storage URL
      const proxyAudioUri = `/api/stories/${storyId}/audio/${chapterIndex}`;

      // Create new audio element if it doesn't exist
      if (!audioElements[chapterIndex]) {
        const audio = new Audio();
        audio.preload = 'metadata';

        audio.addEventListener('loadedmetadata', () => {
          setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));
        });

        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            setAudioProgress(prev => ({ ...prev, [chapterIndex]: progress }));
          }
        });

        audio.addEventListener('ended', () => {
          setCurrentlyPlaying(null);
          setAudioProgress(prev => ({ ...prev, [chapterIndex]: 0 }));
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));
          alert('Failed to load audio. Please check your internet connection and try again.');
        });

        setAudioElements(prev => ({ ...prev, [chapterIndex]: audio }));
        
        // Set the source and start playing
        audio.src = proxyAudioUri;
        await audio.play();
        setCurrentlyPlaying(chapterIndex);

        // Track story listening
        trackStoryManagement.listen({
          story_id: storyId,
          story_title: story?.title,
          chapter_number: chapterIndex + 1,
          total_chapters: getAudioChapters().length
        });
      } else {
        // Use existing audio element
        const audio = audioElements[chapterIndex];
        if (audio.src !== proxyAudioUri) {
          audio.src = proxyAudioUri;
        }
        await audio.play();
        setCurrentlyPlaying(chapterIndex);
        setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));

        // Track story listening (for existing audio elements)
        trackStoryManagement.listen({
          story_id: storyId,
          story_title: story?.title,
          chapter_number: chapterIndex + 1,
          total_chapters: getAudioChapters().length
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Audio playback requires user interaction. Please try clicking the play button again.');
        } else if (error.name === 'NotSupportedError') {
          alert('This audio format is not supported by your browser.');
        } else {
          alert('Failed to play audio. Please try again.');
        }
      } else {
        alert('Failed to play audio. Please try again.');
      }
    }
  };

  const pauseAudio = (chapterIndex: number) => {
    if (audioElements[chapterIndex]) {
      audioElements[chapterIndex].pause();
      setCurrentlyPlaying(null);
    }
  };

  const stopAudio = (chapterIndex: number) => {
    if (audioElements[chapterIndex]) {
      audioElements[chapterIndex].pause();
      audioElements[chapterIndex].currentTime = 0;
      setCurrentlyPlaying(null);
      setAudioProgress(prev => ({ ...prev, [chapterIndex]: 0 }));
    }
  };

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  const navigateToRead = () => {
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}`);
  };

  const navigateToPrint = () => {
    router.push(`/${locale}/stories/print/${storyId}`);
  };

  const navigateToPricing = () => {
    router.push(`/${locale}/pricing`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Access Restricted</h1>
            <p className="text-lg text-gray-600">
              You need to be signed in to listen to stories.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push(`/${locale}/sign-in`)}
                className="btn btn-primary"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push(`/${locale}/sign-up`)}
                className="btn btn-outline"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-6">
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={() => router.push(`/${locale}/my-stories`)}
                className="btn btn-primary"
              >
                Back to My Stories
              </button>
            </div>
          </div>
        ) : story ? (
          <div className="space-y-6">
            {/* Story Header */}
            <div className="container mx-auto px-4 py-6">
              <div className="text-center space-y-4">
                
                {/* Navigation Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={navigateToRead}
                    className="btn btn-outline btn-primary"
                  >
                    <FiBook className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Read</span>
                  </button>
                  <button className="btn btn-primary">
                    <FiVolume2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Listening</span>
                  </button>
                  <button
                    onClick={navigateToEdit}
                    className="btn btn-outline btn-primary"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Edit</span>
                  </button>
                  <button
                    onClick={navigateToPrint}
                    className="btn btn-outline btn-primary"
                  >
                    <FiPrinter className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Print</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="btn btn-outline btn-primary"
                  >
                    <FiShare2 className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Listening Content */}
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title text-2xl mb-6">
                      <FiVolume2 className="w-6 h-6 mr-2" />
                      Listen to &ldquo;{story.title}&rdquo;
                    </h2>                    {hasAudiobook() ? (
                      <div className="space-y-6">
                        {/* Audiobook Chapters */}
                        <div className="space-y-4">
                          {getAudioChapters().map((chapter, index) => (
                            <div key={index} className="card bg-base-200 shadow-md">
                              <div className="card-body p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                  {/* Chapter Image */}
                                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                                    {chapter.imageUri ? (
                                      <Image
                                        src={chapter.imageUri}
                                        alt={`Chapter ${index + 1} illustration`}
                                        className="w-16 h-16 object-cover rounded-lg"
                                        width={64}
                                        height={64}
                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-base-300 rounded-lg flex items-center justify-center">
                                        <FiBook className="w-6 h-6 text-base-content/50" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Chapter Info */}
                                  <div className="flex-grow text-center sm:text-left">
                                    <h3 className="font-semibold text-lg">
                                      {chapter.chapterTitle || `Chapter ${index + 1}`}
                                    </h3>
                                    {chapter.duration > 0 && (
                                      <p className="text-sm text-base-content/70">
                                        Duration: {formatDuration(chapter.duration)}
                                      </p>
                                    )}

                                    {/* Progress Bar */}
                                    {audioProgress[index] > 0 && (
                                      <div className="mt-2">
                                        <progress
                                          className="progress progress-primary w-full h-2"
                                          value={audioProgress[index]}
                                          max="100"
                                          aria-label={`Playback progress for ${chapter.chapterTitle || `Chapter ${index + 1}`}: ${Math.round(audioProgress[index])}%`}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Audio Controls */}
                                  <div className="flex-shrink-0 flex gap-2 mx-auto sm:mx-0">
                                    {audioLoading[index] ? (
                                      <span className="loading loading-spinner loading-sm"></span>
                                    ) : currentlyPlaying === index ? (
                                      <>
                                        <button
                                          onClick={() => pauseAudio(index)}
                                          className="btn btn-sm btn-circle btn-primary"
                                          title="Pause"
                                          aria-label={`Pause ${chapter.chapterTitle || `Chapter ${index + 1}`}`}
                                        >
                                          <FiPause className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => stopAudio(index)}
                                          className="btn btn-sm btn-circle btn-outline"
                                          title="Stop"
                                          aria-label={`Stop ${chapter.chapterTitle || `Chapter ${index + 1}`}`}
                                        >
                                          <FiSquare className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => playAudio(index)}
                                        className="btn btn-sm btn-circle btn-primary"
                                        title="Play"
                                        aria-label={`Play ${chapter.chapterTitle || `Chapter ${index + 1}`}`}
                                      >
                                        <FiPlay className="w-4 h-4 ml-0.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Re-narrate Section */}
                        <div className="divider"></div>
                        <div className="card bg-base-200 shadow-md">
                          <div className="card-body">
                            <div className="text-center space-y-4">
                              <h3 className="card-title text-lg mb-4 justify-center">
                                <FiVolume2 className="w-5 h-5 mr-2" />
                                Want a New Narration?
                              </h3>
                              <p className="text-base-content/70 mb-4">
                                You can generate a new narration of your story with different voice characteristics.
                              </p>
                              
                              {audiobookCost && userCredits && (
                                <div className="space-y-6 max-w-md mx-auto">
                                  {/* Voice Selection */}
                                  <VoiceSelector
                                    selectedVoice={selectedVoice}
                                    onVoiceChange={setSelectedVoice}
                                    voiceOptions={voiceOptions}
                                    tCommon={tCommon}
                                  />
                                  
                                  <div className="stats stats-horizontal shadow">
                                    <div className="stat">
                                      <div className="stat-title">Cost</div>
                                      <div className="stat-value text-lg">{audiobookCost.credits} credits</div>
                                    </div>
                                    <div className="stat">
                                      <div className="stat-title">Your Balance</div>
                                      <div className="stat-value text-lg">{userCredits.currentBalance} credits</div>
                                    </div>
                                  </div>
                                  
                                  {userCredits.currentBalance >= audiobookCost.credits ? (
                                    <div className="space-y-2">
                                      <button
                                        onClick={handleGenerateAudiobook}
                                        className="btn btn-secondary btn-wide"
                                        disabled={isGeneratingAudio}
                                      >
                                        <FiVolume2 className="w-4 h-4 mr-2" />
                                        Narrate Story Again
                                      </button>
                                      <p className="text-sm text-base-content/60">
                                        This will replace your current narration
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="alert alert-warning">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>You need {audiobookCost.credits - userCredits.currentBalance} more credits to generate a new narration.</span>
                                      </div>
                                      <button
                                        onClick={navigateToPricing}
                                        className="btn btn-secondary btn-wide"
                                      >
                                        <FiCreditCard className="w-4 h-4 mr-2" />
                                        Buy More Credits
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(!audiobookCost || !userCredits) && (
                                <div className="alert alert-info max-w-md mx-auto">
                                  <span className="loading loading-spinner loading-sm"></span>
                                  <span>Loading pricing information...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isGeneratingAudio ? (
                      <div className="text-center py-16">
                        <FiLoader className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
                        <h3 className="text-xl font-semibold mb-2">Generating Your Audiobook</h3>
                        <p className="text-base-content/70 mb-4">
                          {audioGenerationProgress}
                        </p>
                        <div className="max-w-md mx-auto">
                          <div className="alert alert-info">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span className="text-sm">We&apos;re checking for updates every 15 seconds. Please keep this page open.</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <FiVolume2 className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                        <h3 className="text-xl font-semibold mb-2">Convert Your Story</h3>
                        <p className="text-lg text-base-content/70 mb-6">
                          Convert your story into a beautifully narrated story with the help of Mythoria elfs
                        </p>
                        
                        {/* Show pricing and action */}
                        {audiobookCost && userCredits && (
                          <div className="max-w-md mx-auto space-y-6">
                            {/* Voice Selection */}
                            <VoiceSelector
                              selectedVoice={selectedVoice}
                              onVoiceChange={setSelectedVoice}
                              voiceOptions={voiceOptions}
                              tCommon={tCommon}
                            />
                            
                            <div className="card bg-base-200 shadow-md">
                              <div className="card-body p-4">
                                <h4 className="font-semibold">{audiobookCost.name}</h4>
                                <p className="text-sm text-base-content/70 mb-2">{audiobookCost.description}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold">{audiobookCost.credits} credits</span>
                                  <span className="text-sm text-base-content/60">
                                    You have: {userCredits.currentBalance} credits
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {userCredits.currentBalance >= audiobookCost.credits ? (
                              <button
                                onClick={handleGenerateAudiobook}
                                className="btn btn-primary btn-lg w-full"
                                disabled={isGeneratingAudio}
                              >
                                <FiVolume2 className="w-5 h-5 mr-2" />
                                Narrate Your Story
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="alert alert-warning">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span>You need {audiobookCost.credits - userCredits.currentBalance} more credits to generate an audiobook.</span>
                                </div>
                                <button
                                  onClick={navigateToPricing}
                                  className="btn btn-secondary btn-lg w-full"
                                >
                                  <FiCreditCard className="w-5 h-5 mr-2" />
                                  Buy More Credits
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {(!audiobookCost || !userCredits) && (
                          <div className="max-w-md mx-auto">
                            <div className="alert alert-info">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span>Loading pricing information...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Stories Button */}
            <div className="container mx-auto px-4 pb-8">
              <div className="text-center">
                <button
                  onClick={() => router.push(`/${locale}/my-stories`)}
                  className="btn btn-outline"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Stories
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SignedIn>

      {/* Share Modal */}
      {story && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          storyId={story.storyId}
          storyTitle={story.title}
          onShareSuccess={(shareData) => {
            console.log('Share successful:', shareData);
          }}
        />
      )}
    </div>
  );
}
