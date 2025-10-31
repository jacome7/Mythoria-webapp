import { cookies } from 'next/headers';
import type { LeadSessionData } from '@/types/lead';

const LEAD_SESSION_COOKIE_NAME = 'mythoria_lead_session';
const LEAD_SESSION_TTL = 60 * 60; // 1 hour in seconds

/**
 * Lead Session Management
 * Handles storing and retrieving lead data in cookies for registration prefill
 */

/**
 * Set lead session cookie
 * Stores lead information for 1 hour with SameSite=Lax
 */
export async function setLeadSession(
  data: Omit<LeadSessionData, 'firstAccess' | 'hasBeenRedirected'>,
) {
  try {
    const sessionData: LeadSessionData = {
      ...data,
      firstAccess: Date.now(),
      hasBeenRedirected: false,
    };

    const cookieStore = await cookies();
    cookieStore.set(LEAD_SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: LEAD_SESSION_TTL,
      path: '/',
      // Set domain for entire domain (e.g., .mythoria.pt)
      // Only set domain in production to avoid localhost issues
      ...(process.env.NODE_ENV === 'production' && {
        domain: process.env.NEXT_PUBLIC_APP_DOMAIN || undefined,
      }),
    });

    console.log('[setLeadSession] Lead session created:', {
      leadId: data.leadId,
      email: data.email,
      language: data.language,
    });

    return true;
  } catch (error) {
    console.error('[setLeadSession] Error setting lead session:', error);
    return false;
  }
}

/**
 * Get lead session data from cookie
 */
export async function getLeadSession(): Promise<LeadSessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(LEAD_SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value) as LeadSessionData;

    // Validate session data structure
    if (!sessionData.leadId || !sessionData.email || !sessionData.language) {
      console.warn('[getLeadSession] Invalid session data structure');
      return null;
    }

    // Check if session has expired (shouldn't happen if maxAge works, but double-check)
    const sessionAge = Date.now() - sessionData.firstAccess;
    if (sessionAge > LEAD_SESSION_TTL * 1000) {
      console.log('[getLeadSession] Session expired');
      await clearLeadSession();
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('[getLeadSession] Error getting lead session:', error);
    return null;
  }
}

/**
 * Update lead session data (e.g., mark as redirected)
 */
export async function updateLeadSession(updates: Partial<LeadSessionData>) {
  try {
    const currentSession = await getLeadSession();
    if (!currentSession) {
      return false;
    }

    const updatedSession: LeadSessionData = {
      ...currentSession,
      ...updates,
    };

    const cookieStore = await cookies();
    cookieStore.set(LEAD_SESSION_COOKIE_NAME, JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: LEAD_SESSION_TTL,
      path: '/',
      ...(process.env.NODE_ENV === 'production' && {
        domain: process.env.NEXT_PUBLIC_APP_DOMAIN || undefined,
      }),
    });

    return true;
  } catch (error) {
    console.error('[updateLeadSession] Error updating lead session:', error);
    return false;
  }
}

/**
 * Clear lead session cookie
 */
export async function clearLeadSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(LEAD_SESSION_COOKIE_NAME);
    console.log('[clearLeadSession] Lead session cleared');
    return true;
  } catch (error) {
    console.error('[clearLeadSession] Error clearing lead session:', error);
    return false;
  }
}

/**
 * Check if this is the first access for a lead session
 * Used for one-time redirect logic from sign-in to sign-up
 */
export async function isFirstLeadAccess(): Promise<boolean> {
  const session = await getLeadSession();
  return session ? !session.hasBeenRedirected : false;
}
