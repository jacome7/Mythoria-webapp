import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { trackStoryManagement } from '@/lib/analytics';
import { AudioPlayerState, AudioPlayerActions, AudioPlayerHookProps } from './types';

export function useAudioPlayer({ 
  audioEndpoint, 
  onError, 
  trackingData 
}: AudioPlayerHookProps): AudioPlayerState & AudioPlayerActions {
  const tCommon = useTranslations('common');

  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});

  const playAudio = useCallback(async (chapterIndex: number) => {
    try {
      // Stop any currently playing audio
      if (currentlyPlaying !== null && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
        audioElements[currentlyPlaying].currentTime = 0;
      }

      setAudioLoading(prev => ({ ...prev, [chapterIndex]: true }));

      // Use the provided audio endpoint
      const proxyAudioUri = `${audioEndpoint}/${chapterIndex}`;

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
          const errorMessage = tCommon('Errors.failedToLoadAudio');
          if (onError) {
            onError(errorMessage);
          } else {
            alert(errorMessage);
          }
        });

        setAudioElements(prev => ({ ...prev, [chapterIndex]: audio }));
        
        // Set the source and start playing
        audio.src = proxyAudioUri;
        await audio.play();
        setCurrentlyPlaying(chapterIndex);

        // Track story listening if tracking data is provided
        if (trackingData?.story_id) {
          trackStoryManagement.listen({
            story_id: trackingData.story_id,
            story_title: trackingData.story_title,
            chapter_number: chapterIndex + 1,
            total_chapters: trackingData.total_chapters || 0
          });
        }
      } else {
        // Use existing audio element
        const audio = audioElements[chapterIndex];
        if (audio.src !== proxyAudioUri) {
          audio.src = proxyAudioUri;
        }
        await audio.play();
        setCurrentlyPlaying(chapterIndex);
        setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));

        // Track story listening if tracking data is provided
        if (trackingData?.story_id) {
          trackStoryManagement.listen({
            story_id: trackingData.story_id,
            story_title: trackingData.story_title,
            chapter_number: chapterIndex + 1,
            total_chapters: trackingData.total_chapters || 0
          });
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioLoading(prev => ({ ...prev, [chapterIndex]: false }));

      let errorMessage: string;
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = tCommon('Errors.audioPlaybackInteractionRequired');
        } else if (error.name === 'NotSupportedError') {
          errorMessage = tCommon('Errors.audioFormatNotSupported');
        } else {
          errorMessage = tCommon('Errors.failedToPlayAudio');
        }
      } else {
        errorMessage = tCommon('Errors.failedToPlayAudio');
      }

      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    }
  }, [currentlyPlaying, audioElements, audioEndpoint, tCommon, onError, trackingData]);

  const pauseAudio = useCallback((chapterIndex: number) => {
    if (audioElements[chapterIndex]) {
      audioElements[chapterIndex].pause();
      setCurrentlyPlaying(null);
    }
  }, [audioElements]);

  const stopAudio = useCallback((chapterIndex: number) => {
    if (audioElements[chapterIndex]) {
      audioElements[chapterIndex].pause();
      audioElements[chapterIndex].currentTime = 0;
      setCurrentlyPlaying(null);
      setAudioProgress(prev => ({ ...prev, [chapterIndex]: 0 }));
    }
  }, [audioElements]);

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  return {
    currentlyPlaying,
    audioElements,
    audioProgress,
    audioLoading,
    playAudio,
    pauseAudio,
    stopAudio,
  };
}
