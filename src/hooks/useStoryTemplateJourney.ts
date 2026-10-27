'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseTemplateJourney, type StoryTemplateJourney } from '@/lib/story-templates/journey';

export const TEMPLATE_SESSION_KEY = 'storyTemplateJourney';

export function useStoryTemplateJourney(owner: string | null | undefined) {
  const [journey, setJourney] = useState<StoryTemplateJourney | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef(journey);
  const ownerRef = useRef(owner);
  const save = useCallback((next: StoryTemplateJourney | null) => {
    latest.current = next;
    setJourney(next);
    try {
      if (next)
        sessionStorage.setItem(
          TEMPLATE_SESSION_KEY,
          JSON.stringify({ owner: ownerRef.current, journey: next }),
        );
      else sessionStorage.removeItem(TEMPLATE_SESSION_KEY);
    } catch {
      /* Storage can be unavailable; the current in-memory journey remains usable. */
    }
  }, []);

  useEffect(() => {
    ownerRef.current = owner;
    if (!owner) {
      latest.current = null;
      setJourney(null);
      setReady(false);
      return;
    }
    let restored: StoryTemplateJourney | null = null;
    try {
      const raw = sessionStorage.getItem(TEMPLATE_SESSION_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data?.owner === owner) restored = parseTemplateJourney(data.journey);
    } catch {
      /* Ignore incompatible or damaged saved data. */
    }
    latest.current = restored;
    setJourney(restored);
    setReady(true);
  }, [owner]);

  return { journey, ready, save, latest };
}
