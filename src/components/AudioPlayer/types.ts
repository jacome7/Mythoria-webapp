// Shared types for audio player components
export interface AudioChapter {
  chapterTitle: string;
  audioUri: string;
  duration: number;
  imageUri?: string;
}

export interface AudioPlayerState {
  currentlyPlaying: number | null;
  audioElements: { [key: number]: HTMLAudioElement };
  audioProgress: { [key: number]: number };
  audioLoading: { [key: number]: boolean };
}

export interface AudioPlayerActions {
  playAudio: (chapterIndex: number) => Promise<void>;
  pauseAudio: (chapterIndex: number) => void;
  stopAudio: (chapterIndex: number) => void;
}

export interface AudioPlayerHookProps {
  audioEndpoint: string; // Base endpoint for audio proxy
  onError?: (error: string) => void;
  trackingData?: {
    story_id?: string;
    story_title?: string;
    total_chapters?: number;
  };
}
