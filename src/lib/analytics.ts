'use client';

import { getStoredConsent } from './consent';
import type {
  ClientAnalyticsContext,
  GA4CheckoutPayload,
  GA4EcommerceItem,
} from './analytics/ecommerce';
import { readIntentContextFromDocumentCookie } from './campaign-context';
import { INTENT_CONTEXT_COOKIE } from '@/types/intent-context';
import { currentBrowserPageContext } from './analytics/page-context';
import {
  GA4_EVENT_NAMES,
  sanitizeAnalyticsEventParams,
  type GA4EventName,
} from './analytics/events';

export { GA4_EVENT_NAMES } from './analytics/events';
export type { GA4EventName } from './analytics/events';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const DEFAULT_MEASUREMENT_ID = 'G-86D0QFW197';
const isDebugModeEnabled = process.env.NEXT_PUBLIC_GA_DEBUG === 'true';

export type AnalyticsEvent = GA4EventName;

export interface AnalyticsEventParams {
  [key: string]:
    string | number | boolean | undefined | Record<string, unknown>[] | Record<string, unknown>;
}

export interface StoryEventParams extends AnalyticsEventParams {
  story_id?: string;
  story_genre?: string;
  total_chapters?: number;
  step?: number;
  step_number?: number;
  credits_spent?: number;
  run_id?: string;
  blocked_reason?: string;
}

export interface AuthEventParams extends AnalyticsEventParams {
  user_id?: string;
  method?: string;
}

export type PaidActionType = 'ebook' | 'audiobook' | 'print' | 'self_print' | 'ai_edit';
export type PaidActionStage = 'started' | 'completed' | 'failed';

export interface PaidActionEventParams extends AnalyticsEventParams {
  action_type: PaidActionType;
  action_stage?: PaidActionStage;
  credits_spent?: number;
  story_id?: string;
}

const getMeasurementId = (): string =>
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;

export function ensureGtag(): Window['gtag'] | null {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer.push(args);
    });
  return window.gtag;
}

/** Queue a consent-aware GA4 event without injecting high-cardinality page context. */
export function trackEvent(eventName: AnalyticsEvent, parameters?: Record<string, unknown>): void {
  const gtag = ensureGtag();
  if (!gtag) return;

  try {
    const primaryIntent = readIntentContextFromDocumentCookie(
      document.cookie,
      INTENT_CONTEXT_COOKIE,
    )?.intent;
    const safeParameters = sanitizeAnalyticsEventParams(eventName, parameters || {});
    if (!safeParameters) {
      console.warn('[Analytics] Event rejected by runtime contract', { eventName });
      return;
    }
    const eventParams = {
      ...(primaryIntent && parameters?.primary_intent === undefined
        ? { primary_intent: primaryIntent }
        : {}),
      ...safeParameters,
      send_to: getMeasurementId(),
      ...(isDebugModeEnabled ? { debug_mode: true } : {}),
    };
    gtag('event', eventName, eventParams);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Event tracked:', eventName, eventParams);
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', eventName, error);
  }
}

export function setUserId(userId: string | null): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  if (userId && getStoredConsent()?.state.analytics_storage !== 'granted') return;
  try {
    gtag('set', { user_id: userId });
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}

export const trackAuth = {
  signUpStarted: (params: AuthEventParams = {}) => trackEvent('sign_up_started', params),
  login: ({ user_id: userId, method }: AuthEventParams = {}) => {
    if (userId) setUserId(userId);
    trackEvent('login', { method: method || 'email' });
  },
};

interface ItemListParams {
  item_list_id: string;
  item_list_name: string;
  items: GA4EcommerceItem[];
}

export const trackCommerce = {
  viewItemList: (params: ItemListParams) => trackEvent('view_item_list', { ...params }),
  selectItem: (params: ItemListParams) => trackEvent('select_item', { ...params }),
  addToCart: (params: { currency: string; value: number; items: GA4EcommerceItem[] }) =>
    trackEvent('add_to_cart', params),
  removeFromCart: (params: { currency: string; value: number; items: GA4EcommerceItem[] }) =>
    trackEvent('remove_from_cart', params),
  checkoutStarted: (params: GA4CheckoutPayload) => trackEvent('begin_checkout', { ...params }),
};

const normalizedStepParams = (params: StoryEventParams): StoryEventParams => {
  const { step, ...rest } = params;
  return {
    ...rest,
    ...(params.step_number !== undefined
      ? { step_number: params.step_number }
      : step !== undefined
        ? { step_number: step }
        : {}),
  };
};

export const trackStoryCreation = {
  started: (params: StoryEventParams = {}) =>
    trackEvent('story_creation_started', normalizedStepParams(params)),
  stepCompleted: (params: StoryEventParams = {}) =>
    trackEvent('story_step_completed', normalizedStepParams(params)),
  stepViewed: (params: StoryEventParams = {}) =>
    trackEvent('story_step_viewed', normalizedStepParams(params)),
  generateClicked: (params: StoryEventParams = {}) =>
    trackEvent('story_generation_attempted', normalizedStepParams(params)),
  generationRequested: (params: StoryEventParams = {}) =>
    trackEvent('story_generation_requested', normalizedStepParams(params)),
};

export const trackPaidAction = (params: PaidActionEventParams): void => {
  trackEvent('paid_action', {
    action_type: params.action_type,
    action_stage: params.action_stage || 'started',
    credits_spent: params.credits_spent,
    story_id: params.story_id,
  });
};

export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  if (getStoredConsent()?.state.analytics_storage !== 'granted') return;
  try {
    gtag('set', 'user_properties', properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
}

/** Remove consent-gated identity data after logout or consent withdrawal. */
export function clearUserAnalyticsContext(): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  try {
    gtag('set', { user_id: null });
    gtag('set', 'user_properties', {
      email_verified: null,
      profile_complete: null,
      signup_date: null,
    });
  } catch (error) {
    console.error('Error clearing analytics user context:', error);
  }
}

const getGtagValue = (fieldName: 'client_id' | 'session_id', timeoutMs: number): Promise<unknown> =>
  new Promise((resolve) => {
    const gtag = ensureGtag();
    if (!gtag) {
      resolve(undefined);
      return;
    }
    let settled = false;
    const finish = (value: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(undefined), timeoutMs);
    gtag('get', getMeasurementId(), fieldName, finish);
  });

const CONTEXT_CACHE_MS = 5 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 100, 250, 500, 1_000, 2_000] as const;
let cachedAnalyticsContext: { value: ClientAnalyticsContext; expiresAt: number } | undefined;
let analyticsContextResolution: Promise<ClientAnalyticsContext | undefined> | undefined;

export function clearGoogleAnalyticsContextCache(): void {
  cachedAnalyticsContext = undefined;
  analyticsContextResolution = undefined;
}

async function resolveGoogleAnalyticsContext(
  deadline: number,
): Promise<ClientAnalyticsContext | undefined> {
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      const remainingBeforeDelay = deadline - Date.now();
      if (remainingBeforeDelay <= 0) break;
      await new Promise((resolve) =>
        window.setTimeout(resolve, Math.min(delayMs, remainingBeforeDelay)),
      );
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const attemptBudget = Math.min(500, remaining);
    const [rawClientId, rawSessionId] = await Promise.all([
      getGtagValue('client_id', attemptBudget),
      getGtagValue('session_id', attemptBudget),
    ]);
    const clientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
    if (!clientId) continue;

    const consent = getStoredConsent()?.state;
    if (consent?.analytics_storage !== 'granted') return undefined;
    const sessionId = Number(rawSessionId);
    const primaryIntent = readIntentContextFromDocumentCookie(
      document.cookie,
      INTENT_CONTEXT_COOKIE,
    )?.intent;
    return {
      clientId,
      ...(Number.isSafeInteger(sessionId) && sessionId > 0 ? { sessionId } : {}),
      ...(primaryIntent ? { primaryIntent } : {}),
      ...currentBrowserPageContext(),
      engagementTimeMsec: 100,
      consent: {
        analyticsStorage: 'granted',
        adUserData: consent.ad_user_data,
        adPersonalization: consent.ad_personalization,
      },
    };
  }
  return undefined;
}

/** Return consent-gated GA identifiers for server-side Measurement Protocol delivery. */
export async function getGoogleAnalyticsContext(
  timeoutOrOptions: number | { timeoutMs?: number; forceRefresh?: boolean } = 5_000,
): Promise<ClientAnalyticsContext | undefined> {
  const consent = getStoredConsent()?.state;
  if (consent?.analytics_storage !== 'granted') {
    clearGoogleAnalyticsContextCache();
    return undefined;
  }

  const options =
    typeof timeoutOrOptions === 'number'
      ? { timeoutMs: timeoutOrOptions, forceRefresh: false }
      : {
          timeoutMs: timeoutOrOptions.timeoutMs ?? 5_000,
          forceRefresh: false,
          ...timeoutOrOptions,
        };
  if (
    !options.forceRefresh &&
    cachedAnalyticsContext &&
    cachedAnalyticsContext.expiresAt > Date.now()
  ) {
    return {
      ...cachedAnalyticsContext.value,
      ...currentBrowserPageContext(),
      engagementTimeMsec: 100,
    };
  }

  analyticsContextResolution ??= resolveGoogleAnalyticsContext(
    Date.now() + Math.max(0, options.timeoutMs),
  ).then((context) => {
    if (context) {
      cachedAnalyticsContext = { value: context, expiresAt: Date.now() + CONTEXT_CACHE_MS };
    }
    analyticsContextResolution = undefined;
    return context;
  });
  const context = await analyticsContextResolution;
  return context
    ? { ...context, ...currentBrowserPageContext(), engagementTimeMsec: 100 }
    : undefined;
}
