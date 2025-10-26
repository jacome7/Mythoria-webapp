'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hasValidStorySession, getCurrentStoryId } from '@/lib/story-session';

interface Options {
  enabled?: boolean;
}

export function useStorySessionGuard(options: Options = {}): string | null {
  const { enabled = true } = options;
  const router = useRouter();

  // Get initial story ID during initialization
  const getInitialStoryId = (): string | null => {
    if (typeof window === 'undefined' || !enabled) return null;
    if (!hasValidStorySession()) return null;
    return getCurrentStoryId();
  };

  const [storyId] = useState<string | null>(getInitialStoryId);

  useEffect(() => {
    if (!enabled) return;

    if (!hasValidStorySession()) {
      router.push('/tell-your-story/step-1');
      return;
    }
  }, [router, enabled]);

  return storyId;
}

export default useStorySessionGuard;
