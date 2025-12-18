'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAudioPlayer } from './useAudioPlayer';
import {
  AudioChapter,
  AudioPlayerHookProps,
  CastAwareAudioPlayer,
  CastControlsState,
} from './types';

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

interface CastAudioPlayerProps extends AudioPlayerHookProps {
  chapters: AudioChapter[];
  storyTitle: string;
}

type PlaybackSnapshot = {
  chapterIndex: number | null;
  currentTime: number;
  playbackRate: number;
};

type CastEventHandler = {
  type: cast.framework.RemotePlayerEventType;
  handler: (event: { type: cast.framework.RemotePlayerEventType; target: cast.framework.RemotePlayer }) => void;
};

type CastMediaClient = {
  queueLoad: (request: chrome.cast.media.QueueLoadRequestData) => Promise<void>;
};

const getCastContextOptions = () => {
  const receiverApplicationId =
    (typeof window !== 'undefined' && window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID) || 'CC1AD845';
  const autoJoinPolicy = typeof window !== 'undefined' ? window.chrome?.cast?.AutoJoinPolicy?.TAB_AND_ORIGIN_SCOPED : undefined;

  return {
    receiverApplicationId,
    autoJoinPolicy,
    resumeSavedSession: true,
  } satisfies Parameters<cast.framework.CastContext['setOptions']>[0];
};

const getRepeatOffMode = () =>
  (typeof window !== 'undefined' ? window.chrome?.cast?.media?.RepeatMode?.OFF : undefined) ||
  ('REPEAT_OFF' as chrome.cast.media.RepeatMode);

const isCastCancel = (error: unknown) => {
  // ErrorCode.CANCEL is not exposed in the type definitions, check string value
  const code = (error as { code?: unknown })?.code;
  if (code === 'cancel' || code === 'CANCEL') return true;
  if (typeof error === 'string' && error.toLowerCase() === 'cancel') return true;
  return false;
};

const resolveMediaClient = async (session: cast.framework.CastSession): Promise<CastMediaClient> => {
  const tries = 20;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (let i = 0; i < tries; i += 1) {
    // CastSession.queueLoad is the documented API method
    const sessionAsClient = session as unknown as CastMediaClient;
    if (typeof sessionAsClient.queueLoad === 'function') {
      return sessionAsClient;
    }

    await delay(100 + 50 * i);
  }

  const castState = cast.framework.CastContext.getInstance().getCastState?.();
  console.warn('Cast media client unavailable after retries', {
    castState,
  });

  // Return the session itself as it should support queueLoad
  return session as unknown as CastMediaClient;
};

export function useCastAudioPlayer({
  chapters,
  storyTitle,
  audioEndpoint,
  onError,
  trackingData,
  totalChapters,
}: CastAudioPlayerProps): CastAwareAudioPlayer {
  const tErrors = useTranslations('Errors');
  const [castReady, setCastReady] = useState(false);
  const [castState, setCastState] = useState<cast.framework.CastState | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [castingDeviceName, setCastingDeviceName] = useState<string | undefined>();
  const [castAudioProgress, setCastAudioProgress] = useState<Record<number, number>>({});
  const [castDurations, setCastDurations] = useState<Record<number, number>>({});
  const [castPlaybackSpeed, setCastPlaybackSpeed] = useState(1);
  const [currentCastChapter, setCurrentCastChapter] = useState<number | null>(null);

  const castContextRef = useRef<cast.framework.CastContext | null>(null);
  const remotePlayerRef = useRef<cast.framework.RemotePlayer | null>(null);
  const remoteControllerRef = useRef<cast.framework.RemotePlayerController | null>(null);
  const remoteEventHandlersRef = useRef<CastEventHandler[]>([]);
  const manualStopRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<PlaybackSnapshot>({ chapterIndex: null, currentTime: 0, playbackRate: 1 });
  const currentCastChapterRef = useRef<number | null>(null);

  const audioPlayer = useAudioPlayer({
    audioEndpoint,
    onError,
    trackingData,
    totalChapters: totalChapters ?? chapters.length,
  });

  useEffect(() => {
    currentCastChapterRef.current = currentCastChapter;
  }, [currentCastChapter]);

  const buildQueueItems = useCallback((): chrome.cast.media.QueueItem[] => {
    const castMedia = typeof window !== 'undefined' ? window.chrome?.cast?.media : undefined;
    const streamType = castMedia?.StreamType?.BUFFERED ?? ('BUFFERED' as chrome.cast.media.StreamType);
    const metadataType = castMedia?.MetadataType?.MUSIC_TRACK ?? 3;

    return chapters
      .filter((chapter) => Boolean(chapter.audioUri))
      .map((chapter, index) => ({
        media: {
          contentId: chapter.audioUri,
          streamType,
          contentType: 'audio/mpeg',
          metadata: {
            metadataType,
            title: chapter.chapterTitle,
            albumName: storyTitle,
            trackNumber: index + 1,
            images: chapter.imageUri ? [{ url: chapter.imageUri }] : undefined,
          },
          duration: chapter.duration,
        },
        autoplay: true,
        preloadTime: 20,
      }));
  }, [chapters, storyTitle]);

  const teardownRemoteListeners = useCallback(() => {
    const controller = remoteControllerRef.current;
    if (!controller || remoteEventHandlersRef.current.length === 0) return;

    remoteEventHandlersRef.current.forEach(({ type, handler }) => {
      controller.removeEventListener(type, handler);
    });
    remoteEventHandlersRef.current = [];
  }, []);

  const teardownCasting = useCallback(
    (resumeLocalPlayback: boolean) => {
      teardownRemoteListeners();
      remoteControllerRef.current = null;
      remotePlayerRef.current = null;
      setIsCasting(false);
      setCurrentCastChapter(null);
      setCastingDeviceName(undefined);

      if (resumeLocalPlayback && lastRemoteSnapshotRef.current.chapterIndex !== null) {
        const { chapterIndex, currentTime, playbackRate } = lastRemoteSnapshotRef.current;
        void (async () => {
          await audioPlayer.playAudio(chapterIndex);
          if (currentTime > 0) {
            audioPlayer.seekAudio(chapterIndex, currentTime);
          }
          if (playbackRate && playbackRate !== audioPlayer.playbackSpeed) {
            audioPlayer.setPlaybackSpeed(playbackRate);
          }
        })();
      }
    },
    [audioPlayer, teardownRemoteListeners],
  );

  const updateFromRemotePlayer = useCallback(
    (player?: cast.framework.RemotePlayer | null) => {
      if (!player) {
        return;
      }

      const mediaInfo = player.mediaInfo;
      if (!mediaInfo) {
        return;
      }

      const trackNumber = (mediaInfo.metadata as { trackNumber?: number } | undefined)?.trackNumber;
      const derivedIndex = typeof trackNumber === 'number' ? trackNumber - 1 : currentCastChapterRef.current;
      const duration = player.duration || mediaInfo.duration || (derivedIndex != null ? chapters[derivedIndex]?.duration : 0) || 0;
      const progress = duration ? (player.currentTime / duration) * 100 : 0;

      if (derivedIndex != null) {
        setCastDurations((prev) => ({ ...prev, [derivedIndex]: duration }));
        setCastAudioProgress((prev) => ({ ...prev, [derivedIndex]: progress }));
        setCurrentCastChapter(derivedIndex);
      }

      lastRemoteSnapshotRef.current = {
        chapterIndex: derivedIndex ?? null,
        currentTime: player.currentTime,
        playbackRate: player.playbackRate || 1,
      };
      setCastPlaybackSpeed(player.playbackRate || 1);
    },
    [chapters],
  );

  const attachRemotePlayer = useCallback(
    (session: cast.framework.CastSession) => {
      const player = new cast.framework.RemotePlayer();
      const controller = new cast.framework.RemotePlayerController(player);

      remotePlayerRef.current = player;
      remoteControllerRef.current = controller;
      setCastingDeviceName(session.getCastDevice()?.friendlyName || player.displayName);
      setIsCasting(true);

      const handlers: CastEventHandler[] = [
        {
          type: cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
          handler: ({ target }) => updateFromRemotePlayer(target),
        },
        {
          type: cast.framework.RemotePlayerEventType.DURATION_CHANGED,
          handler: ({ target }) => updateFromRemotePlayer(target),
        },
        {
          type: cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
          handler: ({ target }) => updateFromRemotePlayer(target),
        },
        {
          type: cast.framework.RemotePlayerEventType.PLAYBACK_RATE_CHANGED,
          handler: ({ target }) => updateFromRemotePlayer(target),
        },
        {
          type: cast.framework.RemotePlayerEventType.CURRENT_ITEM_ID_CHANGED,
          handler: ({ target }) => updateFromRemotePlayer(target),
        },
      ];

      handlers.forEach(({ type, handler }) => controller.addEventListener(type, handler));
      remoteEventHandlersRef.current = handlers;

      updateFromRemotePlayer(player);
    },
    [updateFromRemotePlayer],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let canceled = false;
    let castStateListener: ((event: cast.framework.CastStateEventData) => void) | null = null;

    const initializeCast = () => {
      if (canceled || !window.cast || !window.chrome) return;
      const context = cast.framework.CastContext.getInstance();
      context.setOptions(getCastContextOptions());
      castContextRef.current = context;
      setCastReady(true);
      setCastState(context.getCastState());

      castStateListener = (event: cast.framework.CastStateEventData) => {
        setCastState(event.castState);
      };

      context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, castStateListener);

      const existingSession = context.getCurrentSession();
      if (existingSession) {
        attachRemotePlayer(existingSession);
      }
    };

    const maybeLoadSdk = () => {
      if (window.cast && window.chrome) {
        initializeCast();
        return;
      }

      const win = window as Window & { __onGCastApiAvailable?: (available: boolean, errorInfo?: unknown) => void };
      const previousCallback = win.__onGCastApiAvailable;
      win.__onGCastApiAvailable = (available, errorInfo) => {
        if (available) {
          initializeCast();
        } else {
          console.error('Google Cast SDK unavailable', errorInfo);
        }
        if (previousCallback && previousCallback !== win.__onGCastApiAvailable) {
          previousCallback(available, errorInfo);
        }
      };

      if (!document.querySelector(`script[src="${CAST_SDK_URL}"]`)) {
        const script = document.createElement('script');
        script.src = CAST_SDK_URL;
        script.async = true;
        document.body.appendChild(script);
      }
    };

    maybeLoadSdk();

    return () => {
      canceled = true;
      if (castContextRef.current && castStateListener) {
        castContextRef.current.removeEventListener(
          cast.framework.CastContextEventType.CAST_STATE_CHANGED,
          castStateListener,
        );
      }
    };
  }, [attachRemotePlayer]);

  useEffect(() => {
    const context = castContextRef.current;
    if (!context) return undefined;

    const onSessionStateChanged = (event: cast.framework.SessionStateEventData) => {
      if (
        event.sessionState === cast.framework.SessionState.SESSION_STARTED ||
        event.sessionState === cast.framework.SessionState.SESSION_RESUMED
      ) {
        const session = context.getCurrentSession();
        if (session) {
          attachRemotePlayer(session);
        }
      }

      if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
        teardownCasting(!manualStopRef.current);
        manualStopRef.current = false;
      }
    };

    context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSessionStateChanged);
    return () => {
      context.removeEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSessionStateChanged);
    };
  }, [attachRemotePlayer, teardownCasting]);

  const getLocalSnapshot = useCallback((): PlaybackSnapshot => {
    const chapterIndex = audioPlayer.currentlyPlaying;
    const audioEl = chapterIndex != null ? audioPlayer.getAudioElement(chapterIndex) : undefined;
    return {
      chapterIndex,
      currentTime: audioEl?.currentTime ?? 0,
      playbackRate: audioPlayer.playbackSpeed,
    };
  }, [audioPlayer]);

  const startCasting = useCallback(
    async (chapterIndex?: number) => {
      try {
        manualStopRef.current = false;
        const context = castContextRef.current;
        if (!context) {
          throw new Error('Cast context is not ready');
        }

        const queueItems = buildQueueItems();
        if (queueItems.length === 0) {
          throw new Error('No audio content available for casting');
        }

        const { chapterIndex: currentChapter, currentTime, playbackRate } = getLocalSnapshot();
        const startIndex = chapterIndex ?? currentChapter ?? 0;
        const startTime = startIndex === currentChapter ? currentTime : 0;

        const existingSession = context.getCurrentSession();

        const session =
          existingSession ||
          (await context
            .requestSession()
            .catch((error) => {
              if (isCastCancel(error)) {
                // User dismissed the device picker; quietly abort.
                return null;
              }
              throw error;
            }));

        if (!session) {
          return;
        }

        const mediaClient = await resolveMediaClient(session);

        if (currentChapter != null) {
          audioPlayer.pauseAudio(currentChapter);
        }

        await mediaClient.queueLoad({
          items: queueItems,
          startIndex,
          repeatMode: getRepeatOffMode(),
          startTime,
        });

        setCurrentCastChapter(startIndex);
        setCastAudioProgress((prev) => ({ ...prev, [startIndex]: 0 }));

        if (remotePlayerRef.current) {
          remotePlayerRef.current.playbackRate = playbackRate;
          remoteControllerRef.current?.setPlaybackRate();
        }

        attachRemotePlayer(session);
        setCastPlaybackSpeed(playbackRate || 1);
      } catch (error) {
        teardownCasting(true);
        if (isCastCancel(error)) {
          return;
        }
        console.error('Failed to start casting', error);
        if (onError) {
          onError(tErrors('failedToPlayAudio'));
        }
      }
    },
    [attachRemotePlayer, audioPlayer, buildQueueItems, getLocalSnapshot, onError, tErrors, teardownCasting],
  );

  const playOnCast = useCallback(
    async (chapterIndex: number) => {
      const context = castContextRef.current;
      const session = context?.getCurrentSession();
      if (!session) {
        await startCasting(chapterIndex);
        return;
      }

      let mediaClient: CastMediaClient | null = null;
      try {
        mediaClient = await resolveMediaClient(session);
      } catch (error) {
        if (isCastCancel(error)) {
          return;
        }
        console.warn('Retrying startCasting after media client resolution failure', error);
        await startCasting(chapterIndex);
        return;
      }

      try {
        await mediaClient.queueLoad({
          items: buildQueueItems(),
          startIndex: chapterIndex,
          repeatMode: getRepeatOffMode(),
          startTime: 0,
        });
        setCurrentCastChapter(chapterIndex);
        setCastAudioProgress((prev) => ({ ...prev, [chapterIndex]: 0 }));
      } catch (error) {
        if (isCastCancel(error)) {
          return;
        }
        console.error('Failed to switch Cast queue item', error);
        if (onError) {
          onError(tErrors('failedToPlayAudio'));
        }
      }
    },
    [buildQueueItems, onError, startCasting, tErrors],
  );

  const pauseCast = useCallback(() => {
    const controller = remoteControllerRef.current;
    if (controller) {
      controller.playOrPause();
    }
  }, []);

  const stopCast = useCallback(() => {
    manualStopRef.current = true;
    const controller = remoteControllerRef.current;
    controller?.stop();
    castContextRef.current?.endCurrentSession(true);
    teardownCasting(false);
  }, [teardownCasting]);

  const seekCast = useCallback((time: number) => {
    const player = remotePlayerRef.current;
    const controller = remoteControllerRef.current;
    if (player && controller) {
      player.currentTime = time;
      controller.seek();
    }
  }, []);

  const setCastSpeed = useCallback((speed: number) => {
    const player = remotePlayerRef.current;
    const controller = remoteControllerRef.current;
    if (player && controller) {
      player.playbackRate = speed;
      controller.setPlaybackRate();
      setCastPlaybackSpeed(speed);
    }
  }, []);

  const skipCastBy = useCallback((seconds: number) => {
    const player = remotePlayerRef.current;
    const controller = remoteControllerRef.current;
    if (!player || !controller) return;

    const targetTime = Math.max(0, Math.min(player.currentTime + seconds, player.duration || player.currentTime + seconds));
    player.currentTime = targetTime;
    controller.seek();
  }, []);

  const hasDevices = useMemo(
    () => castReady && castState !== null && castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE,
    [castReady, castState],
  );

  const currentlyPlaying = isCasting ? currentCastChapter : audioPlayer.currentlyPlaying;
  const audioProgress = isCasting ? castAudioProgress : audioPlayer.audioProgress;
  const audioDurations = isCasting ? castDurations : audioPlayer.audioDurations;
  const playbackSpeed = isCasting ? castPlaybackSpeed : audioPlayer.playbackSpeed;

  const playAudio = useCallback(
    async (chapterIndex: number) => {
      if (isCasting) {
        await playOnCast(chapterIndex);
        return;
      }
      await audioPlayer.playAudio(chapterIndex);
    },
    [audioPlayer, isCasting, playOnCast],
  );

  const pauseAudio = useCallback(
    (chapterIndex: number) => {
      if (isCasting) {
        pauseCast();
        return;
      }
      audioPlayer.pauseAudio(chapterIndex);
    },
    [audioPlayer, isCasting, pauseCast],
  );

  const stopAudio = useCallback(
    (chapterIndex: number) => {
      if (isCasting) {
        stopCast();
        return;
      }
      audioPlayer.stopAudio(chapterIndex);
    },
    [audioPlayer, isCasting, stopCast],
  );

  const seekAudio = useCallback(
    (chapterIndex: number, time: number) => {
      if (isCasting) {
        seekCast(time);
        return;
      }
      audioPlayer.seekAudio(chapterIndex, time);
    },
    [audioPlayer, isCasting, seekCast],
  );

  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      if (isCasting) {
        setCastSpeed(speed);
        return;
      }
      audioPlayer.setPlaybackSpeed(speed);
    },
    [audioPlayer, isCasting, setCastSpeed],
  );

  const skipForward = useCallback(
    (chapterIndex: number, seconds: number) => {
      if (isCasting) {
        skipCastBy(seconds);
        return;
      }
      audioPlayer.skipForward(chapterIndex, seconds);
    },
    [audioPlayer, isCasting, skipCastBy],
  );

  const skipBackward = useCallback(
    (chapterIndex: number, seconds: number) => {
      if (isCasting) {
        skipCastBy(-seconds);
        return;
      }
      audioPlayer.skipBackward(chapterIndex, seconds);
    },
    [audioPlayer, isCasting, skipCastBy],
  );

  const castControls: CastControlsState = {
    castReady,
    castState,
    hasDevices,
    isCasting,
    castingDeviceName,
    startCasting,
    stopCasting: async () => stopCast(),
  };

  return {
    currentlyPlaying,
    getAudioElement: audioPlayer.getAudioElement,
    audioProgress,
    audioLoading: audioPlayer.audioLoading,
    audioDurations,
    playbackSpeed,
    playAudio,
    pauseAudio,
    stopAudio,
    setPlaybackSpeed,
    seekAudio,
    skipForward,
    skipBackward,
    cast: castControls,
  };
}
