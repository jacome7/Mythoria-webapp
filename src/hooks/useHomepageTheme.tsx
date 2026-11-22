'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/config/locales';
import {
  getValidatedIntent,
  parseIntentContext,
  serializeIntentContext,
} from '@/lib/campaign-context';
import { resolveWebsiteTheme } from '@/constants/websiteTheme';
import {
  INTENT_CONTEXT_COOKIE,
  INTENT_CONTEXT_MAX_AGE,
  type IntentContext,
} from '@/types/intent-context';

const WebsiteIntentContext = createContext<IntentContext | null>(null);
const cookiePrefix = `${INTENT_CONTEXT_COOKIE}=`;
const intentCookieChanged = 'mythoria:intent-cookie-changed';

function readIntentCookie(): string {
  return (
    document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length) ?? ''
  );
}

function subscribeToIntentCookie(onChange: () => void) {
  window.cookieStore?.addEventListener('change', onChange);
  window.addEventListener(intentCookieChanged, onChange);
  return () => {
    window.cookieStore?.removeEventListener('change', onChange);
    window.removeEventListener(intentCookieChanged, onChange);
  };
}

function persistIntentContext(context: IntentContext, existing: IntentContext | null) {
  if (context.intent === existing?.intent && context.recipient === existing?.recipient) return;

  const value = encodeURIComponent(serializeIntentContext(context));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookiePrefix}${value}; Path=/; Max-Age=${INTENT_CONTEXT_MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(intentCookieChanged));
}

// Prefetches do not write campaign cookies. Persist context when a cached
// landing page actually becomes current and no new middleware response arrives.
export function LandingPageIntentEntry({
  locale,
  slug,
  landingContext,
}: {
  locale: string;
  slug: string;
  landingContext: IntentContext | null;
}) {
  const pathname = usePathname();
  const queryIntent = getValidatedIntent(useSearchParams()?.get('intent'));

  useLayoutEffect(() => {
    if (pathname !== `/${locale}/lp/${slug}`) return;
    const existing = parseIntentContext(readIntentCookie());
    const context = queryIntent
      ? { ...(landingContext ?? existing), intent: queryIntent }
      : landingContext;
    if (context) persistIntentContext(context, existing);
  }, [landingContext, locale, pathname, queryIntent, slug]);

  return null;
}

export function HomepageThemeProvider({
  children,
  initialIntentContext,
}: {
  children: React.ReactNode;
  initialIntentContext: IntentContext | null;
}) {
  // A shared layout stays mounted through navigation. Subscribe to route changes as
  // well as cookie changes so the cookie is reread even without the Cookie Store API.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawCookie = useSyncExternalStore(subscribeToIntentCookie, readIntentCookie, () =>
    initialIntentContext ? serializeIntentContext(initialIntentContext) : '',
  );
  const parts = pathname?.split('/').filter(Boolean) ?? [];
  const isHomepage = SUPPORTED_LOCALES.includes(parts[0]) && parts.length === 1;
  const isCampaignEntry =
    SUPPORTED_LOCALES.includes(parts[0]) &&
    (parts.length === 1 || (parts.length === 3 && parts[1] === 'lp'));
  const queryIntent = isCampaignEntry ? getValidatedIntent(searchParams?.get('intent')) : null;
  const context = useMemo(() => {
    const cookieContext = parseIntentContext(rawCookie);
    return queryIntent ? { ...cookieContext, intent: queryIntent } : cookieContext;
  }, [rawCookie, queryIntent]);
  const theme = resolveWebsiteTheme(context?.intent);

  useLayoutEffect(() => {
    if (!isHomepage || !queryIntent) return;
    const existing = parseIntentContext(readIntentCookie());
    persistIntentContext({ ...existing, intent: queryIntent }, existing);
  }, [isHomepage, pathname, queryIntent]);

  useLayoutEffect(() => {
    document.documentElement.dataset.websiteTheme = theme;
  }, [theme]);

  return <WebsiteIntentContext.Provider value={context}>{children}</WebsiteIntentContext.Provider>;
}

export function useWebsiteIntentContext(): IntentContext | null {
  return useContext(WebsiteIntentContext);
}

export function useHomepageTheme() {
  return resolveWebsiteTheme(useWebsiteIntentContext()?.intent);
}
