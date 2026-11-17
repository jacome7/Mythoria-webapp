'use server';

import { cookies } from 'next/headers';
import {
  INTENT_CONTEXT_COOKIE,
  INTENT_CONTEXT_MAX_AGE,
  type IntentContext,
} from '@/types/intent-context';
import { parseIntentContext, serializeIntentContext } from '@/lib/campaign-context';

/**
 * Store intent context in a cookie shared by the server and browser.
 */
export async function storeIntentContext(context: IntentContext): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(INTENT_CONTEXT_COOKIE, serializeIntentContext(context), {
    httpOnly: false, // Allow client-side access if needed
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INTENT_CONTEXT_MAX_AGE,
    path: '/',
  });
}

/**
 * Retrieve the validated intent context for the server-rendered website theme.
 */
export async function getIntentContext(): Promise<IntentContext | null> {
  const cookieStore = await cookies();
  const contextCookie = cookieStore.get(INTENT_CONTEXT_COOKIE);

  if (!contextCookie?.value) {
    return null;
  }

  return parseIntentContext(contextCookie.value);
}

/**
 * Clear intent context cookie
 */
export async function clearIntentContext(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(INTENT_CONTEXT_COOKIE);
}
