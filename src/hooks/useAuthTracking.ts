'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { trackAuth } from '../lib/analytics';

/** The first loaded Clerk state establishes a baseline for consented login diagnostics. */
export function useAuthTracking() {
  const { isLoaded, isSignedIn, user } = useUser();
  const wasSignedIn = useRef<boolean | undefined>(undefined);
  const method = normalizeAuthMethod(user?.externalAccounts?.[0]?.provider);

  useEffect(() => {
    if (!isLoaded) return;
    const signedIn = Boolean(isSignedIn);
    if (wasSignedIn.current === false && signedIn) trackAuth.login({ method });
    wasSignedIn.current = signedIn;
  }, [isLoaded, isSignedIn, method]);

  return { isSignedIn, user, isLoaded };
}

export function normalizeAuthMethod(provider?: string | null): string {
  if (!provider) return 'email';
  const method = provider
    .toLowerCase()
    .replace(/^oauth_?/, '')
    .replace(/^saml_?/, '');
  return ['apple', 'facebook', 'github', 'google', 'microsoft'].includes(method)
    ? method
    : 'social';
}
