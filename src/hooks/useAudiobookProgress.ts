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
  const progressRef = useRef<AudiobookProgress | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef(false);
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
      if (!response.ok) throw new Error('Progress unavailable');
      const data: AudiobookProgress = await response.json();
      progressRef.current = data;
      setProgress(data);
      errorRef.current = false;
      setError(false);
    } catch {
      if (!currentController.signal.aborted) {
        errorRef.current = true;
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
    progressRef.current = null;
    errorRef.current = false;
    setProgress(null);
    setError(false);
    void refresh();
    const interval = setInterval(() => {
      if (
        !document.hidden &&
        (errorRef.current || progressRef.current?.audiobookGenerationStatus === 'generating')
      )
        void refresh();
    }, 10000);
    const onVisibility = () => {
      if (!document.hidden) void refresh();
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
