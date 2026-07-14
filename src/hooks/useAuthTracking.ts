'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { trackAuth, setUserId, setUserProperties } from '../lib/analytics';

/**
 * Hook to track authentication events using Clerk
 */
export function useAuthTracking() {
  const { isSignedIn, user, isLoaded } = useUser();
  const prevSignedInRef = useRef<boolean | null>(null);
  const hasTrackedAuthEventRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    const prevSignedIn = prevSignedInRef.current;
    const currentSignedIn = isSignedIn;
    if (!prevSignedIn && currentSignedIn && user && user.createdAt) {
      const createdAt = new Date(user.createdAt);
      const now = new Date();
      const timeDiff = now.getTime() - createdAt.getTime();
      const isNewUser = timeDiff < 5 * 60 * 1000; // Within 5 minutes is considered "new"
      const method = normalizeAuthMethod(user.externalAccounts?.[0]?.provider);

      // Associate the event with Clerk's stable User-ID before emitting it.
      setUserId(user.id);

      if (isNewUser && !hasTrackedAuthEventRef.current && !hasStoredSignupMarker(user.id)) {
        trackAuth.signUp({
          user_id: user.id,
          method,
        });
        storeSignupMarker(user.id);
        hasTrackedAuthEventRef.current = true;
      } else if (!hasTrackedAuthEventRef.current) {
        // Existing user logging in
        trackAuth.login({
          user_id: user.id,
          method,
        });
        hasTrackedAuthEventRef.current = true;
      }

      // Set user properties for analytics
      setUserProperties({
        signup_date: user.createdAt.toISOString(),
        email_verified: user.primaryEmailAddress?.verification.status === 'verified',
        profile_complete: !!(user.firstName && user.lastName),
      });
    }

    // Track logout (user went from signed in to not signed in)
    if (prevSignedIn && !currentSignedIn) {
      trackAuth.logout();
    }

    // Update the ref for next comparison
    prevSignedInRef.current = currentSignedIn;
  }, [isLoaded, isSignedIn, user]);

  return {
    isSignedIn,
    user,
    isLoaded,
  };
}

const signupMarkerKey = (userId: string): string => `mythoria:analytics:signup:${userId}`;

export function normalizeAuthMethod(provider?: string | null): string {
  if (!provider) return 'email';

  return (
    provider
      .toLowerCase()
      .replace(/^oauth_?/, '')
      .replace(/^saml_?/, '') || 'social'
  );
}

export function hasStoredSignupMarker(userId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(signupMarkerKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function storeSignupMarker(userId: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(signupMarkerKey(userId), '1');
  } catch {
    // Analytics must not interrupt authentication when storage is unavailable.
  }
}
