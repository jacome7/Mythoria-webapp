'use client';

import { trackMythoriaConversionsEnhanced } from './googleAdsConversions';

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Define event types for better type safety
export type AnalyticsEvent =
  // Authentication & Onboarding
  | 'sign_up'
  | 'login'
  | 'logout'
  | 'lead_capture'

  // Commerce & Credits
  | 'credit_purchase'
  | 'purchase'

  // Story Creation Flow
  | 'story_creation_started'
  | 'story_step1_completed'
  | 'story_step2_completed'
  | 'story_step3_completed'
  | 'story_step4_completed'
  | 'story_step5_completed'
  | 'character_added'
  | 'character_customized'
  | 'story_generation_requested'

  // Story Management
  | 'story_viewed'
  | 'story_edited'
  | 'story_shared'
  | 'story_deleted'
  | 'story_listen'
  | 'story_downloaded'

  // Contact
  | 'contact_request'

  // Partnership
  | 'partnership_application_started'
  | 'partnership_application_submitted';

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
  story_title?: string;
  story_genre?: string;
  chapter_number?: number;
  total_chapters?: number;
}

export interface CharacterEventParams extends AnalyticsEventParams {
  character_name?: string;
  character_type?: string;
  story_id?: string;
}

export interface AuthEventParams extends AnalyticsEventParams {
  user_id?: string;
  sign_up_method?: string;
  login_method?: string;
}

export interface ContactEventParams extends AnalyticsEventParams {
  form_type?: string;
  inquiry_type?: string;
}

export interface PartnershipEventParams extends AnalyticsEventParams {
  company_name?: string;
  partnership_type?: string;
  primary_location?: string;
  has_phone?: boolean;
  has_website?: boolean;
  has_description?: boolean;
}

export interface CreditPurchaseEventParams extends AnalyticsEventParams {
  /** Purchase amount in euros (NOT cents). E.g., 5.00 for €5 */
  purchase_amount?: number;
  /** Number of credits purchased */
  credits_purchased?: number;
  /** Payment method used (revolut, mbway, etc.) */
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

/**
 * Track a custom event in Google Analytics
 * @param eventName - The name of the event to track
 * @param parameters - Optional parameters to include with the event
 */
export function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
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
  signUp: (params: AuthEventParams = {}) => {
    trackEvent('sign_up', params);
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
  creditPurchase: (params: CreditPurchaseEventParams = {}) => {
    trackEvent('credit_purchase', params);

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

  step1Completed: (params: StoryEventParams = {}) => trackEvent('story_step1_completed', params),

  step2Completed: (params: StoryEventParams = {}) => trackEvent('story_step2_completed', params),

  step3Completed: (params: StoryEventParams = {}) => trackEvent('story_step3_completed', params),

  step4Completed: (params: StoryEventParams = {}) => trackEvent('story_step4_completed', params),

  step5Completed: (params: StoryEventParams = {}) => trackEvent('story_step5_completed', params),

  characterAdded: (params: CharacterEventParams = {}) => trackEvent('character_added', params),

  characterCustomized: (params: CharacterEventParams = {}) =>
    trackEvent('character_customized', params),

  generationRequested: (params: StoryEventParams = {}) => {
    trackEvent('story_generation_requested', params);
    // Track Google Ads conversion for story creation
    trackMythoriaConversionsEnhanced.storyCreated(
      params.story_id as string,
      params.user_id as string,
    );
  },
};

/**
 * Track story management events
 */
export const trackStoryManagement = {
  viewed: (params: StoryEventParams = {}) => trackEvent('story_viewed', params),

  edited: (params: StoryEventParams = {}) => trackEvent('story_edited', params),

  shared: (params: StoryEventParams = {}) => trackEvent('story_shared', params),

  deleted: (params: StoryEventParams = {}) => trackEvent('story_deleted', params),

  listen: (params: StoryEventParams = {}) => trackEvent('story_listen', params),

  downloaded: (params: StoryEventParams = {}) => trackEvent('story_downloaded', params),
};

/**
 * Track contact events
 */
export const trackContact = {
  request: (params: ContactEventParams = {}) => trackEvent('contact_request', params),
};

/**
 * Track partnership application events
 */
export const trackPartnership = {
  started: (params: PartnershipEventParams = {}) =>
    trackEvent('partnership_application_started', params),

  submitted: (params: PartnershipEventParams = {}) =>
    trackEvent('partnership_application_submitted', params),
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
