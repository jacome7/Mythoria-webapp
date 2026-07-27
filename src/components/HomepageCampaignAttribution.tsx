'use client';

import { useEffect, useRef } from 'react';
import type { StoryIntent } from '@/constants/intents';
import { collectCampaignParams } from '@/lib/campaign-context';
import { getGoogleAnalyticsContext } from '@/lib/analytics';
import { CONSENT_UPDATED_EVENT } from '@/lib/consent';

const RETRY_DELAYS_MS = [0, 750, 2_000, 5_000] as const;

export default function HomepageCampaignAttribution({
  primaryIntent,
}: {
  primaryIntent: StoryIntent | null;
}) {
  const capturedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const campaign = collectCampaignParams(search);
    if (!primaryIntent && Object.keys(campaign).length === 0) return;
    const signature = JSON.stringify({
      landingSlug: 'homepage',
      primaryIntent,
      campaign: Object.fromEntries(
        Object.entries(campaign).sort(([left], [right]) => left.localeCompare(right)),
      ),
    });
    const storageKey = `mythoria_attribution_capture:${signature}`;
    if (window.sessionStorage.getItem(storageKey) === 'captured') {
      capturedRef.current = true;
      return;
    }

    const capture = async () => {
      if (capturedRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      const analyticsContext = await getGoogleAnalyticsContext();
      if (!analyticsContext) {
        inFlightRef.current = false;
        return;
      }
      try {
        const response = await fetch('/api/analytics/attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analyticsContext,
            landingSlug: 'homepage',
            ...(primaryIntent ? { primaryIntent } : {}),
            campaign,
          }),
          keepalive: true,
        });
        const result = (await response.json().catch(() => null)) as { captured?: boolean } | null;
        if (!response.ok || !result?.captured) return;

        capturedRef.current = true;
        window.sessionStorage.setItem(storageKey, 'captured');
        void fetch('/api/analytics/attribution/link', {
          method: 'POST',
          keepalive: true,
        }).catch(() => {
          // Signed-out visitors are linked after authentication.
        });
      } catch {
        // Attribution is best-effort; later retries may still succeed.
      } finally {
        inFlightRef.current = false;
      }
    };

    const timers = RETRY_DELAYS_MS.map((delay) => window.setTimeout(() => void capture(), delay));
    const handleConsentUpdated = () => void capture();
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    };
  }, [primaryIntent]);

  return null;
}
