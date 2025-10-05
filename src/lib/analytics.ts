'use client';

import { trackMythoriaConversionsEnhanced } from './googleAdsConversions';

// Define event types for better type safety
export type AnalyticsEvent =
  // Authentication & Onboarding
  | 'sign_up'
  | 'login'
  | 'logout'
  | 'lead_capture'

  // Commerce & Credits
  | 'credit_purchase'

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

  // Contact
  | 'contact_request';

// Event parameters interface
export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined;
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

export interface CreditPurchaseEventParams extends AnalyticsEventParams {
  purchase_amount?: number;
  credits_purchased?: number;
}

/**
 * Track a custom event in Google Analytics
 * @param eventName - The name of the event to track
 * @param parameters - Optional parameters to include with the event
 */
export function trackEvent(eventName: AnalyticsEvent, parameters: AnalyticsEventParams = {}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    // If we're on the server side or gtag is not available, log the event for debugging
    console.log(`Analytics event (not sent): ${eventName}`, parameters);
    return;
  }

  try {
    // Add timestamp and common parameters
    const eventParams = {
      ...parameters,
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_title: document.title,
    };

    // Send the event to Google Analytics
    window.gtag('event', eventName, eventParams);

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Analytics event sent: ${eventName}`, eventParams);
    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
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
  creditPurchase: (params: CreditPurchaseEventParams = {}) => {
    trackEvent('credit_purchase', params);
    // Track Google Ads conversion
    trackMythoriaConversionsEnhanced.creditPurchase(
      (params.purchase_amount as number) || 0,
      'EUR', // Adjust currency as needed
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
};

/**
 * Track contact events
 */
export const trackContact = {
  request: (params: ContactEventParams = {}) => trackEvent('contact_request', params),
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
