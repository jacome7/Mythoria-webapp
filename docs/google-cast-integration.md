# Google Cast Integration for Mythoria Audio Player

**Version:** 1.1.0
**Last Updated:** December 15, 2005
**Scope:** Web (Chrome/Edge desktop + Android Chrome) sender integration for the existing Next.js audio player; relies on the Default Media Receiver and publicly hosted MP3 files in Google Cloud Storage.

## Goal

Enable listeners to cast audiobook playback from Mythoria's web audio player to compatible Google Cast speakers. The sender UI should expose a Cast button that is disabled when no devices are available, start casting with chapter queues (with preload), and keep the on-page controls in sync with remote playback.

## Platform Notes

- **Sender SDK:** `https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1` (CAF Web Sender). Requires HTTPS and a browser with Cast support (Chrome/Edge desktop, Android Chrome).
- **Receiver:** Default Media Receiver works for public MP3 assets. A custom receiver is optional if later UX needs richer branding or custom analytics, but it is sufficient for v1.
- **Auto-join:** `AUTO_JOIN_POLICY_TAB_AND_ORIGIN_SCOPED` allows reconnection after refresh; use `ORIGIN_SCOPED` for stricter behavior. Persist the last-selected Cast device so users can reconnect smoothly when returning.
- **Media format:** Provide `contentType: 'audio/mpeg'` with direct, publicly reachable MP3 URLs. Add chapter metadata (title, images) for a better Cast UI.

## Recommended Integration Strategy

1. **Client-only loader:** Create a tiny client component (or hook) that injects the Cast sender script and exposes readiness/device state. Avoid loading the SDK during SSR.
2. **Cast context setup:** After `window.__onGCastApiAvailable === true`, configure once:
   ```ts
   cast.framework.CastContext.getInstance().setOptions({
     receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
     autoJoinPolicy: chrome.cast.AutoJoinPolicy.AUTO_JOIN_POLICY_TAB_AND_ORIGIN_SCOPED,
     resumeSavedSession: true,
   });
   ```
3. **Device availability:** Listen for `CAST_STATE_CHANGED`; disable the button when `CastState.NO_DEVICES_AVAILABLE`. The Cast framework also exposes a `getCastState()` accessor for initial state.
4. **Session lifecycle:** Use `cast.framework.CastContext.getInstance().requestSession()` to start casting. Subscribe to `SESSION_STATE_CHANGED` to switch between local HTMLAudioElement playback (`useAudioPlayer`) and Cast remote playback, pausing local audio when a Cast session becomes active.
5. **Queue + preload:**
   - Build `chrome.cast.media.QueueItem` objects for each chapter with `mediaInfo` populated from the existing audiobook metadata (title, image URI, chapter index).
   - Submit a `chrome.cast.media.QueueLoadRequest` via the active session:
     ```ts
     session.queueLoad({
       items: queueItems,
       startIndex: chapterIndex,
       repeatMode: chrome.cast.media.RepeatMode.OFF,
       preloadTime: 20, // seconds of lookahead buffering on the receiver
     });
     ```
   - Use `queueInsertItems` when adding late chapters so preloading remains active.
6. **Control mapping:**
   - Instantiate `cast.framework.RemotePlayer` + `RemotePlayerController` to bridge the on-page controls to Cast actions (`playOrPause`, `stop`, `seek`, `setPlaybackRate`, `queueNext/Previous`).
   - When a Cast session is active, route `AudioChapterList` control handlers to the RemotePlayerController equivalents; fall back to `useAudioPlayer` for local playback.
7. **UI synchronization:** Subscribe to `RemotePlayerEventType` events (e.g., `IS_PAUSED_CHANGED`, `CURRENT_TIME_CHANGED`, `DURATION_CHANGED`, `PLAYER_STATE_CHANGED`) and map them into the existing audio player state (progress, active chapter, playback speed). Keep the progress bar in sync by reading `remotePlayer.currentTime`/`duration` instead of HTML audio when casting.
8. **Error handling:** Surface Cast errors through the existing `onError` channel. Handle common sender errors (`CANCEL`, `TIMEOUT`, `CHANNEL_ERROR`) by resuming local playback if the session drops.
9. **Analytics:** Emit the existing `trackStoryManagement.listen` events on queue load and per-chapter play/pause events. Include a `cast: true` flag to segment Cast usage if desired.

## Proposed Components/Hooks

- **`useCastAvailability` (new hook):** Loads the SDK, initializes the Cast context, and returns `{ castReady, castState, hasDevices }`. Scoped to client components only.
- **`useCastController` (new hook):** Given the chapter list + metadata, exposes Cast-aware controls (`startCasting(chapterIndex)`, `play`, `pause`, `seek`, `setSpeed`, `stop`, `switchToLocal`). Internally manages the RemotePlayer/Controller, queue load, and state subscriptions.
- **`CastButton` (new component):** Renders the Cast icon with disabled styling when `hasDevices` is false. Invokes `startCasting` with the current chapter. Can live alongside the existing play/speed controls in `AudioChapterList`.
- **`AudioPlayer` integration:** Add a lightweight adapter that switches between local `useAudioPlayer` controls and the Cast controller based on `isCasting`. Preserve the current chapter index and progress when handing off to Cast by starting the queue at the current index and seeking to the matching timestamp. Keep the Cast controls simple and localized to the web player; no extra controls are needed in `StoryReader` beyond the chapter list.

## Implemented Sender Experience

- **Hook:** `useCastAudioPlayer` wraps `useAudioPlayer`, loads the CAF Web Sender SDK on the client, and bridges local controls to Cast when a session is active. It pauses local playback before handing off, auto-advances through queued chapters on the Default Media Receiver, and resumes local playback if a Cast session drops unexpectedly.
- **UI:** `AudioChapterList` now renders a Cast banner with a `CastButton` that is disabled when no devices are available. The banner shows the connected device name while casting and reuses existing playback controls for pause/seek/speed while routing them to the Cast receiver.
- **Queueing:** Chapters are queued with metadata (title, album/story title, track number, cover art) and `preloadTime` of 20s. Queue loads start from the active chapter/time when casting begins so listeners keep their place.

## Data & Metadata Mapping

- **Queue items:**
  ```ts
  const item: chrome.cast.media.QueueItem = {
    media: {
      contentId: chapter.audioUri,
      streamType: chrome.cast.media.StreamType.BUFFERED,
      contentType: 'audio/mpeg',
      metadata: {
        metadataType: chrome.cast.media.MetadataType.MUSIC_TRACK,
        title: chapter.chapterTitle,
        albumName: storyTitle,
        trackNumber: chapterIndex + 1,
        images: chapter.imageUri ? [{ url: chapter.imageUri }] : undefined,
      },
    },
    autoplay: true,
    preloadTime: 20,
  };
  ```
- **Timing sync:** When transferring an in-progress chapter, set `startTime` on the `QueueLoadRequest` to the current HTML audio `currentTime` before starting Cast playback.

## UX Notes

- Disable the Cast button until `castReady && hasDevices`.
- Show the current route (local vs Cast) in the player header (e.g., “Playing on Living Room speaker”).
- Keep pause/seek/playback-speed controls available; hide local-only affordances (e.g., download) during Cast sessions if they exist.
- Auto-resume local playback if the Cast session ends unexpectedly.

## Testing Plan

- **Manual:**
  - Chrome desktop + Google Home speaker: start Cast, seek, change speed, auto-advance across multiple chapters, pause/resume from sender and speaker hardware buttons.
  - No device scenario: verify disabled state and absence of Cast SDK errors.
  - Network drop: confirm session loss falls back to local playback without double-audio.
- **Automated stubs:** Add unit tests that mock `window.cast` to validate hook state transitions and control routing without requiring Cast hardware.

## Open Questions / Follow-ups

- Confirm when to revisit a custom receiver for richer branding/analytics if future requirements expand beyond the Default Media Receiver.
