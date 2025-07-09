'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiPlay, FiPause, FiVolume2, FiLoader } from 'react-icons/fi';

interface AudioChapter {
  chapterTitle: string;
  audioUri: string;
  duration?: number;
  imageUri?: string;
}

interface StoryAudioPlayerProps {
  audiobookUri: Array<AudioChapter> | Record<string, string>;
  storyId: string;
  storyTitle: string;
  isPublic?: boolean;
}

export default function StoryAudioPlayer({ 
  audiobookUri, 
  storyId, 
  storyTitle, 
  isPublic = false 
}: StoryAudioPlayerProps) {
  const t = useTranslations('common.Components.StoryAudioPlayer');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert audiobookUri to chapters array
  const getAudioChapters = (): AudioChapter[] => {
    if (!audiobookUri) return [];
    
    if (Array.isArray(audiobookUri)) {
      return audiobookUri;
    }
    
    if (typeof audiobookUri === 'object') {
      const audiobookData = audiobookUri as Record<string, unknown>;
      const chapters: AudioChapter[] = [];
      
      // Try chapter_ keys first
      let chapterKeys = Object.keys(audiobookData)
        .filter(key => key.startsWith('chapter_'))
        .sort((a, b) => {
          const aNum = parseInt(a.replace('chapter_', ''));
          const bNum = parseInt(b.replace('chapter_', ''));
          return aNum - bNum;
        });

      // If no chapter_ keys, try numeric keys
      if (chapterKeys.length === 0) {
        chapterKeys = Object.keys(audiobookData)
          .filter(key => /^\d+$/.test(key))
          .sort((a, b) => parseInt(a) - parseInt(b));
      }

      for (const chapterKey of chapterKeys) {
        let chapterNumber: number;
        
        if (chapterKey.startsWith('chapter_')) {
          chapterNumber = parseInt(chapterKey.replace('chapter_', ''));
        } else {
          chapterNumber = parseInt(chapterKey);
        }
        
        const audioUri = audiobookData[chapterKey];
        
        if (audioUri && typeof audioUri === 'string') {
          chapters.push({
            chapterTitle: `Chapter ${chapterNumber}`,
            audioUri: audioUri,
            duration: 0
          });
        }
      }
      
      return chapters;
    }
    
    return [];
  };

  const chapters = getAudioChapters();
  const hasAudio = chapters.length > 0;

  const playAudio = async (chapterIndex: number) => {
    try {
      // Stop any currently playing audio
      if (currentlyPlaying !== null && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
        audioElements[currentlyPlaying].currentTime = 0;
      }

      setAudioLoading(prev => ({ ...prev, [chapterIndex]: true }));

      // Use appropriate API endpoint based on whether it's public or private
      const audioApiUri = isPublic 
        ? `/api/public/${storyId}/audio/${chapterIndex}`
        : `/api/stories/${storyId}/audio/${chapterIndex}`;

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
          alert(t('errors.audioLoadFailed'));
        });

        setAudioElements(prev => ({ ...prev, [chapterIndex]: audio }));
        
        audio.src = audioApiUri;
        await audio.play();
        setCurrentlyPlaying(chapterIndex);
      } else {
        const audio = audioElements[chapterIndex];
        if (audio.src !== audioApiUri) {
          audio.src = audioApiUri;
        }
        await audio.play();
        setCurrentlyPlaying(chapterIndex);
        setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert(t('errors.audioPlaybackError'));
      } else {
        alert(t('errors.audioPlaybackError'));
      }
    }
  };

  const pauseAudio = (chapterIndex: number) => {
    if (audioElements[chapterIndex]) {
      audioElements[chapterIndex].pause();
      setCurrentlyPlaying(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!hasAudio) {
    return null;
  }

  return (
    <div className="story-audio-player">
      {/* Compact audio button for header */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-primary btn-sm flex items-center gap-2"
          title={`Listen to "${storyTitle}"`}
        >
          <FiVolume2 className="w-4 h-4" />
          <span className="hidden sm:inline">Listen</span>
        </button>
      </div>

      {/* Expanded audio player */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiVolume2 className="w-5 h-5" />
                  Listen to &ldquo;{storyTitle}&rdquo;
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {chapters.map((chapter, index) => (
                  <div key={index} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-grow">
                          <h4 className="font-medium">
                            {chapter.chapterTitle || `Chapter ${index + 1}`}
                          </h4>
                          {chapter.duration && chapter.duration > 0 && (
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
                              />
                            </div>
                          )}
                        </div>

                        {/* Audio Controls */}
                        <div className="flex gap-2">
                          {audioLoading[index] ? (
                            <div className="btn btn-sm btn-circle btn-primary">
                              <FiLoader className="w-4 h-4 animate-spin" />
                            </div>
                          ) : currentlyPlaying === index ? (
                            <button
                              onClick={() => pauseAudio(index)}
                              className="btn btn-sm btn-circle btn-primary"
                            >
                              <FiPause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => playAudio(index)}
                              className="btn btn-sm btn-circle btn-primary"
                            >
                              <FiPlay className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
