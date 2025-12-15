// Minimal Google Cast sender typings for Mythoria web app
// Covers the subset of the CAF Web Sender SDK used by the audio player.

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean, errorInfo?: unknown) => void;
    cast?: typeof cast;
    chrome?: typeof chrome;
  }

  namespace chrome.cast {
    enum AutoJoinPolicy {
      CUSTOM_CONTROLLER_SCOPED = 'custom_controller_scoped',
      ORIGIN_SCOPED = 'origin_scoped',
      PAGE_SCOPED = 'page_scoped',
      TAB_AND_ORIGIN_SCOPED = 'tab_and_origin_scoped',
    }

    namespace media {
      const DEFAULT_MEDIA_RECEIVER_APP_ID: string;

      enum StreamType {
        BUFFERED = 'BUFFERED',
      }

      enum MetadataType {
        GENERIC = 0,
        MOVIE = 1,
        TV_SHOW = 2,
        MUSIC_TRACK = 3,
        PHOTO = 4,
        USER = 100,
      }

      enum RepeatMode {
        OFF = 'REPEAT_OFF',
        ALL = 'REPEAT_ALL',
        SINGLE = 'REPEAT_SINGLE',
        ALL_AND_SHUFFLE = 'REPEAT_ALL_AND_SHUFFLE',
      }

      interface QueueItem {
        media: MediaInfo;
        autoplay?: boolean;
        preloadTime?: number;
        startTime?: number;
        itemId?: number;
      }

      type MediaMetadata = MusicTrackMediaMetadata | Record<string, unknown>;

      interface MusicTrackMediaMetadata {
        metadataType: MetadataType.MUSIC_TRACK;
        title?: string;
        albumName?: string;
        trackNumber?: number;
        images?: Array<{ url: string }>;
      }

      interface MediaInfo {
        contentId: string;
        streamType?: StreamType;
        contentType?: string;
        metadata?: MediaMetadata;
        duration?: number;
      }

      interface QueueLoadRequestData {
        items: QueueItem[];
        startIndex?: number;
        repeatMode?: RepeatMode;
        startTime?: number;
      }

      class Media {
        queueJumpToItem(itemId: number): void;
        queueNext(): void;
        queuePrev(): void;
        pause(): void;
        play(): void;
        seek(request: { currentTime: number }): void;
      }
    }
  }

  namespace cast.framework {
    enum CastState {
      NO_DEVICES_AVAILABLE = 'NO_DEVICES_AVAILABLE',
      NOT_CONNECTED = 'NOT_CONNECTED',
      CONNECTING = 'CONNECTING',
      CONNECTED = 'CONNECTED',
    }

    enum SessionState {
      NO_SESSION = 'NO_SESSION',
      SESSION_STARTING = 'SESSION_STARTING',
      SESSION_STARTED = 'SESSION_STARTED',
      SESSION_RESUMED = 'SESSION_RESUMED',
      SESSION_ENDED = 'SESSION_ENDED',
    }

    enum CastContextEventType {
      CAST_STATE_CHANGED = 'caststatechanged',
      SESSION_STATE_CHANGED = 'sessionstatechanged',
    }

    interface CastStateEventData {
      castState: CastState;
    }

    interface SessionStateEventData {
      sessionState: SessionState;
    }

    class CastContext {
      static getInstance(): CastContext;
      setOptions(options: {
        receiverApplicationId: string;
        autoJoinPolicy?: chrome.cast.AutoJoinPolicy;
        resumeSavedSession?: boolean;
      }): void;
      addEventListener(type: CastContextEventType.CAST_STATE_CHANGED, handler: (event: CastStateEventData) => void): void;
      addEventListener(
        type: CastContextEventType.SESSION_STATE_CHANGED,
        handler: (event: SessionStateEventData) => void,
      ): void;
      removeEventListener(type: CastContextEventType.CAST_STATE_CHANGED, handler: (event: CastStateEventData) => void): void;
      removeEventListener(
        type: CastContextEventType.SESSION_STATE_CHANGED,
        handler: (event: SessionStateEventData) => void,
      ): void;
      requestSession(): Promise<CastSession>;
      getCastState(): CastState;
      getCurrentSession(): CastSession | null;
      endCurrentSession(stopCasting?: boolean): void;
    }

    class CastSession {
      queueLoad(request: chrome.cast.media.QueueLoadRequestData): Promise<chrome.cast.media.Media | null>;
      getMediaSession(): chrome.cast.media.Media | null;
      getCastDevice(): { friendlyName?: string } | null;
    }

    class RemotePlayer {
      currentTime: number;
      duration: number;
      isPaused: boolean;
      isConnected: boolean;
      displayName?: string;
      playbackRate: number;
      currentItemId?: number | null;
      mediaInfo?: chrome.cast.media.MediaInfo | null;
    }

    class RemotePlayerController {
      constructor(player: RemotePlayer);
      addEventListener(
        type: RemotePlayerEventType,
        handler: (event: { type: RemotePlayerEventType; target: RemotePlayer }) => void,
      ): void;
      removeEventListener(
        type: RemotePlayerEventType,
        handler: (event: { type: RemotePlayerEventType; target: RemotePlayer }) => void,
      ): void;
      playOrPause(): void;
      stop(): void;
      seek(): void;
      setPlaybackRate(): void;
      previous(): void;
      next(): void;
    }

    enum RemotePlayerEventType {
      IS_CONNECTED_CHANGED = 'isConnectedChanged',
      IS_PAUSED_CHANGED = 'isPausedChanged',
      CURRENT_TIME_CHANGED = 'currentTimeChanged',
      DURATION_CHANGED = 'durationChanged',
      PLAYBACK_RATE_CHANGED = 'playbackRateChanged',
      CURRENT_ITEM_ID_CHANGED = 'currentItemIdChanged',
    }

    enum PlayerState {
      UNKNOWN = 'UNKNOWN',
      IDLE = 'IDLE',
      PLAYING = 'PLAYING',
      PAUSED = 'PAUSED',
      BUFFERING = 'BUFFERING',
    }
  }
}

export {};
