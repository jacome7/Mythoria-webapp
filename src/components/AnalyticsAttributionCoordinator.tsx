'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { clearGoogleAnalyticsContextCache, getGoogleAnalyticsContext } from '@/lib/analytics';
import {
  CAMPAIGN_QUERY_KEYS,
  collectCampaignParams,
  getValidatedIntent,
  type CampaignParams,
} from '@/lib/campaign-context';
import {
  CONSENT_UPDATED_EVENT,
  ensureConsentChoice,
  getStoredConsent,
  type ConsentUpdatedDetail,
} from '@/lib/consent';

const PERSISTED_CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
] as const;

let transientCampaign: CampaignParams = {};
let captureInFlight: Promise<boolean> | undefined;
let linkInFlight: Promise<void> | undefined;
let lastCaptureSignature: string | undefined;
let linkedUserId: string | undefined;
const LINK_RETRY_DELAYS_MS = [0, 250, 500, 1_000, 2_000] as const;

function mergeCampaignFromLocation(): void {
  transientCampaign = {
    ...transientCampaign,
    ...collectCampaignParams(new URLSearchParams(window.location.search)),
  };
}

function appendTransientCampaign(url: URL): void {
  for (const [key, value] of Object.entries(transientCampaign)) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
}

function stripCampaignFromCurrentUrl(): void {
  const url = new URL(window.location.href);
  for (const key of CAMPAIGN_QUERY_KEYS) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

async function linkAuthenticatedAttribution(userId: string): Promise<void> {
  if (getStoredConsent()?.state.analytics_storage !== 'granted') return;
  if (linkedUserId === userId) return;
  if (linkInFlight) return linkInFlight;

  linkInFlight = (async () => {
    for (const delayMs of LINK_RETRY_DELAYS_MS) {
      if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      try {
        const response = await fetch('/api/analytics/attribution/link', {
          method: 'POST',
          keepalive: true,
        });
        if (response.status === 401 || response.status >= 500) continue;
        if (!response.ok) return;
        const result = (await response.json().catch(() => null)) as { linked?: boolean } | null;
        if (result?.linked) linkedUserId = userId;
        return;
      } catch {
        // Retry short authentication/network races without interrupting the user journey.
      }
    }
  })().finally(() => {
    linkInFlight = undefined;
  });

  return linkInFlight;
}

async function captureConsentedAttribution(
  pathname: string,
  authenticatedUserId?: string,
): Promise<void> {
  const consent = getStoredConsent()?.state;
  if (consent?.analytics_storage !== 'granted') return;

  const campaign = Object.fromEntries(
    PERSISTED_CAMPAIGN_KEYS.flatMap((key) =>
      transientCampaign[key] ? [[key, transientCampaign[key]]] : [],
    ),
  );
  const search = new URLSearchParams(window.location.search);
  const primaryIntent = getValidatedIntent(search.get('primaryIntent') || search.get('intent'));
  const signature = JSON.stringify({ pathname, primaryIntent, campaign });
  if (signature === lastCaptureSignature) {
    if (authenticatedUserId) await linkAuthenticatedAttribution(authenticatedUserId);
    return;
  }

  if (captureInFlight) {
    await captureInFlight;
    return captureConsentedAttribution(pathname, authenticatedUserId);
  }

  captureInFlight = (async () => {
    const analyticsContext = await getGoogleAnalyticsContext({ timeoutMs: 5_000 });
    if (!analyticsContext) {
      console.warn('[Analytics] GA4 context was unavailable after consent');
      return false;
    }

    const response = await fetch('/api/analytics/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analyticsContext,
        landingSlug: pathname,
        ...(primaryIntent ? { primaryIntent } : {}),
        campaign,
      }),
      keepalive: true,
    });
    const result = (await response.json().catch(() => null)) as { captured?: boolean } | null;
    if (!response.ok || !result?.captured) return false;

    lastCaptureSignature = signature;
    linkedUserId = undefined;
    transientCampaign = {};
    stripCampaignFromCurrentUrl();
    return true;
  })().finally(() => {
    captureInFlight = undefined;
  });

  const captured = await captureInFlight;
  if (captured && authenticatedUserId) {
    await linkAuthenticatedAttribution(authenticatedUserId);
  }
}

export default function AnalyticsAttributionCoordinator() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const authenticatedUserId = isLoaded && isSignedIn ? user?.id : undefined;
  const authenticatedUserIdRef = useRef(authenticatedUserId);
  authenticatedUserIdRef.current = authenticatedUserId;

  useEffect(() => {
    const consent = getStoredConsent()?.state;
    if (consent?.analytics_storage === 'granted') {
      mergeCampaignFromLocation();
      void captureConsentedAttribution(pathname, authenticatedUserId);
    } else if (!consent) {
      mergeCampaignFromLocation();
    } else {
      transientCampaign = {};
      stripCampaignFromCurrentUrl();
    }
    if (/\/(sign-up)(?:\/|$)/.test(pathname) && !consent) {
      void ensureConsentChoice();
    }
  }, [authenticatedUserId, pathname]);

  useEffect(() => {
    if (authenticatedUserId && getStoredConsent()?.state.analytics_storage === 'granted') {
      void linkAuthenticatedAttribution(authenticatedUserId);
    }
  }, [authenticatedUserId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (getStoredConsent()) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      appendTransientCampaign(url);
      anchor.href = url.toString();
    };

    const handleConsentUpdated = (event: Event) => {
      clearGoogleAnalyticsContextCache();
      const detail = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      if (detail.state.analytics_storage !== 'granted') {
        transientCampaign = {};
        lastCaptureSignature = undefined;
        linkedUserId = undefined;
        stripCampaignFromCurrentUrl();
        return;
      }
      mergeCampaignFromLocation();
      void captureConsentedAttribution(window.location.pathname, authenticatedUserIdRef.current);
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    };
  }, []);

  return null;
}
