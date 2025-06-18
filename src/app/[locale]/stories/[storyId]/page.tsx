'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { 
  FiBook, 
  FiVolume2, 
  FiPrinter, 
  FiShare2, 
  FiEdit3,
  FiPlay,
  FiPause,
  FiSquare 
} from 'react-icons/fi';
import StoryReader from '../../../../components/StoryReader';
import StoryRating from '../../../../components/StoryRating';
import ShareModal from '../../../../components/ShareModal';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  htmlUri?: string;
  audiobookUri?: Array<{
    chapterTitle: string;
    audioUri: string;
    duration: number; // in seconds
    imageUri?: string;
  }>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

export default function StoryReadingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);  const [error, setError] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<'read' | 'listen' | 'print' | 'share' | 'edit'>('read');
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          // Only allow access to published stories
          if (data.story.status !== 'published') {
            setError('This story is not available for reading yet.');
            return;
          }
          setStory(data.story);
          
          // Use the HTML content from the API response
          if (data.htmlContent) {
            setStoryContent(data.htmlContent);
          } else if (data.story.htmlUri) {
            // Fallback message if content couldn't be fetched
            setStoryContent('<p>Story content is being prepared. Please check back later.</p>');
          } else {
            setStoryContent('<p>Story content is not yet available. The story may still be generating.</p>');
          }
        } else if (response.status === 404) {
          setError('Story not found.');
        } else if (response.status === 403) {
          setError('You do not have permission to read this story.');
        } else {
          setError('Failed to load the story. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setError('Failed to load the story. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchStory();
    }
  }, [storyId]);

  // Audio playback functions
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };  const playAudio = async (chapterIndex: number) => {
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
        // No need for crossOrigin since we're serving from same domain
        
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
      } else {
        // Use existing audio element
        const audio = audioElements[chapterIndex];
        if (audio.src !== proxyAudioUri) {
          audio.src = proxyAudioUri;
        }
        await audio.play();
        setCurrentlyPlaying(chapterIndex);
        setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));
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
    };  }, [audioElements]);

  const handleButtonClick = (button: 'read' | 'listen' | 'print' | 'share' | 'edit') => {
    setActiveButton(button);
    
    if (button === 'share') {
      setShowShareModal(true);
      return;
    }
    
    // Stop any playing audio when switching away from listen mode
    if (button !== 'listen' && currentlyPlaying !== null) {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
      });
      setCurrentlyPlaying(null);
    }
    
    // For now, only 'read' and 'listen' are implemented, others are dummies
    switch (button) {
      case 'read':
        // Already showing the reading view
        break;
      case 'listen':
        // Audio listening functionality is now implemented
        break;
      case 'print':
        // TODO: Implement print functionality
        console.log('Print functionality not implemented yet');
        break;
      case 'edit':
        // TODO: Navigate to edit page
        console.log('Edit functionality not implemented yet');
        break;
    }
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
              You need to be signed in to read stories.
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
                <h1 className="text-4xl font-bold text-primary">{story.title}</h1>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => handleButtonClick('read')}
                    className={`btn ${activeButton === 'read' ? 'btn-primary' : 'btn-outline btn-primary'}`}
                  >
                    <FiBook className="w-4 h-4 mr-2" />
                    Read
                  </button>
                  <button
                    onClick={() => handleButtonClick('listen')}
                    className={`btn ${activeButton === 'listen' ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    disabled={!story?.audiobookUri || story.audiobookUri.length === 0}
                  >
                    <FiVolume2 className="w-4 h-4 mr-2" />
                    Listen
                  </button>
                  <button
                    onClick={() => handleButtonClick('print')}
                    className={`btn ${activeButton === 'print' ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    disabled
                  >
                    <FiPrinter className="w-4 h-4 mr-2" />
                    Print
                  </button>
                  <button
                    onClick={() => handleButtonClick('share')}
                    className={`btn ${activeButton === 'share' ? 'btn-primary' : 'btn-outline btn-primary'}`}
                  >
                    <FiShare2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                  <button
                    onClick={() => handleButtonClick('edit')}
                    className={`btn ${activeButton === 'edit' ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    disabled
                  >
                    <FiEdit3 className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
            
            {/* Story Content */}
            {activeButton === 'read' && (
              <div>
                <StoryReader 
                  storyContent={storyContent || ''}
                  storyMetadata={{
                    targetAudience: story.targetAudience,
                    graphicalStyle: story.graphicalStyle,
                    title: story.title
                  }}
                />
                
                {/* Story Rating Component */}
                <div className="container mx-auto px-4 py-8">
                  <div className="max-w-2xl mx-auto">
                    <StoryRating 
                      storyId={storyId}
                      onRatingSubmitted={(rating) => {
                        console.log('Rating submitted:', rating);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Audio Listening Content */}
            {activeButton === 'listen' && (
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                      <h2 className="card-title text-2xl mb-6">
                        <FiVolume2 className="w-6 h-6 mr-2" />
                        Listen to &ldquo;{story.title}&rdquo;
                      </h2>
                      
                      {story.audiobookUri && story.audiobookUri.length > 0 ? (                        <div className="space-y-4">
                          {story.audiobookUri.map((chapter, index) => (
                            <div key={index} className="card bg-base-200 shadow-md">
                              <div className="card-body p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                  {/* Chapter Image */}
                                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                                    {chapter.imageUri ? (                                      <Image
                                        src={chapter.imageUri}
                                        alt={`Chapter ${index + 1} illustration`}
                                        className="w-16 h-16 object-cover rounded-lg"
                                        width={64}
                                        height={64}                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
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
                                    ) : (                                      <button
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
                          </p>                          <p className="text-sm text-base-content/50">
                            This story doesn&apos;t have an audiobook version yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other button content */}
            {activeButton !== 'read' && activeButton !== 'listen' && (
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                      <div className="text-center py-16">
                        <p className="text-lg text-base-content/70">
                          {activeButton.charAt(0).toUpperCase() + activeButton.slice(1)} functionality will be available soon.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Back to Stories Button */}
            <div className="container mx-auto px-4 pb-8">
              <div className="text-center">
                <button 
                  onClick={() => router.push(`/${locale}/my-stories`)}
                  className="btn btn-outline"
                >
                  ← Back to My Stories
                </button>
              </div>            </div>
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
            // You can add additional success handling here
          }}
        />
      )}
    </div>
  );
}
