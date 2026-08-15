'use client';

import { useEffect } from 'react';
import type { LandingPageAnalyticsConfig } from '@/content/landing-pages/types';
import { getGoogleAnalyticsContext, trackEvent } from '@/lib/analytics';
import { collectCampaignParams } from '@/lib/campaign-context';
import { CONSENT_UPDATED_EVENT, getStoredConsent, type ConsentUpdatedDetail } from '@/lib/consent';

const landingViewDedupe = new Set<string>();

export function resetLandingAnalyticsDedupeForTests(): void {
  landingViewDedupe.clear();
}

export default function LandingAnalytics({
  landingSlug,
  primaryIntent,
  locale,
  analytics,
}: {
  landingSlug: string;
  primaryIntent: string;
  locale: string;
  analytics?: LandingPageAnalyticsConfig;
}) {
  useEffect(() => {
    const pageViewEvent = analytics?.pageViewEvent;
    const variant = analytics?.variant ?? 'default';
    let disposed = false;

    const emitLandingView = async () => {
      if (!pageViewEvent || getStoredConsent()?.state.analytics_storage !== 'granted') return;
      const context = await getGoogleAnalyticsContext({ forceRefresh: true });
      if (disposed || !context?.sessionId) return;
      const signature = [context.sessionId, window.location.pathname, pageViewEvent, variant].join(
        ':',
      );
      if (landingViewDedupe.has(signature)) return;
      landingViewDedupe.add(signature);
      trackEvent(pageViewEvent, {
        landing_slug: landingSlug,
        locale,
        ...(pageViewEvent === 'landing_page_view' ? { primary_intent: primaryIntent } : {}),
        variant,
      });
    };

    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ConsentUpdatedDetail>).detail;
      if (detail.state.analytics_storage === 'granted') void emitLandingView();
    };

    void emitLandingView();
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);

    const seen = new Set<string>();
    const timers = new Map<Element, number>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-analytics-section]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const sectionId = element.dataset.analyticsSection;
          if (!sectionId || seen.has(sectionId)) return;
          const pending = timers.get(element);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (pending) return;
            const timer = window.setTimeout(() => {
              seen.add(sectionId);
              timers.delete(element);
              trackEvent('landing_section_view', {
                landing_slug: landingSlug,
                primary_intent: primaryIntent,
                section_id: sectionId,
                section_position: Number(element.dataset.sectionPosition || 0),
              });
              observer.unobserve(element);
            }, 1000);
            timers.set(element, timer);
          } else if (pending) {
            window.clearTimeout(pending);
            timers.delete(element);
          }
        });
      },
      { threshold: [0.5] },
    );
    sections.forEach((section) => observer.observe(section));

    const clickHandler = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('[data-cta-placement]');
      if (!target) return;
      const ctaPlacement = target.dataset.ctaPlacement || 'unknown';
      const selectedIntent = target.dataset.primaryIntent || primaryIntent;
      const challengeId = target.dataset.challengeId;

      if (challengeId) {
        trackEvent('challenge_selected', {
          landing_slug: landingSlug,
          challenge_id: challengeId,
          route_tone: target.dataset.routeTone || 'unknown',
          locale,
          variant: analytics?.variant ?? 'default',
        });
      }

      trackEvent('landing_cta_click', {
        landing_slug: landingSlug,
        primary_intent: selectedIntent,
        cta_placement: ctaPlacement,
        cta_destination: target.getAttribute('href')?.split('?')[0] || '',
      });

      if (target.dataset.captureAttribution === 'true') {
        void captureAttribution(landingSlug, selectedIntent);
      }
    };
    document.addEventListener('click', clickHandler);

    return () => {
      disposed = true;
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('click', clickHandler);
    };
  }, [analytics, landingSlug, locale, primaryIntent]);

  return null;
}

async function captureAttribution(landingSlug: string, primaryIntent: string) {
  const analyticsContext = await getGoogleAnalyticsContext();
  if (!analyticsContext) return;
  const response = await fetch('/api/analytics/attribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analyticsContext,
      landingSlug,
      primaryIntent,
      campaign: collectCampaignParams(new URLSearchParams(window.location.search)),
    }),
    keepalive: true,
  });
  await response.json().catch(() => null);
}
