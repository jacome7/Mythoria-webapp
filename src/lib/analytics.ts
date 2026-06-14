'use client';

import { trackMythoriaConversionsEnhanced } from './googleAdsConversions';

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Define core event types for better type safety
export const GA4_EVENT_NAMES = [
  'page_view',
  'sign_up_started',
  'sign_up_completed',
  'story_creation_started',
  'story_step_1_completed',
  'story_step_2_completed',
  'story_step_3_completed',
  'story_step_4_completed',
  'story_generation_requested',
  'story_published',
  'pricing_viewed',
  'checkout_started',
  'credit_pack_purchased',
  'audiobook_started',
  'print_order_started',
  'self_print_started',
  'share_link_created',
  'promo_code_redeemed',
] as const;

export type GA4EventName = (typeof GA4_EVENT_NAMES)[number];

export type AnalyticsEvent =
  | GA4EventName
  | 'sign_up'
  | 'login'
  | 'logout'
  | 'story_creation_step_completed'
  | 'story_creation_step_viewed'
  | 'story_creation_generate_clicked'
  | 'paid_action'
  | 'purchase';

// Event parameters interface
export interface AnalyticsEventParams {
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | Record<string, unknown>[]
    | Record<string, unknown>;
}

// Specific parameter interfaces for type safety
export interface StoryEventParams extends AnalyticsEventParams {
  story_id?: string;
  story_genre?: string;
  total_chapters?: number;
  step?: number;
  credits_spent?: number;
}

export interface AuthEventParams extends AnalyticsEventParams {
  user_id?: string;
  sign_up_method?: string;
  login_method?: string;
}

export interface CreditPurchaseEventParams extends AnalyticsEventParams {
  /** Purchase amount in euros (NOT cents). E.g., 5.00 for €5 */
  purchase_amount?: number;
  /** Number of credits purchased */
  credits_purchased?: number;
  /** Payment method used (stripe, card, mb_way, etc.) */
  payment_method?: string;
  /** Items purchased (for GA4 ecommerce) */
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
  /** Transaction ID */
  transaction_id?: string;
}

export type PaidActionType = 'ebook' | 'audiobook' | 'print' | 'self_print' | 'ai_edit';

export interface PaidActionEventParams extends AnalyticsEventParams {
  action_type: PaidActionType;
  credits_spent?: number;
  story_id?: string;
}

/**
 * Track a custom event in Google Analytics
 * @param eventName - The name of the event to track
 * @param parameters - Optional parameters to include with the event
 */
export function trackEvent(eventName: AnalyticsEvent, parameters?: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.gtag) {
    console.warn('⚠️ [Analytics] gtag not available yet for event:', eventName);
    return;
  }

  try {
    const eventParams = {
      ...parameters,
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_title: document.title,
    };

    window.gtag('event', eventName, eventParams);

    // Development-only console log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Analytics] Event tracked:', eventName, eventParams);
    }
  } catch (error) {
    console.error('❌ [Analytics] Error tracking event:', eventName, error);
  }
}

/**
 * Track authentication events
 */
export const trackAuth = {
  signUpStarted: (params: AuthEventParams = {}) => trackEvent('sign_up_started', params),

  signUp: (params: AuthEventParams = {}) => {
    trackEvent('sign_up_completed', params);
    // Track Google Ads conversion
    trackMythoriaConversionsEnhanced.signUp(params.user_id as string);
  },

  login: (params: AuthEventParams = {}) => trackEvent('login', params),

  logout: (params: AuthEventParams = {}) => trackEvent('logout', params),
};

/**
 * Track commerce and credit events
 */
export const trackCommerce = {
  /**
   * Track credit purchase
   * @param params.purchase_amount - Amount in euros (NOT cents). E.g., 5.00 for €5
   * @param params.credits_purchased - Number of credits purchased
   * @param params.transaction_id - Unique transaction identifier
   */
  checkoutStarted: (params: CreditPurchaseEventParams = {}) => {
    trackEvent('checkout_started', {
      value: params.purchase_amount,
      currency: 'EUR',
      credits_purchased: params.credits_purchased,
      payment_method: params.payment_method,
      items: params.items,
    });
  },

  creditPurchase: (params: CreditPurchaseEventParams = {}) => {
    trackEvent('credit_pack_purchased', {
      transaction_id: params.transaction_id,
      value: params.purchase_amount,
      currency: 'EUR',
      credits_purchased: params.credits_purchased,
      payment_method: params.payment_method,
      items: params.items,
    });

    // Track standard GA4 purchase event for revenue tracking
    trackEvent('purchase', {
      transaction_id: params.transaction_id,
      value: params.purchase_amount,
      currency: 'EUR',
      items: params.items || [
        {
          item_id: 'credit_pack', // Generic fallback
          item_name: `${params.credits_purchased} Credits`,
          price: params.purchase_amount,
          quantity: 1,
        },
      ],
    });

    // Track Google Ads conversion (expects amount in euros)
    trackMythoriaConversionsEnhanced.creditPurchase(
      (params.purchase_amount as number) || 0,
      'EUR',
      params.transaction_id as string,
    );
  },
};

/**
 * Track story creation flow events
 */
export const trackStoryCreation = {
  started: (params: StoryEventParams = {}) => trackEvent('story_creation_started', params),

  stepCompleted: (params: StoryEventParams = {}) => {
    const stepCompletedEvent =
      params.step && params.step >= 1 && params.step <= 4
        ? (`story_step_${params.step}_completed` as AnalyticsEvent)
        : 'story_creation_step_completed';

    trackEvent(stepCompletedEvent, {
      ...params,
      step: params.step,
    });
  },

  stepViewed: (params: StoryEventParams = {}) => {
    trackEvent('story_creation_step_viewed', {
      ...params,
      step: params.step,
    });
  },

  generateClicked: (params: StoryEventParams = {}) => {
    trackEvent('story_creation_generate_clicked', params);
  },

  generationRequested: (params: StoryEventParams = {}) => {
    trackEvent('story_generation_requested', params);
    trackEvent('story_published', {
      story_id: params.story_id,
      story_genre: params.story_genre,
    });
    // Track Google Ads conversion for story creation
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

/**
 * Set user properties for analytics
 * @param properties - User properties to set
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  try {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197', {
      user_properties: properties,
    });
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
}

/**
 * Set user ID for analytics
 * @param userId - The user ID to set
 */
export function setUserId(userId: string): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  try {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-86D0QFW197', {
      user_id: userId,
    });
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}
