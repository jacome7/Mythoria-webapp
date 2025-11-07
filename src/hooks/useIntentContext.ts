'use client';

import { useMemo } from 'react';
import type { IntentContext } from '@/types/intent-context';
import { INTENT_CONTEXT_COOKIE } from '@/types/intent-context';

/**
 * Client-side hook to read intent context from cookies
 * This allows the client component to access the context stored by the server
 */
export function useIntentContext(): IntentContext | null {
  const context = useMemo(() => {
    if (typeof document === 'undefined') return null;

    // Read from cookie
    const cookies = document.cookie.split(';');
    const contextCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${INTENT_CONTEXT_COOKIE}=`)
    );

    if (contextCookie) {
      try {
        const value = contextCookie.split('=')[1];
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        return parsed as IntentContext;
      } catch (error) {
        console.error('Failed to parse intent context from cookie:', error);
        return null;
      }
    }

    return null;
  }, []);

  return context;
}
