import type { AnalyticsConsent } from '@/db/schema';

export function readAnalyticsConsentCookie(value?: string): AnalyticsConsent | undefined {
  if (!value) return undefined;
  try {
    const stored = JSON.parse(decodeURIComponent(value)) as {
      state?: { analytics_storage?: unknown; ad_user_data?: unknown; ad_personalization?: unknown };
    };
    if (stored.state?.analytics_storage !== 'granted') return undefined;
    return {
      analyticsStorage: 'granted',
      adUserData: stored.state.ad_user_data === 'granted' ? 'granted' : 'denied',
      adPersonalization: stored.state.ad_personalization === 'granted' ? 'granted' : 'denied',
    };
  } catch {
    return undefined;
  }
}
