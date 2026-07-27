'use client';

import { useMemo } from 'react';
import type { IntentContext } from '@/types/intent-context';
import { INTENT_CONTEXT_COOKIE } from '@/types/intent-context';
import { readIntentContextFromDocumentCookie } from '@/lib/campaign-context';

/**
 * Client-side hook to read intent context from cookies
 * This allows the client component to access the context stored by the server
 */
export function useIntentContext(): IntentContext | null {
  const context = useMemo(() => {
    if (typeof document === 'undefined') return null;

    return readIntentContextFromDocumentCookie(document.cookie, INTENT_CONTEXT_COOKIE);
  }, []);

  return context;
}
