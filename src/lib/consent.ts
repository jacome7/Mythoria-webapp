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
  version?: number;
  state: ConsentState;
  timestamp: number;
  preferences?: ConsentPreferences;
}

export interface ConsentPreferences {
  analytics: boolean;
  advertising: boolean;
}

export interface VersionedStoredConsent extends StoredConsent {
  version: 2;
  preferences: ConsentPreferences;
}

export interface ConsentUpdatedDetail {
  state: ConsentState;
  preferences: ConsentPreferences;
}

// Cookie configuration
export const CONSENT_COOKIE_NAME = 'mythoria_consent';
export const CONSENT_EXPIRY_DAYS = 365; // 12 months
export const CONSENT_UPDATED_EVENT = 'mythoria:consent-updated';
export const CONSENT_CHOICE_REQUIRED_EVENT = 'mythoria:consent-choice-required';
export const CONSENT_COOKIE_VERSION = 2;

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

export function consentStateFromPreferences(preferences: ConsentPreferences): ConsentState {
  return {
    analytics_storage: preferences.analytics ? 'granted' : 'denied',
    ad_storage: preferences.advertising ? 'granted' : 'denied',
    ad_user_data: preferences.advertising ? 'granted' : 'denied',
    ad_personalization: preferences.advertising ? 'granted' : 'denied',
  };
}

export function consentPreferencesFromState(state: ConsentState): ConsentPreferences {
  return {
    analytics: state.analytics_storage === 'granted',
    advertising:
      state.ad_storage === 'granted' &&
      state.ad_user_data === 'granted' &&
      state.ad_personalization === 'granted',
  };
}

/**
 * Check if consent has been given (either accept or reject)
 */
export function hasConsentChoice(): boolean {
  return getStoredConsent() !== null;
}

function isConsentState(value: unknown): value is ConsentState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'].every(
    (key) => state[key] === 'granted' || state[key] === 'denied',
  );
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
    const parsed = JSON.parse(decoded) as Partial<StoredConsent>;
    if (!isConsentState(parsed.state) || typeof parsed.timestamp !== 'number') return null;
    const preferences = consentPreferencesFromState(parsed.state);
    return parsed.version === CONSENT_COOKIE_VERSION
      ? {
          version: CONSENT_COOKIE_VERSION,
          state: parsed.state,
          timestamp: parsed.timestamp,
          preferences,
        }
      : { state: parsed.state, timestamp: parsed.timestamp, preferences };
  } catch {
    return null;
  }
}

/**
 * Save consent choice to cookie
 */
export function saveConsent(
  state: ConsentState,
  preferences = consentPreferencesFromState(state),
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const stored: VersionedStoredConsent = {
    version: CONSENT_COOKIE_VERSION,
    state,
    timestamp: Date.now(),
    preferences,
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

  const dispatchUpdate = () =>
    window.dispatchEvent(
      new CustomEvent<ConsentUpdatedDetail>(CONSENT_UPDATED_EVENT, {
        detail: { state, preferences: consentPreferencesFromState(state) },
      }),
    );

  if (window.gtag) {
    window.gtag('consent', 'update', consentPayload);
    dispatchUpdate();
    return;
  }

  // gtag not ready yet; queue the update so it runs once the script loads
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['consent', 'update', consentPayload]);
  dispatchUpdate();
}

/** Require a consent choice without requiring the user to grant optional consent. */
export function ensureConsentChoice(): Promise<ConsentState> {
  const existing = getStoredConsent()?.state;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(CONSENT_CHOICE_REQUIRED_EVENT, {
          detail: { resolve },
        }),
      );
    }, 0);
  });
}
