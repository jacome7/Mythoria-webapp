import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { trackStoryManagement } from '@/lib/analytics';
import { AudioPlayerState, AudioPlayerActions, AudioPlayerHookProps } from './types';

export function useAudioPlayer({
  audioEndpoint,
  onError,
  trackingData,
  totalChapters,
}: AudioPlayerHookProps): AudioPlayerState & AudioPlayerActions {
  const tErrors = useTranslations('Errors');

  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: number]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: number]: boolean }>({});
  const [audioDurations, setAudioDurations] = useState<{ [key: number]: number }>({});
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  // Refs to always-current state for event handlers (auto-advance logic)
  const audioElementsRef = useRef<{ [key: number]: HTMLAudioElement }>({});
  const totalChaptersRef = useRef<number>(totalChapters ?? trackingData?.total_chapters ?? 0);
  const playAudioRef = useRef<(i: number) => Promise<void>>(async () => {});
  const playbackSpeedRef = useRef(playbackSpeed);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    totalChaptersRef.current = totalChapters ?? trackingData?.total_chapters ?? 0;
  }, [totalChapters, trackingData]);

  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      setPlaybackSpeedState(speed);
      if (currentlyPlaying !== null && audioElementsRef.current[currentlyPlaying]) {
        audioElementsRef.current[currentlyPlaying].playbackRate = speed;
      }
    },
    [currentlyPlaying],
  );

  const seekAudio = useCallback((chapterIndex: number, time: number) => {
    if (audioElementsRef.current[chapterIndex]) {
      audioElementsRef.current[chapterIndex].currentTime = time;
    }
  }, []);

  const skipForward = useCallback((chapterIndex: number, seconds: number) => {
    if (audioElementsRef.current[chapterIndex]) {
      const audio = audioElementsRef.current[chapterIndex];
      audio.currentTime = Math.min(audio.currentTime + seconds, audio.duration);
    }
  }, []);

  const skipBackward = useCallback((chapterIndex: number, seconds: number) => {
    if (audioElementsRef.current[chapterIndex]) {
      const audio = audioElementsRef.current[chapterIndex];
      audio.currentTime = Math.max(audio.currentTime - seconds, 0);
    }
  }, []);

  const playAudio = useCallback(
    async (chapterIndex: number) => {
      try {
        // Stop and properly clean up any currently playing audio
        if (currentlyPlaying !== null && audioElementsRef.current[currentlyPlaying]) {
          const currentAudio = audioElementsRef.current[currentlyPlaying];
          currentAudio.pause();
          currentAudio.currentTime = 0;
          // Reset the audio element to free up resources
          currentAudio.load();
        }

        setAudioLoading((prev) => ({ ...prev, [chapterIndex]: true }));

        // Use the provided audio endpoint
        const proxyAudioUri = `${audioEndpoint}/${chapterIndex}`;

        // Create new audio element if it doesn't exist
        if (!audioElementsRef.current[chapterIndex]) {
          const audio = new Audio();
          audio.preload = 'metadata';

          audio.addEventListener('loadedmetadata', () => {
            setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));
            if (audio.duration && audio.duration !== Infinity) {
              setAudioDurations((prev) => ({ ...prev, [chapterIndex]: audio.duration }));
            }
          });

          audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
              const progress = (audio.currentTime / audio.duration) * 100;
              setAudioProgress((prev) => ({ ...prev, [chapterIndex]: progress }));
            }
          });

          audio.addEventListener('ended', () => {
            // Mark current as finished
            setCurrentlyPlaying(null);
            setAudioProgress((prev) => ({ ...prev, [chapterIndex]: 0 }));

            // Auto-advance if there is a next chapter
            const total = totalChaptersRef.current;
            const nextIndex = chapterIndex + 1;
            if (total > 0 && nextIndex < total) {
              // Slight delay to allow state to settle before starting next
              setTimeout(() => {
                playAudioRef.current(nextIndex);
              }, 150);
            }
          });

          audio.addEventListener('error', (e) => {
            console.error('Audio playback error for chapter', chapterIndex + 1, ':', e);
            setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));
            setCurrentlyPlaying(null);
            // Don't trigger the global error handler that crashes the page
            // Instead, show a more user-friendly message
            const errorMessage = tErrors('failedToLoadAudio');
            alert(`${errorMessage} (Chapter ${chapterIndex + 1})`);
          });

          audioElementsRef.current[chapterIndex] = audio;

          // Set the source and start playing with proper error handling
          audio.src = proxyAudioUri;
          audio.playbackRate = playbackSpeedRef.current;

          try {
            await audio.play();
            setCurrentlyPlaying(chapterIndex);
          } catch (playError) {
            console.error('Play promise rejected for chapter', chapterIndex + 1, ':', playError);
            setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));

            // Handle different types of play errors
            if (playError instanceof Error && playError.name === 'NotAllowedError') {
              alert(tErrors('audioPlaybackInteractionRequired'));
            } else {
              alert(`${tErrors('failedToPlayAudio')} (Chapter ${chapterIndex + 1})`);
            }
            return;
          }

          // Track story listening if tracking data is provided
          if (trackingData?.story_id) {
            trackStoryManagement.listen({
              story_id: trackingData.story_id,
              story_title: trackingData.story_title,
              chapter_number: chapterIndex + 1,
              total_chapters: trackingData.total_chapters || 0,
            });
          }
        } else {
          // Use existing audio element
          const audio = audioElementsRef.current[chapterIndex];

          // Always reset the audio element when switching sources
          if (audio.src !== proxyAudioUri) {
            audio.pause();
            audio.currentTime = 0;
            audio.load(); // Reset the element
            audio.src = proxyAudioUri;
          }

          audio.playbackRate = playbackSpeedRef.current;

          try {
            await audio.play();
            setCurrentlyPlaying(chapterIndex);
            setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));
          } catch (playError) {
            console.error(
              'Play promise rejected for existing chapter',
              chapterIndex + 1,
              ':',
              playError,
            );
            setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));

            // Handle different types of play errors
            if (playError instanceof Error && playError.name === 'NotAllowedError') {
              alert(tErrors('audioPlaybackInteractionRequired'));
            } else {
              alert(`${tErrors('failedToPlayAudio')} (Chapter ${chapterIndex + 1})`);
            }
            return;
          }

          // Track story listening if tracking data is provided
          if (trackingData?.story_id) {
            trackStoryManagement.listen({
              story_id: trackingData.story_id,
              story_title: trackingData.story_title,
              chapter_number: chapterIndex + 1,
              total_chapters: trackingData.total_chapters || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        setAudioLoading((prev) => ({ ...prev, [chapterIndex]: false }));

        let errorMessage: string;
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            errorMessage = tErrors('audioPlaybackInteractionRequired');
          } else if (error.name === 'NotSupportedError') {
            errorMessage = tErrors('audioFormatNotSupported');
          } else {
            errorMessage = tErrors('failedToPlayAudio');
          }
        } else {
          errorMessage = tErrors('failedToPlayAudio');
        }

        if (onError) {
          onError(errorMessage);
        } else {
          alert(errorMessage);
        }
      }
    },
    [currentlyPlaying, audioEndpoint, tErrors, onError, trackingData],
  );

  // Keep ref of latest playAudio for ended event handlers
  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  const pauseAudio = useCallback((chapterIndex: number) => {
    if (audioElementsRef.current[chapterIndex]) {
      audioElementsRef.current[chapterIndex].pause();
      setCurrentlyPlaying(null);
    }
  }, []);

  const stopAudio = useCallback((chapterIndex: number) => {
    if (audioElementsRef.current[chapterIndex]) {
      const audio = audioElementsRef.current[chapterIndex];
      audio.pause();
      audio.currentTime = 0;
      // Reset the audio element to free up resources
      audio.load();
      setCurrentlyPlaying(null);
      setAudioProgress((prev) => ({ ...prev, [chapterIndex]: 0 }));
    }
  }, []);

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    // Copy ref to local variable for cleanup to satisfy exhaustive-deps
    const elements = audioElementsRef.current;
    return () => {
      Object.values(elements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src'); // Remove source to stop download
        audio.load(); // Reset the element
      });
    };
  }, []);

  const getAudioElement = useCallback((index: number) => {
    return audioElementsRef.current[index];
  }, []);

  return {
    currentlyPlaying,
    getAudioElement,
    audioProgress,
    audioLoading,
    audioDurations,
    playbackSpeed,
    playAudio,
    pauseAudio,
    stopAudio,
    setPlaybackSpeed,
    seekAudio,
    skipForward,
    skipBackward,
  };
}
