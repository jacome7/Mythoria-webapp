'use server';

import { cookies } from 'next/headers';
import {
  INTENT_CONTEXT_COOKIE,
  INTENT_CONTEXT_MAX_AGE,
  type IntentContext,
} from '@/types/intent-context';

/**
 * Store intent context in an HTTP-only cookie
 * This is called from the intent detection route before redirecting
 */
export async function storeIntentContext(context: IntentContext): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(INTENT_CONTEXT_COOKIE, JSON.stringify(context), {
    httpOnly: false, // Allow client-side access if needed
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INTENT_CONTEXT_MAX_AGE,
    path: '/',
  });
}

/**
 * Retrieve intent context from cookie
 * This is called on the homepage to pass context to InfiniteGallery
 */
export async function getIntentContext(): Promise<IntentContext | null> {
  const cookieStore = await cookies();
  const contextCookie = cookieStore.get(INTENT_CONTEXT_COOKIE);

  if (!contextCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(contextCookie.value) as IntentContext;
  } catch (error) {
    console.error('Failed to parse intent context cookie:', error);
    return null;
  }
}

/**
 * Clear intent context cookie
 */
export async function clearIntentContext(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(INTENT_CONTEXT_COOKIE);
}
