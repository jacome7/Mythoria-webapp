'use client';

import { useTranslations } from 'next-intl';
import { FaCookieBite } from 'react-icons/fa';
import { clearConsent } from '@/lib/consent';

/**
 * ManageCookiesButton
 *
 * A button that allows users to reset their cookie consent preferences.
 * When clicked, it clears the stored consent and reloads the page,
 * which will trigger the consent banner to appear again.
 */
export default function ManageCookiesButton() {
  const t = useTranslations('CookieConsent');

  const handleManageCookies = () => {
    // Clear the stored consent
    clearConsent();
    // Reload the page to show the consent banner again
    window.location.reload();
  };

  return (
    <button
      onClick={handleManageCookies}
      className="btn btn-outline btn-primary gap-2"
      aria-label={t('manageCookies')}
    >
      <FaCookieBite className="w-4 h-4" />
      {t('manageCookies')}
    </button>
  );
}
