'use client';
import React from 'react';
import { NextIntlClientProvider, IntlError, IntlErrorCode } from 'next-intl';

/**
 * Instrumented client-side provider for next-intl.
 * Adds deterministic logging & fallback so Playwright can detect missing translation keys.
 * Production impact is negligible; can be gated by NEXT_PUBLIC_I18N_DEBUG if desired.
 */
export const I18N_MISSING_TAG = '[i18n-missing]';
export const I18N_FALLBACK_PREFIX = '__MISSING__:'; // will be followed by full path

interface ClientProviderProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown> | null;
  timeZone?: string;
}

export default function ClientProvider({
  children,
  locale,
  messages,
  timeZone,
}: ClientProviderProps) {
  const onError = React.useCallback(
    (error: IntlError & { message?: string; originalMessage?: string }) => {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        const path = error.message || error.originalMessage || 'unknown';
        // Structured predictable console output
        console.warn(`${I18N_MISSING_TAG} ${path}`);
      } else {
        console.error('[i18n-error]', error);
      }
    },
    [],
  );

  // Missing message -> deterministic sentinel for Playwright.
  // Other error (format/argument) -> just render the path (keeps UI readable without extra sentinel noise).
  const getMessageFallback = React.useCallback(
    ({ namespace, key, error }: { namespace?: string; key: string; error: IntlError }) => {
      const path = [namespace, key].filter(Boolean).join('.');
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return `${I18N_FALLBACK_PREFIX}${path}`;
      }
      return path; // No second error marker needed.
    },
    [],
  );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages as Record<string, unknown> | null}
      onError={onError}
      getMessageFallback={getMessageFallback}
      timeZone={timeZone || 'Europe/Lisbon'}
    >
      {children}
    </NextIntlClientProvider>
  );
}
