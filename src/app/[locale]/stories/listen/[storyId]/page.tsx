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
  FiArrowLeft
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
  }>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
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

  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();          // Only allow access to published stories
          if (data.story.status !== 'published') {
            setError(tCommon('Errors.storyNotAvailableYet'));
            return;
          }
          setStory(data.story);        } else if (response.status === 404) {
          setError(tCommon('Errors.storyNotFoundGeneric'));
        } else if (response.status === 403) {
          setError(tCommon('Errors.noPermission'));
        } else {
          setError(tCommon('Errors.failedToLoad'));
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setError(tCommon('Errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchStory();
    }
  }, [storyId, tCommon]);

  // Audio playback functions
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

        setAudioElements(prev => ({ ...prev, [chapterIndex]: audio }));        // Set the source and start playing
        audio.src = proxyAudioUri;
        await audio.play();
        setCurrentlyPlaying(chapterIndex);

        // Track story listening
        trackStoryManagement.listen({
          story_id: storyId,
          story_title: story?.title,
          chapter_number: chapterIndex + 1,
          total_chapters: story?.audiobookUri?.length
        });
      } else {
        // Use existing audio element
        const audio = audioElements[chapterIndex];
        if (audio.src !== proxyAudioUri) {
          audio.src = proxyAudioUri;
        } await audio.play();
        setCurrentlyPlaying(chapterIndex);
        setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));

        // Track story listening (for existing audio elements)
        trackStoryManagement.listen({
          story_id: storyId,
          story_title: story?.title,
          chapter_number: chapterIndex + 1,
          total_chapters: story?.audiobookUri?.length
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
          <div className="space-y-6">            {/* Story Header */}
            <div className="container mx-auto px-4 py-6">
              <div className="text-center space-y-4">
                {/* Navigation Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={navigateToRead}
                    className="btn btn-outline btn-primary"
                  >
                    <FiBook className="w-4 h-4 mr-2" />
                    Read
                  </button>
                  <button className="btn btn-primary">
                    <FiVolume2 className="w-4 h-4 mr-2" />
                    Listening
                  </button>
                  <button
                    onClick={navigateToEdit}
                    className="btn btn-outline btn-primary"
                  >
                    <FiEdit3 className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="btn btn-outline btn-primary"
                  >
                    <FiShare2 className="w-4 h-4 mr-2" />
                    Share
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
                    </h2>

                    {story.audiobookUri && story.audiobookUri.length > 0 ? (
                      <div className="space-y-4">
                        {story.audiobookUri.map((chapter, index) => (
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
                                  <p className="text-sm text-base-content/70">
                                    Duration: {formatDuration(chapter.duration)}
                                  </p>

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
                    ) : (
                      <div className="text-center py-16">
                        <FiVolume2 className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                        <p className="text-lg text-base-content/70 mb-2">
                          Audio version not available
                        </p>
                        <p className="text-sm text-base-content/50">
                          This story doesn&apos;t have an audiobook version yet.
                        </p>
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
