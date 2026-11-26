'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudiobookProgress {
  audiobookGenerationStatus: 'not_started' | 'generating' | 'completed' | 'failed';
  audiobookGenerationCompletedPercentage: number | null;
  runId: string | null;
  estimatedRemainingSeconds: number | null;
  estimateExceeded: boolean;
}

export function useAudiobookProgress(storyId: string) {
  const [progress, setProgress] = useState<AudiobookProgress | null>(null);
  const [error, setError] = useState(false);
  const polling = useRef<'idle' | 'active' | 'unavailable'>('idle');
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const refreshPending = useRef(false);
  const refresh = useCallback(async (): Promise<void> => {
    if (!storyId) return;
    if (inFlight.current) {
      refreshPending.current = true;
      return;
    }
    inFlight.current = true;
    const currentController = new AbortController();
    controller.current = currentController;
    try {
      const response = await fetch(
        `/api/stories/${encodeURIComponent(storyId)}/audiobook-progress`,
        { cache: 'no-store', signal: currentController.signal },
      );
      if (currentController.signal.aborted) return;
      if (response.status === 404) {
        polling.current = 'unavailable';
        refreshPending.current = false;
        setProgress(null);
        setError(true);
        return;
      }
      if (!response.ok) throw new Error('Progress unavailable');
      const data: AudiobookProgress = await response.json();
      if (currentController.signal.aborted) return;
      polling.current = data.audiobookGenerationStatus === 'generating' ? 'active' : 'idle';
      setProgress(data);
      setError(false);
    } catch {
      if (!currentController.signal.aborted) {
        polling.current = 'active';
        setError(true);
      }
    } finally {
      if (controller.current === currentController) {
        inFlight.current = false;
        controller.current = null;
        if (refreshPending.current) {
          refreshPending.current = false;
          void refresh();
        }
      }
    }
  }, [storyId]);
  useEffect(() => {
    polling.current = 'idle';
    setProgress(null);
    setError(false);
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden && polling.current === 'active') void refresh();
    }, 10000);
    const onVisibility = () => {
      if (!document.hidden && polling.current !== 'unavailable') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      controller.current?.abort();
      controller.current = null;
      inFlight.current = false;
      refreshPending.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);
  return { progress, error, refresh };
}
