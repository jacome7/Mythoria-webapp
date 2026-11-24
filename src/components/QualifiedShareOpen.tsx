'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredConsent, CONSENT_UPDATED_EVENT } from '@/lib/consent';
import { ensureAnalyticsAttributionReceipt } from '@/lib/analytics/receipt-client';
import { storyShareFromCampaign } from '@/lib/analytics/story-share';

export default function QualifiedShareOpen({
  publicSlug,
  storyId,
}: {
  publicSlug?: string;
  storyId?: string;
}) {
  const pathname = usePathname();
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const campaign = Object.fromEntries(
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content'].map((key) => [
        key,
        query.get(key) || '',
      ]),
    );
    if (!storyShareFromCampaign(campaign)) return;
    let active = true;
    let attempted = false;
    const post = async () => {
      const consent = getStoredConsent();
      if (
        !active ||
        attempted ||
        document.visibilityState !== 'visible' ||
        consent?.state.analytics_storage !== 'granted'
      )
        return;
      attempted = true;
      try {
        if (!(await ensureAnalyticsAttributionReceipt())) {
          attempted = false;
          return;
        }
        if (!active || getStoredConsent()?.timestamp !== consent.timestamp) return;
        const response = await fetch('/api/analytics/qualified-share', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: publicSlug, storyId, campaign }),
        });
        if (!response.ok) attempted = false;
      } catch {
        attempted = false;
      }
    };
    const observe = () => {
      void post();
    };
    // Regrant begins observing a visible reader now, without replaying earlier interactions.
    const consentChanged = () => {
      attempted = false;
      observe();
    };
    observe();
    document.addEventListener('visibilitychange', observe);
    window.addEventListener(CONSENT_UPDATED_EVENT, consentChanged);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', observe);
      window.removeEventListener(CONSENT_UPDATED_EVENT, consentChanged);
    };
  }, [pathname, publicSlug, storyId]);
  return null;
}
