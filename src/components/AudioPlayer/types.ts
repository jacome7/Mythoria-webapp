// Shared types for audio player components
export interface AudioChapter {
  chapterTitle: string;
  audioUri: string;
  duration: number;
  imageUri?: string;
}

export interface AudioPlayerState {
  currentlyPlaying: number | null;
  getAudioElement: (index: number) => HTMLAudioElement | undefined;
  audioProgress: { [key: number]: number };
  audioLoading: { [key: number]: boolean };
  audioDurations: { [key: number]: number };
  playbackSpeed: number;
}

export interface AudioPlayerActions {
  playAudio: (chapterIndex: number) => Promise<void>;
  pauseAudio: (chapterIndex: number) => void;
  stopAudio: (chapterIndex: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  seekAudio: (chapterIndex: number, time: number) => void;
  skipForward: (chapterIndex: number, seconds: number) => void;
  skipBackward: (chapterIndex: number, seconds: number) => void;
}

export interface AudioPlayerHookProps {
  audioEndpoint: string; // Base endpoint for audio proxy
  onError?: (error: string) => void;
  /**
   * Total number of chapters available for playback. If not provided, will fall back to
   * trackingData.total_chapters. Required for auto-advance to next chapter on end.
   */
  totalChapters?: number;
  trackingData?: {
    story_id?: string;
    story_title?: string;
    total_chapters?: number;
  };
}

export interface CastControlsState {
  castReady: boolean;
  castState: cast.framework.CastState | null;
  hasDevices: boolean;
  isCasting: boolean;
  castingDeviceName?: string;
  startCasting: (chapterIndex?: number) => Promise<void>;
  stopCasting: () => Promise<void>;
}

export type CastAwareAudioPlayer = AudioPlayerState &
  AudioPlayerActions & { cast: CastControlsState };
