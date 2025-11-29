'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  hasConsentChoice,
  saveConsent,
  getGrantedConsent,
  getDefaultConsent,
  updateGoogleConsent,
} from '@/lib/consent';

/**
 * Cookie Consent Banner
 *
 * A simple, non-intrusive banner that appears at the bottom of the screen
 * for users who haven't made a cookie consent choice yet.
 *
 * Features:
 * - Accept All / Reject All buttons (equal prominence per EDPB guidelines)
 * - Link to Privacy Policy
 * - Persists choice for 12 months
 * - Updates Google Consent Mode v2 on interaction
 */
export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const t = useTranslations('CookieConsent');
  const locale = useLocale();

  useEffect(() => {
    // Only show banner if user hasn't made a choice yet
    // Small delay to prevent flash on page load
    const timer = setTimeout(() => {
      if (!hasConsentChoice()) {
        setShowBanner(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    const consent = getGrantedConsent();
    saveConsent(consent);
    updateGoogleConsent(consent);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const consent = getDefaultConsent();
    saveConsent(consent);
    updateGoogleConsent(consent);
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-base-100 border-t border-base-300 shadow-lg"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Message */}
          <div className="flex-1 text-center sm:text-left">
            <p id="cookie-consent-description" className="text-sm text-base-content">
              {t('message')}{' '}
              <Link
                href={`/${locale}/privacy-policy`}
                className="link link-primary hover:link-hover"
              >
                {t('privacyLink')}
              </Link>
            </p>
          </div>

          {/* Buttons - equal prominence */}
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleRejectAll}
              className="btn btn-outline btn-sm"
              aria-label={t('rejectAll')}
            >
              {t('rejectAll')}
            </button>
            <button
              onClick={handleAcceptAll}
              className="btn btn-primary btn-sm"
              aria-label={t('acceptAll')}
            >
              {t('acceptAll')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
