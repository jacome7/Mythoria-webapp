'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle, FiVolume2, FiPlay, FiPause, FiSquare, FiArrowLeft, FiBook } from 'react-icons/fi';
import Image from 'next/image';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PublicStoryData {
  success: boolean;
  story: {
    storyId: string;
    title: string;
    authorName: string;
    synopsis?: string;
    audiobookUri?: Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }> | Record<string, string>;
    targetAudience?: string;
    graphicalStyle?: string;
    createdAt: string;
    hasAudio?: boolean;
    slug?: string;
  };
  chapters: Chapter[];
  accessLevel: 'public';
  error?: string;
}

export default function PublicListenPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('PublicStoryPage');
  const tCommon = useTranslations('common');
  const slug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicStoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!slug) return;

    const fetchPublicStory = async () => {
      try {
        console.log('[Public Listen Page] Fetching story for slug:', slug);
        const response = await fetch(`/api/p/${slug}`);
        console.log('[Public Listen Page] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Public Listen Page] Response error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Public Listen Page] Response data:', result);

        if (result.success) {
          setData(result);
          
          // Check if story has audio
          if (!result.story.hasAudio) {
            setError('This story does not have audio narration available.');
          }
          
          console.log('[Public Listen Page] Story loaded successfully');
        } else {
          console.error('[Public Listen Page] API returned error:', result.error);
          setError(result.error || 'Story not found');
        }
      } catch (err) {
        console.error('[Public Listen Page] Error fetching public story:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load story: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStory();
  }, [slug]);

  // Check if story has audiobook
  const hasAudiobook = () => {
    if (!data?.story?.audiobookUri) return false;
    if (Array.isArray(data.story.audiobookUri)) {
      return data.story.audiobookUri.length > 0;
    }
    if (typeof data.story.audiobookUri === 'object') {
      const audiobookData = data.story.audiobookUri as Record<string, unknown>;
      
      // Check for chapter_ keys first (Format 1)
      let chapterKeys = Object.keys(audiobookData).filter(key => key.startsWith('chapter_'));
      
      // If no chapter_ keys, check for numeric keys (Format 2)
      if (chapterKeys.length === 0) {
        chapterKeys = Object.keys(audiobookData).filter(key => /^\d+$/.test(key));
      }
      
      return chapterKeys.some(key => audiobookData[key] && typeof audiobookData[key] === 'string');
    }
    return false;
  };

  // Get audiobook chapters as array
  const getAudioChapters = () => {
    if (!data?.story?.audiobookUri || !data?.chapters) return [];
    
    if (Array.isArray(data.story.audiobookUri)) {
      return data.story.audiobookUri;
    }
    
    if (typeof data.story.audiobookUri === 'object') {
      const audiobookData = data.story.audiobookUri as Record<string, unknown>;
      const audioChapters = [];
      
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

      // Create a map of database chapters for easy lookup
      const dbChaptersMap = new Map();
      data.chapters.forEach(chapter => {
        dbChaptersMap.set(chapter.chapterNumber, chapter);
      });

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
        const dbChapter = dbChaptersMap.get(chapterNumber);
        
        if (audioUri && typeof audioUri === 'string') {
          audioChapters.push({
            chapterTitle: dbChapter?.title || `Chapter ${chapterNumber}`,
            audioUri: audioUri,
            duration: 0, // We don't have duration for object format
            imageUri: dbChapter?.imageUri || undefined
          });
        }
      }
      
      return audioChapters;
    }
    return [];
  };

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

      // Use the proxy API endpoint for secure access
      const proxyAudioUri = `/api/p/${slug}/audio/${chapterIndex}`;

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
          alert(tCommon('Errors.failedToLoadAudio'));
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
          alert(tCommon('Errors.audioPlaybackInteractionRequired'));
        } else if (error.name === 'NotSupportedError') {
          alert(tCommon('Errors.audioFormatNotSupported'));
        } else {
          alert(tCommon('Errors.failedToPlayAudio'));
        }
      } else {
        alert(tCommon('Errors.failedToPlayAudio'));
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

  const navigateBackToStory = () => {
    router.push(`/${locale}/p/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{t('loading.title')}</h2>
          <p className="text-gray-600">{t('loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">{t('errors.notFound')}</h2>
          <p className="text-gray-600">{error || t('errors.notFoundDesc')}</p>
          
          <div className="space-y-2">
            <button
              onClick={navigateBackToStory}
              className="btn btn-primary btn-sm"
            >
              {tCommon('Actions.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { story } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={navigateBackToStory}
                className="btn btn-ghost btn-sm"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{tCommon('Actions.backToStory')}</span>
                <span className="sm:hidden">Back</span>
              </button>
              
              <h1 className="text-xl font-semibold text-gray-900 text-center flex-1 mx-4">
                <FiVolume2 className="w-5 h-5 inline mr-2" />
                Listen to &ldquo;{story.title}&rdquo;
              </h1>
              
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {hasAudiobook() ? (
            <div className="space-y-4">
              {getAudioChapters().map((chapter, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
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
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FiBook className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Chapter Info */}
                    <div className="flex-grow text-center sm:text-left">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {index + 1}. {chapter.chapterTitle}
                      </h3>
                      {chapter.duration > 0 && (
                        <p className="text-sm text-gray-600">
                          Duration: {formatDuration(chapter.duration)}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {audioProgress[index] > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${audioProgress[index]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audio Controls */}
                    <div className="flex-shrink-0 flex gap-2 mx-auto sm:mx-0">
                      {audioLoading[index] ? (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <FiLoader className="animate-spin text-gray-400" />
                        </div>
                      ) : currentlyPlaying === index ? (
                        <>
                          <button
                            onClick={() => pauseAudio(index)}
                            className="btn btn-circle btn-primary btn-sm"
                            title="Pause"
                          >
                            <FiPause className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => stopAudio(index)}
                            className="btn btn-circle btn-outline btn-sm"
                            title="Stop"
                          >
                            <FiSquare className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => playAudio(index)}
                          className="btn btn-circle btn-primary btn-sm"
                          title="Play"
                        >
                          <FiPlay className="w-4 h-4 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Audio not available</h3>
              <p className="text-gray-600">
                This story does not have audio narration available yet.
              </p>
              <button
                onClick={navigateBackToStory}
                className="btn btn-primary mt-4"
              >
                Back to Story
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
