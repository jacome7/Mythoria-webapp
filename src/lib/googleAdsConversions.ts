'use client';

// Google Ads conversion tracking utility functions
export interface ConversionParams {
  send_to?: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track a Google Ads conversion event
 * @param conversionLabel - The conversion label from Google Ads (e.g., 'AW-XXXXXXXXX/conversion_label')
 * @param params - Additional parameters for the conversion
 */
export function trackConversion(conversionLabel: string, params: ConversionParams = {}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.log(`Conversion event (not sent): ${conversionLabel}`, params);
    return;
  }

  try {
    const eventParams = {
      send_to: conversionLabel,
      ...params,
    };

    window.gtag('event', 'conversion', eventParams);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Conversion event sent: ${conversionLabel}`, eventParams);
    }
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
}

/**
 * Pre-configured conversion tracking functions for Mythoria
 */
export const trackMythoriaConversions = {
  /**
   * Track user sign-up conversion
   */
  signUp: (params: Omit<ConversionParams, 'send_to'> = {}) => {
    const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    if (!googleAdsId) {
      console.warn('Google Ads ID not configured');
      return;
    }
    
    // Google Ads conversion label: bti2COKh8_kaEJ_Q8ItA
    trackConversion(`${googleAdsId}/bti2COKh8_kaEJ_Q8ItA`, params);
  },

  /**
   * Track story creation conversion
   */
  storyCreated: (params: Omit<ConversionParams, 'send_to'> = {}) => {
    const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    if (!googleAdsId) {
      console.warn('Google Ads ID not configured');
      return;
    }
    
    // Google Ads conversion label: N0-wCOWh8_kaEJ_Q8ItA
    trackConversion(`${googleAdsId}/N0-wCOWh8_kaEJ_Q8ItA`, {
      value: 1.0,
      currency: 'EUR',
      ...params,
    });
  },

  /**
   * Track credit purchase conversion
   */
  creditPurchase: (params: Omit<ConversionParams, 'send_to'> = {}) => {
    const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    if (!googleAdsId) {
      console.warn('Google Ads ID not configured');
      return;
    }
    
    // Google Ads conversion label: BxUzCOih8_kaEJ_Q8ItA
    trackConversion(`${googleAdsId}/BxUzCOih8_kaEJ_Q8ItA`, {
      currency: 'EUR', // Adjust currency as needed
      ...params,
    });
  },
};

/**
 * Enhanced conversion tracking with automatic transaction IDs
 */
export const trackMythoriaConversionsEnhanced = {
  signUp: (userId?: string) => {
    trackMythoriaConversions.signUp({
      transaction_id: userId || `signup_${Date.now()}`,
    });
  },

  storyCreated: (storyId?: string, userId?: string) => {
    trackMythoriaConversions.storyCreated({
      transaction_id: storyId || `story_${userId}_${Date.now()}`,
    });
  },

  creditPurchase: (amount: number, currency = 'EUR', transactionId?: string) => {
    trackMythoriaConversions.creditPurchase({
      value: amount,
      currency,
      transaction_id: transactionId || `purchase_${Date.now()}`,
    });
  },
};
