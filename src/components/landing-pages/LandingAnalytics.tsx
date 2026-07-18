'use client';

import { useEffect } from 'react';
import type { LandingPageAnalyticsConfig } from '@/content/landing-pages/types';
import { getGoogleAnalyticsContext, trackEvent } from '@/lib/analytics';

const CAMPAIGN_KEYS = [
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
    if (analytics?.pageViewEvent) {
      trackEvent(analytics.pageViewEvent, {
        landing_slug: landingSlug,
        locale,
        ...(analytics.pageViewEvent === 'landing_page_view'
          ? { primary_intent: primaryIntent }
          : {}),
        variant: analytics.variant ?? 'default',
      });
    }

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
  const search = new URLSearchParams(window.location.search);
  const campaign = Object.fromEntries(
    CAMPAIGN_KEYS.flatMap((key) => {
      const value = search.get(key);
      return value && value.length <= 255 ? [[key, value]] : [];
    }),
  );
  await fetch('/api/analytics/attribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analyticsContext, landingSlug, primaryIntent, campaign }),
    keepalive: true,
  });
}
