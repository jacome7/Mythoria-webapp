/**
 * Google Consent Mode v2 utilities
 *
 * This module manages user consent preferences for cookies and tracking.
 * Consent choices persist for 12 months as required by GDPR/ePrivacy.
 */

// Consent types matching Google Consent Mode v2
export type ConsentStatus = 'granted' | 'denied';

export interface ConsentState {
  ad_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
  analytics_storage: ConsentStatus;
}

export interface StoredConsent {
  state: ConsentState;
  timestamp: number;
}

// Cookie configuration
export const CONSENT_COOKIE_NAME = 'mythoria_consent';
export const CONSENT_EXPIRY_DAYS = 365; // 12 months

/**
 * Get default consent state (denied for all non-essential cookies)
 */
export function getDefaultConsent(): ConsentState {
  return {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  };
}

/**
 * Get granted consent state (all cookies accepted)
 */
export function getGrantedConsent(): ConsentState {
  return {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  };
}

/**
 * Check if consent has been given (either accept or reject)
 */
export function hasConsentChoice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return document.cookie.includes(CONSENT_COOKIE_NAME);
}

/**
 * Get stored consent from cookie
 */
export function getStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cookies = document.cookie.split(';');
    const consentCookie = cookies.find((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=`));

    if (!consentCookie) {
      return null;
    }

    const value = consentCookie.split('=')[1];
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded) as StoredConsent;
  } catch {
    return null;
  }
}

/**
 * Save consent choice to cookie
 */
export function saveConsent(state: ConsentState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const stored: StoredConsent = {
    state,
    timestamp: Date.now(),
  };

  const expires = new Date();
  expires.setDate(expires.getDate() + CONSENT_EXPIRY_DAYS);

  const cookieValue = encodeURIComponent(JSON.stringify(stored));

  // Set cookie with SameSite=Lax for security, Secure for HTTPS
  document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

/**
 * Clear consent cookie (for testing or reset purposes)
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') {
    return;
  }

  document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Update Google Consent Mode with the given state
 */
export function updateGoogleConsent(state: ConsentState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const consentPayload = {
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
    analytics_storage: state.analytics_storage,
  };

  if (window.gtag) {
    window.gtag('consent', 'update', consentPayload);
    return;
  }

  // gtag not ready yet; queue the update so it runs once the script loads
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['consent', 'update', consentPayload]);
}
