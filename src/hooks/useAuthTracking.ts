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
  const hasTrackedSignupRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    const prevSignedIn = prevSignedInRef.current;
    const currentSignedIn = isSignedIn; // Track sign up (user went from not signed in to signed in, and it's a new user)
    if (!prevSignedIn && currentSignedIn && user && user.createdAt) {
      const createdAt = new Date(user.createdAt);
      const now = new Date();
      const timeDiff = now.getTime() - createdAt.getTime();
      const isNewUser = timeDiff < 5 * 60 * 1000; // Within 5 minutes is considered "new"

      if (isNewUser && !hasTrackedSignupRef.current) {
        trackAuth.signUp({
          user_id: user.id,
          sign_up_method: user.primaryEmailAddress ? 'email' : 'social',
        });

        hasTrackedSignupRef.current = true;
      } else if (!hasTrackedSignupRef.current) {
        // Existing user logging in
        trackAuth.login({
          user_id: user.id,
          login_method: user.primaryEmailAddress ? 'email' : 'social',
        });
      }

      // Set user properties for analytics
      setUserId(user.id);
      setUserProperties({
        signup_date: user.createdAt.toISOString(),
        email_verified: !!user.primaryEmailAddress?.verification.status,
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
