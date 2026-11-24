'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { clearGoogleAnalyticsContextCache, getGoogleAnalyticsContext } from '@/lib/analytics';
import { sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';
import {
  captureAnalyticsAttribution,
  clearAnalyticsAttributionReceipt,
} from '@/lib/analytics/receipt-client';
import { CAMPAIGN_QUERY_KEYS, collectCampaignParams } from '@/lib/campaign-context';
import {
  CONSENT_UPDATED_EVENT,
  ensureConsentChoice,
  getStoredConsent,
  type ConsentUpdatedDetail,
} from '@/lib/consent';

const LINK_RETRY_DELAYS_MS = [0, 250, 500, 1_000, 2_000] as const;
// GA signup may already be claimed while account linkage succeeds.
const PENDING_SIGN_UP_RETRY_DELAYS_MS = [
  0, 250, 500, 1_000, 2_000, 5_000, 15_000, 30_000, 60_000, 60_000, 60_000, 70_000,
] as const;

function clearCampaignFromCurrentUrl(): void {
  const url = new URL(window.location.href);
  if (
    /^\/[a-z]{2}-[A-Z]{2}\/(?:p|s|stories\/read)\//.test(url.pathname) &&
    url.searchParams.get('utm_campaign') === 'story_share'
  )
    return;
  const originalSearch = url.search;
  for (const key of [
    ...CAMPAIGN_QUERY_KEYS,
    'landing_path',
    'landingPath',
    'landing_slug',
    'landingSlug',
    'primary_intent',
    'primaryIntent',
  ]) {
    url.searchParams.delete(key);
  }
  if (url.search !== originalSearch) {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
}

async function linkAttribution(
  endpoint: string,
  requireAnalytics: boolean,
  isActive = () => true,
): Promise<boolean> {
  const delays = requireAnalytics ? PENDING_SIGN_UP_RETRY_DELAYS_MS : LINK_RETRY_DELAYS_MS;
  let signupPending = false;
  for (const [index, delayMs] of delays.entries()) {
    if (index === LINK_RETRY_DELAYS_MS.length && !signupPending) return false;
    if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    if (
      !isActive() ||
      (requireAnalytics && getStoredConsent()?.state.analytics_storage !== 'granted')
    ) {
      return false;
    }
    try {
      const response = await fetch(endpoint, { method: 'POST', keepalive: true });
      if (response.status === 401 || response.status >= 500) continue;
      if (!response.ok) return false;
      const result = (await response.json().catch(() => null)) as {
        linked?: boolean;
        signUpPending?: boolean;
      } | null;
      signupPending = result?.signUpPending === true;
      if (requireAnalytics && (result?.linked !== true || signupPending)) continue;
      return true;
    } catch {
      // A short retry covers browser navigation and Clerk hydration races.
    }
  }
  return false;
}

export default function AnalyticsAttributionCoordinator() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const author = isLoaded && isSignedIn ? user?.id : undefined;
  const currentAuthor = useRef(author);
  currentAuthor.current = author;
  const linkedAuthor = useRef<string | undefined>(undefined);
  const linkedEmailAuthor = useRef<string | undefined>(undefined);
  const lastCapture = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!author) {
      linkedEmailAuthor.current = undefined;
      linkedAuthor.current = undefined;
      return;
    }
    if (linkedEmailAuthor.current !== author) {
      linkedEmailAuthor.current = author;
      void linkAttribution('/api/email-campaign-attribution/link', false);
    }
  }, [author]);

  useEffect(() => {
    let disposed = false;
    const capture = async (includeCurrentCampaign: boolean) => {
      if (getStoredConsent()?.state.analytics_storage !== 'granted') return;
      const url = new URL(window.location.href);
      const safePath = sanitizeAnalyticsPathname(url.pathname);
      const signature = safePath + (includeCurrentCampaign ? url.search : '');
      const signedInAuthor = currentAuthor.current;
      if (lastCapture.current === signature && signedInAuthor === linkedAuthor.current) return;
      lastCapture.current = signature;

      const campaign = includeCurrentCampaign ? collectCampaignParams(url.searchParams) : undefined;
      const analyticsContext = await getGoogleAnalyticsContext({ timeoutMs: 500 });
      if (disposed || getStoredConsent()?.state.analytics_storage !== 'granted') return;

      // A raw share path is required only for the first-party legacy link validation.
      const landingPath =
        campaign?.utm_campaign === 'story_share' &&
        /^\/[a-z]{2}-[A-Z]{2}\/(?:p|s)\//.test(url.pathname)
          ? url.pathname
          : safePath;
      const captured = await captureAnalyticsAttribution({
        analyticsContext,
        landingPath,
        campaign,
      });
      if (disposed) return;
      if (!captured) {
        lastCapture.current = undefined;
        return;
      }
      clearCampaignFromCurrentUrl();
      if (signedInAuthor && linkedAuthor.current !== signedInAuthor) {
        if (
          await linkAttribution(
            '/api/analytics/attribution/link',
            true,
            () => !disposed && currentAuthor.current === signedInAuthor,
          )
        ) {
          linkedAuthor.current = signedInAuthor;
        }
      }
    };

    const onConsent = (event: Event) => {
      const { state } = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      clearGoogleAnalyticsContextCache();
      if (state.analytics_storage !== 'granted') {
        clearAnalyticsAttributionReceipt();
        linkedAuthor.current = undefined;
        lastCapture.current = undefined;
        clearCampaignFromCurrentUrl();
        return;
      }
      // A grant starts a new observation window. Earlier navigation and campaign touches are discarded.
      clearCampaignFromCurrentUrl();
      void capture(false);
    };

    const consent = getStoredConsent()?.state;
    if (consent?.analytics_storage === 'granted') void capture(true);
    else if (consent) clearCampaignFromCurrentUrl();
    else if (/\/sign-up(?:\/|$)/.test(pathname)) void ensureConsentChoice();

    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    return () => {
      disposed = true;
      window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
    };
  }, [author, pathname]);

  return null;
}
