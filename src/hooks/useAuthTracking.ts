'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import {
  clearUserAnalyticsContext,
  setUserId,
  setUserProperties,
  trackAuth,
} from '../lib/analytics';
import { CONSENT_UPDATED_EVENT, type ConsentUpdatedDetail } from '../lib/consent';

interface AnalyticsUserSnapshot {
  id: string;
  method: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

function applyUserAnalyticsContext(user: AnalyticsUserSnapshot): void {
  setUserId(user.id);
  setUserProperties({
    email_verified: user.emailVerified,
    profile_complete: user.profileComplete,
  });
}

/**
 * Hook to track authentication events using Clerk
 */
export function useAuthTracking() {
  const { isSignedIn, user, isLoaded } = useUser();
  const prevSignedInRef = useRef(false);
  const hasAuthBaselineRef = useRef(false);
  const activeUserRef = useRef<AnalyticsUserSnapshot | undefined>(undefined);

  activeUserRef.current =
    isLoaded && isSignedIn && user
      ? {
          id: user.id,
          method: normalizeAuthMethod(user.externalAccounts?.[0]?.provider),
          emailVerified: user.primaryEmailAddress?.verification.status === 'verified',
          profileComplete: !!(user.firstName && user.lastName),
        }
      : undefined;

  useEffect(() => {
    if (!isLoaded) return;

    const prevSignedIn = prevSignedInRef.current;
    const currentUser = activeUserRef.current;
    const currentSignedIn = Boolean(currentUser);

    // The first loaded Clerk state is a hydration baseline. A user who was already signed in
    // did not perform a new login during this page lifecycle.
    if (!hasAuthBaselineRef.current) {
      hasAuthBaselineRef.current = true;
      prevSignedInRef.current = currentSignedIn;
      if (currentUser) applyUserAnalyticsContext(currentUser);
      return;
    }

    if (!prevSignedIn && currentUser) {
      trackAuth.login({ user_id: currentUser.id, method: currentUser.method });
      setUserProperties({
        email_verified: currentUser.emailVerified,
        profile_complete: currentUser.profileComplete,
      });
    } else if (currentUser) {
      applyUserAnalyticsContext(currentUser);
    }

    if (prevSignedIn && !currentSignedIn) {
      clearUserAnalyticsContext();
    }

    prevSignedInRef.current = currentSignedIn;
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      if (detail.state.analytics_storage !== 'granted') {
        clearUserAnalyticsContext();
        return;
      }
      const currentUser = activeUserRef.current;
      if (currentUser) applyUserAnalyticsContext(currentUser);
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
  }, []);

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
