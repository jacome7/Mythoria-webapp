'use client';

import { Cookie } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { clearConsent, getDefaultConsent, updateGoogleConsent } from '@/lib/consent';

/**
 * ManageCookiesButton
 *
 * A button that allows users to reset their cookie consent preferences.
 * When clicked, it clears the stored consent and reloads the page,
 * which will trigger the consent banner to appear again.
 */
export default function ManageCookiesButton() {
  const t = useTranslations('CookieConsent');

  const handleManageCookies = async () => {
    updateGoogleConsent(getDefaultConsent());
    clearConsent();
    await fetch('/api/analytics/attribution/revoke', { method: 'POST' }).catch(() => undefined);
    window.location.reload();
  };

  return (
    <button
      onClick={handleManageCookies}
      className="btn btn-outline btn-primary gap-2"
      aria-label={t('manageCookies')}
    >
      <Cookie className="w-4 h-4" />
      {t('manageCookies')}
    </button>
  );
}
