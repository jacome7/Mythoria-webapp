'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CONSENT_UPDATED_EVENT, type ConsentUpdatedDetail } from '@/lib/consent';
import { conversions } from '@/lib/openai-ads/events';
import { hashForOpenAiBrowser } from '@/lib/openai-ads/hashing';
import {
  getOpenAiPixelId,
  hasAdvertisingConsent,
  identifyOpenAiPixelUser,
  loadOpenAiPixel,
  openAiRouteTemplate,
  revokeOpenAiPixelConsent,
  trackOpenAiAdsEvent,
  type OpenAiPixelUser,
} from '@/lib/openai-ads/pixel';

// Re-running `init` with user data is only needed once per signed-in user per page load.
let matchedUserId: string | undefined;

async function buildPixelUser(user: {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<OpenAiPixelUser> {
  const [email, externalId, firstName, lastName] = await Promise.all([
    hashForOpenAiBrowser('email', user.primaryEmailAddress?.emailAddress),
    hashForOpenAiBrowser('external_id', user.id),
    hashForOpenAiBrowser('name', user.firstName),
    hashForOpenAiBrowser('name', user.lastName),
  ]);
  return {
    ...(email ? { email_sha256: email } : {}),
    ...(externalId ? { external_id_sha256: externalId } : {}),
    ...(firstName ? { first_name_sha256: firstName } : {}),
    ...(lastName ? { last_name_sha256: lastName } : {}),
  };
}

function OpenAIAdsPixelTracker() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const [advertisingGranted, setAdvertisingGranted] = useState(false);
  const lastPageViewRef = useRef<string | undefined>(undefined);

  // Consent: read the stored choice after mount, then follow every update.
  useEffect(() => {
    setAdvertisingGranted(hasAdvertisingConsent());
    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      setAdvertisingGranted(detail?.preferences?.advertising === true);
    };
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
  }, []);

  useEffect(() => {
    if (advertisingGranted) {
      loadOpenAiPixel();
    } else {
      revokeOpenAiPixelConsent();
      lastPageViewRef.current = undefined;
      matchedUserId = undefined;
    }
  }, [advertisingGranted]);

  // SPA page views, one per pathname (query strings are never sent).
  useEffect(() => {
    if (!advertisingGranted || !pathname) return;
    if (lastPageViewRef.current === pathname) return;
    lastPageViewRef.current = pathname;
    trackOpenAiAdsEvent(conversions.pageViewed(openAiRouteTemplate(pathname)));
  }, [advertisingGranted, pathname]);

  // Advanced matching with hashed identifiers for signed-in users.
  const signedInUser = isLoaded && isSignedIn && user ? user : undefined;
  const signedInUserRef = useRef(signedInUser);
  signedInUserRef.current = signedInUser;
  const signedInUserId = signedInUser?.id;
  useEffect(() => {
    if (!signedInUserId) {
      if (isLoaded) matchedUserId = undefined;
      return;
    }
    const currentUser = signedInUserRef.current;
    if (!advertisingGranted || !currentUser || matchedUserId === signedInUserId) return;
    matchedUserId = signedInUserId;
    let settled = false;
    let cancelled = false;
    const release = () => {
      if (matchedUserId === signedInUserId) matchedUserId = undefined;
    };
    void buildPixelUser(currentUser)
      .then((pixelUser) => {
        settled = true;
        if (cancelled || !hasAdvertisingConsent()) return release();
        if (Object.keys(pixelUser).length > 0) identifyOpenAiPixelUser(pixelUser);
      })
      .catch(() => {
        settled = true;
        release();
      });
    return () => {
      cancelled = true;
      // An unfinished hash never reached the Pixel, so let the next run try again.
      if (!settled) release();
    };
  }, [advertisingGranted, isLoaded, signedInUserId]);

  return null;
}

/** OpenAI (ChatGPT Ads) Measurement Pixel, loaded only with Advertising consent. */
export default function OpenAIAdsPixel() {
  if (!getOpenAiPixelId()) return null;
  return <OpenAIAdsPixelTracker />;
}

/** Test-only: resets the per-page user matching state. */
export function __resetOpenAIAdsPixelForTests(): void {
  matchedUserId = undefined;
}
