'use client';

import { getStoredConsent } from './consent';
import type {
  ClientAnalyticsContext,
  GA4CheckoutPayload,
  GA4PurchasePayload,
} from './analytics/ecommerce';
import { trackMythoriaConversionsEnhanced } from './googleAdsConversions';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const DEFAULT_MEASUREMENT_ID = 'G-86D0QFW197';
const isDebugModeEnabled = process.env.NEXT_PUBLIC_GA_DEBUG === 'true';

export const GA4_EVENT_NAMES = [
  'page_view',
  'sign_up_started',
  'sign_up',
  'sign_up_completed',
  'login',
  'logout',
  'story_creation_started',
  'story_step_1_completed',
  'story_step_2_completed',
  'story_step_3_completed',
  'story_step_4_completed',
  'story_generation_requested',
  'story_published',
  'pricing_viewed',
  'begin_checkout',
  'checkout_started',
  'credit_pack_purchased',
  'purchase',
  'audiobook_started',
  'print_order_started',
  'self_print_started',
  'share_link_created',
  'promo_code_redeemed',
] as const;

export type GA4EventName = (typeof GA4_EVENT_NAMES)[number];

export type AnalyticsEvent =
  | GA4EventName
  | 'story_creation_step_completed'
  | 'story_creation_step_viewed'
  | 'story_creation_generate_clicked'
  | 'paid_action';

export interface AnalyticsEventParams {
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | Record<string, unknown>[]
    | Record<string, unknown>;
}

export interface StoryEventParams extends AnalyticsEventParams {
  story_id?: string;
  story_genre?: string;
  total_chapters?: number;
  step?: number;
  credits_spent?: number;
  run_id?: string;
}

export interface AuthEventParams extends AnalyticsEventParams {
  user_id?: string;
  method?: string;
  sign_up_method?: string;
  login_method?: string;
}

export type CheckoutEventParams = GA4CheckoutPayload & {
  payment_method?: string;
};

export type CreditPurchaseEventParams = GA4PurchasePayload;

export type PaidActionType = 'ebook' | 'audiobook' | 'print' | 'self_print' | 'ai_edit';

export interface PaidActionEventParams extends AnalyticsEventParams {
  action_type: PaidActionType;
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

/** Queue a GA4 event even when the external Google tag is still loading. */
export function trackEvent(eventName: AnalyticsEvent, parameters?: Record<string, unknown>): void {
  const gtag = ensureGtag();
  if (!gtag) return;

  try {
    const eventParams = {
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_title: document.title,
      ...parameters,
      send_to: getMeasurementId(),
      ...(isDebugModeEnabled ? { debug_mode: true } : {}),
    };

    gtag('event', eventName, eventParams);

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Analytics] Event tracked:', eventName, eventParams);
    }
  } catch (error) {
    console.error('❌ [Analytics] Error tracking event:', eventName, error);
  }
}

export function setUserId(userId: string | null): void {
  const gtag = ensureGtag();
  if (!gtag) return;

  try {
    gtag('set', { user_id: userId });
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}

export const trackAuth = {
  signUpStarted: (params: AuthEventParams = {}) => trackEvent('sign_up_started', params),

  signUp: ({ user_id: userId, method, sign_up_method: legacyMethod }: AuthEventParams = {}) => {
    if (userId) setUserId(userId);
    const normalizedMethod = method || legacyMethod || 'email';

    trackEvent('sign_up', { method: normalizedMethod });
    trackEvent('sign_up_completed', { sign_up_method: normalizedMethod });
    trackMythoriaConversionsEnhanced.signUp(userId);
  },

  login: ({ user_id: userId, method, login_method: legacyMethod }: AuthEventParams = {}) => {
    if (userId) setUserId(userId);
    trackEvent('login', { method: method || legacyMethod || 'email' });
  },

  logout: (params: AuthEventParams = {}) => {
    const { user_id: _userId, ...eventParams } = params;
    trackEvent('logout', eventParams);
    setUserId(null);
  },
};

export const trackCommerce = {
  checkoutStarted: (params: CheckoutEventParams) => {
    const { payment_method: paymentMethod, ...ecommerce } = params;
    trackEvent('begin_checkout', ecommerce);
    trackEvent('checkout_started', {
      ...ecommerce,
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    });
  },

  creditPurchase: (params: CreditPurchaseEventParams) => {
    trackEvent('credit_pack_purchased', { ...params });
    trackEvent('purchase', { ...params });

    // The direct Ads conversion is retained during migration and uses the charged gross amount.
    trackMythoriaConversionsEnhanced.creditPurchase(
      params.gross_value,
      params.currency,
      params.transaction_id,
    );
  },
};

export const trackStoryCreation = {
  started: (params: StoryEventParams = {}) => trackEvent('story_creation_started', params),

  stepCompleted: (params: StoryEventParams = {}) => {
    const stepCompletedEvent =
      params.step && params.step >= 1 && params.step <= 4
        ? (`story_step_${params.step}_completed` as AnalyticsEvent)
        : 'story_creation_step_completed';

    trackEvent(stepCompletedEvent, params);
  },

  stepViewed: (params: StoryEventParams = {}) => {
    trackEvent('story_creation_step_viewed', params);
  },

  generateClicked: (params: StoryEventParams = {}) => {
    trackEvent('story_creation_generate_clicked', params);
  },

  generationRequested: (params: StoryEventParams = {}) => {
    trackEvent('story_generation_requested', params);
    trackMythoriaConversionsEnhanced.storyCreated(
      params.story_id as string,
      params.user_id as string,
    );
  },
};

const PAID_ACTION_EVENTS: Record<PaidActionType, AnalyticsEvent> = {
  ebook: 'story_generation_requested',
  audiobook: 'audiobook_started',
  print: 'print_order_started',
  self_print: 'self_print_started',
  ai_edit: 'paid_action',
};

export const trackPaidAction = (params: PaidActionEventParams): void => {
  trackEvent(PAID_ACTION_EVENTS[params.action_type], {
    action_type: params.action_type,
    credits_spent: params.credits_spent,
    story_id: params.story_id,
  });
};

export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  const gtag = ensureGtag();
  if (!gtag) return;

  try {
    gtag('set', 'user_properties', properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
}

const getGtagValue = (fieldName: 'client_id' | 'session_id'): Promise<unknown> =>
  new Promise((resolve) => {
    const gtag = ensureGtag();
    if (!gtag) {
      resolve(undefined);
      return;
    }

    gtag('get', getMeasurementId(), fieldName, resolve);
  });

/** Return consent-gated GA identifiers for server-side Measurement Protocol delivery. */
export async function getGoogleAnalyticsContext(
  timeoutMs = 1000,
): Promise<ClientAnalyticsContext | undefined> {
  const consent = getStoredConsent()?.state;
  if (consent?.analytics_storage !== 'granted') return undefined;

  const timeout = new Promise<undefined>((resolve) => {
    window.setTimeout(() => resolve(undefined), timeoutMs);
  });
  const identifiers = Promise.all([getGtagValue('client_id'), getGtagValue('session_id')]);
  const result = await Promise.race([identifiers, timeout]);
  if (!result) return undefined;

  const [rawClientId, rawSessionId] = result;
  const clientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
  if (!clientId) return undefined;

  const sessionId = Number(rawSessionId);

  return {
    clientId,
    ...(Number.isSafeInteger(sessionId) && sessionId > 0 ? { sessionId } : {}),
    consent: {
      analyticsStorage: 'granted',
      adUserData: consent.ad_user_data,
      adPersonalization: consent.ad_personalization,
    },
  };
}
