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
      const method = normalizeAuthMethod(user.externalAccounts?.[0]?.provider);

      // Associate the event with Clerk's stable User-ID before emitting it.
      setUserId(user.id);

      if (!hasTrackedAuthEventRef.current) {
        trackAuth.login({
          user_id: user.id,
          method,
        });
        hasTrackedAuthEventRef.current = true;
      }

      void fetch('/api/analytics/attribution/link', { method: 'POST' }).catch(() => {
        // Attribution is best-effort and must never interrupt authentication.
      });

      // Set user properties for analytics
      setUserProperties({
        signup_date: user.createdAt.toISOString(),
        email_verified: user.primaryEmailAddress?.verification.status === 'verified',
        profile_complete: !!(user.firstName && user.lastName),
      });
    }

    if (prevSignedIn && !currentSignedIn) {
      setUserId(null);
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

export function normalizeAuthMethod(provider?: string | null): string {
  if (!provider) return 'email';

  return (
    provider
      .toLowerCase()
      .replace(/^oauth_?/, '')
      .replace(/^saml_?/, '') || 'social'
  );
}
