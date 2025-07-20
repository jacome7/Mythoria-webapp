# AudioPlayer Components

This directory contains shared components for audio playback functionality used across both public and authenticated story listening pages.

## Components

### `useAudioPlayer`
A custom hook that manages audio playback state and provides audio control functions.

**Usage:**
```tsx
const audioPlayer = useAudioPlayer({
  audioEndpoint: '/api/stories/123/audio', // Base audio API endpoint
  onError: (errorMessage) => setError(errorMessage), // Optional error handler
  trackingData: { // Optional analytics tracking
    story_id: 'story-id',
    story_title: 'Story Title',
    total_chapters: 5
  }
});
```

**Returns:**
- `currentlyPlaying: number | null` - Index of currently playing chapter
- `audioElements: { [key: number]: HTMLAudioElement }` - Audio element instances
- `audioProgress: { [key: number]: number }` - Progress percentage for each chapter
- `audioLoading: { [key: number]: boolean }` - Loading state for each chapter
- `playAudio: (chapterIndex: number) => Promise<void>` - Play audio function
- `pauseAudio: (chapterIndex: number) => void` - Pause audio function
- `stopAudio: (chapterIndex: number) => void` - Stop audio function

### `AudioChapterList`
A React component that renders a list of audio chapters with playback controls.

**Usage:**
```tsx
<AudioChapterList 
  chapters={audioChapters}
  {...audioPlayer}
/>
```

**Props:**
- `chapters: AudioChapter[]` - Array of audio chapters
- All props from `useAudioPlayer` return value

### Utility Functions

#### `hasAudiobook(audiobookUri: unknown): boolean`
Checks if a story has audiobook data available.

#### `getAudioChapters(audiobookUri: unknown, chapters: Chapter[], fallbackTitleFn: (number) => string): AudioChapter[]`
Extracts audio chapters from audiobook data, supporting multiple formats:
- **Format 1**: `{"chapter_1": "url", "chapter_2": "url", ...}`
- **Format 2**: `{"1": "url", "2": "url", ...}`
- **Format 3**: Array of structured audiobook objects

## Data Formats

### AudioChapter Interface
```tsx
interface AudioChapter {
  chapterTitle: string;
  audioUri: string;
  duration: number;
  imageUri?: string;
}
```

### Chapter Interface
```tsx
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
```

## Architecture

### Audio Storage Strategy
The system supports dual storage for audio data:

1. **Story-level**: `story.audiobookUri` (JSONB field) - Used by authenticated users
   - Contains mapping of chapter numbers to audio URLs
   - Generated during audiobook creation process

2. **Chapter-level**: `chapter.audioUri` (text field) - Used by public pages
   - Individual audio URL per chapter
   - Fallback option for public access

### API Endpoints

#### Authenticated Audio API
- **Endpoint**: `/api/stories/{storyId}/audio/{chapterIndex}`
- **Authentication**: Required
- **Data Source**: `story.audiobookUri`

#### Public Audio API
- **Endpoint**: `/api/p/{slug}/audio/{chapterIndex}`
- **Authentication**: Not required
- **Data Source**: `chapter.audioUri` (primary), `story.audiobookUri` (fallback)

## Error Handling

The components handle various audio playback errors:
- **NotAllowedError**: Browser requires user interaction
- **NotSupportedError**: Audio format not supported
- **Network Errors**: Failed to load audio file
- **Generic Errors**: Fallback error handling

## Integration

### Public Story Page
```tsx
// src/app/[locale]/p/[slug]/listen/page.tsx
const audioPlayer = useAudioPlayer({
  audioEndpoint: `/api/p/${slug}/audio`,
  onError: (errorMessage) => setError(errorMessage),
});

// In JSX
{hasAudiobook(data?.story?.audiobookUri) ? (
  <AudioChapterList 
    chapters={getAudioChapters(
      data.story.audiobookUri, 
      data.chapters, 
      (number) => t('listen.chapterFallback', { number })
    )}
    {...audioPlayer}
  />
) : (
  // No audio available message
)}
```

### Authenticated Story Page
```tsx
// src/app/[locale]/stories/listen/[storyId]/page.tsx
const audioPlayer = useAudioPlayer({
  audioEndpoint: `/api/stories/${storyId}/audio`,
  onError: (errorMessage) => setError(errorMessage),
  trackingData: {
    story_id: storyId,
    story_title: story?.title,
  }
});

// In JSX
{hasAudiobook(story.audiobookUri) ? (
  <AudioChapterList 
    chapters={getAudioChapters(
      story.audiobookUri, 
      [], 
      (number) => tCommon('ListenStory.chapterTitle', { number })
    )}
    {...audioPlayer}
  />
) : (
  // Generate audiobook section
)}
```

## Benefits

1. **Code Reusability**: Single implementation for all audio playback
2. **Consistency**: Same UI/UX across public and authenticated pages
3. **Maintainability**: Centralized audio logic
4. **Type Safety**: Full TypeScript support
5. **Error Handling**: Comprehensive error management
6. **Performance**: Optimized audio element management
