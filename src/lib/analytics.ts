'use client';

import { getStoredConsent } from './consent';
import type {
  ClientAnalyticsContext,
  GA4CheckoutPayload,
  GA4EcommerceItem,
} from './analytics/ecommerce';

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
  'login',
  'landing_cta_click',
  'landing_page_view',
  'landing_section_view',
  'supportive_story_page_view',
  'challenge_selected',
  'sample_chapter_open',
  'sample_audio_start',
  'sample_audio_complete',
  'story_creation_started',
  'story_step_viewed',
  'story_step_completed',
  'story_generation_attempted',
  'story_generation_requested',
  'story_generation_completed',
  'story_generation_failed',
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
  'refund',
  'share',
  'earn_virtual_currency',
  'audiobook_interaction',
  'paid_action',
] as const;

export type GA4EventName = (typeof GA4_EVENT_NAMES)[number];
export type AnalyticsEvent = GA4EventName;

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
  step_number?: number;
  credits_spent?: number;
  run_id?: string;
  blocked_reason?: string;
}

export interface AuthEventParams extends AnalyticsEventParams {
  user_id?: string;
  method?: string;
  sign_up_method?: string;
  login_method?: string;
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
    const eventParams = {
      ...parameters,
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
  try {
    gtag('set', { user_id: userId });
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}

export const trackAuth = {
  signUpStarted: (params: AuthEventParams = {}) => trackEvent('sign_up_started', params),
  login: ({ user_id: userId, method, login_method: legacyMethod }: AuthEventParams = {}) => {
    if (userId) setUserId(userId);
    trackEvent('login', { method: method || legacyMethod || 'email' });
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
