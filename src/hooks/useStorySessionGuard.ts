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
  const [storyId, setStoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!hasValidStorySession()) {
      router.push('/tell-your-story/step-1');
      return;
    }

    setStoryId(getCurrentStoryId());
  }, [router, enabled]);

  return storyId;
}

export default useStorySessionGuard;
