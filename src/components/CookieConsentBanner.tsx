'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  CONSENT_CHOICE_REQUIRED_EVENT,
  consentStateFromPreferences,
  getGrantedConsent,
  getStoredConsent,
  hasConsentChoice,
  saveConsent,
  updateGoogleConsent,
  type ConsentPreferences,
  type ConsentState,
} from '@/lib/consent';

type BannerMode = 'passive' | 'gate';
type ChoiceRequest = CustomEvent<{ resolve: (state: ConsentState) => void }>;

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [mode, setMode] = useState<BannerMode>('passive');
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    advertising: false,
  });
  const resolvers = useRef<Array<(state: ConsentState) => void>>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const t = useTranslations('CookieConsent');
  const locale = useLocale();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasConsentChoice()) setShowBanner(true);
    }, 500);

    const requireChoice = (event: Event) => {
      const request = event as ChoiceRequest;
      const existing = getStoredConsent()?.state;
      if (existing) {
        request.detail.resolve(existing);
        return;
      }
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      resolvers.current.push(request.detail.resolve);
      setMode('gate');
      setCustomizing(false);
      setShowBanner(true);
    };

    window.addEventListener(CONSENT_CHOICE_REQUIRED_EVENT, requireChoice);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CONSENT_CHOICE_REQUIRED_EVENT, requireChoice);
    };
  }, []);

  useEffect(() => {
    if (showBanner && mode === 'gate') firstActionRef.current?.focus();
  }, [mode, showBanner, customizing]);

  const applyChoice = (state: ConsentState, selected: ConsentPreferences) => {
    saveConsent(state, selected);
    updateGoogleConsent(state);
    setShowBanner(false);
    setCustomizing(false);
    const pending = resolvers.current.splice(0);
    pending.forEach((resolve) => resolve(state));
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!showBanner || mode !== 'gate') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        const denied = consentStateFromPreferences({ analytics: false, advertising: false });
        applyChoice(denied, { analytics: false, advertising: false });
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  if (!showBanner) return null;

  const acceptAll = () => applyChoice(getGrantedConsent(), { analytics: true, advertising: true });
  const acceptAnalyticsOnly = () => {
    const selected = { analytics: true, advertising: false };
    applyChoice(consentStateFromPreferences(selected), selected);
  };
  const rejectAll = () => {
    const selected = { analytics: false, advertising: false };
    applyChoice(consentStateFromPreferences(selected), selected);
  };
  const saveCustom = () => applyChoice(consentStateFromPreferences(preferences), preferences);

  return (
    <div
      className={
        mode === 'gate'
          ? 'fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6'
          : 'fixed inset-x-0 bottom-0 z-[100] flex justify-center p-0 sm:p-5'
      }
    >
      <div
        ref={panelRef}
        className="w-full rounded-t-3xl border border-base-300 bg-base-100 p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7"
        role="dialog"
        aria-modal={mode === 'gate'}
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-base-300 sm:hidden" />
        <h2 id="cookie-consent-title" className="text-xl font-bold text-base-content sm:text-2xl">
          {t('title')}
        </h2>
        <p id="cookie-consent-description" className="mt-2 text-sm leading-6 text-base-content/80">
          {t('message')}{' '}
          <Link href={`/${locale}/privacy-policy`} className="link link-primary font-medium">
            {t('privacyLink')}
          </Link>
        </p>

        {customizing && (
          <div className="mt-5 space-y-3" aria-label={t('customize')}>
            <label className="flex min-h-14 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-base-300 p-4">
              <span>
                <span className="block font-semibold">{t('analyticsTitle')}</span>
                <span className="mt-1 block text-sm text-base-content/70">
                  {t('analyticsDescription')}
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary mt-1"
                checked={preferences.analytics}
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, analytics: event.target.checked }))
                }
              />
            </label>
            <label className="flex min-h-14 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-base-300 p-4">
              <span>
                <span className="block font-semibold">{t('advertisingTitle')}</span>
                <span className="mt-1 block text-sm text-base-content/70">
                  {t('advertisingDescription')}
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary mt-1"
                checked={preferences.advertising}
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, advertising: event.target.checked }))
                }
              />
            </label>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {customizing ? (
            <>
              <button
                ref={firstActionRef}
                type="button"
                className="btn min-h-11 border-2 border-primary bg-transparent text-primary hover:bg-primary/10"
                onClick={() => setCustomizing(false)}
              >
                {t('back')}
              </button>
              <button
                type="button"
                className="btn min-h-11 border-2 border-primary bg-transparent text-primary hover:bg-primary/10"
                onClick={saveCustom}
              >
                {t('savePreferences')}
              </button>
            </>
          ) : (
            <>
              <button
                ref={firstActionRef}
                type="button"
                className="btn min-h-14 border-2 border-primary bg-primary text-primary-content shadow-md hover:border-primary/90 hover:bg-primary/90"
                onClick={acceptAll}
              >
                {t('acceptAll')}
              </button>
              <button
                type="button"
                className="btn min-h-14 border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20"
                onClick={acceptAnalyticsOnly}
              >
                <span className="flex flex-col leading-tight">
                  <span>{t('analyticsOnly')}</span>
                  <span className="text-xs font-medium opacity-75">{t('noAdvertising')}</span>
                </span>
              </button>
            </>
          )}
        </div>
        {!customizing && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="min-h-11 rounded-xl text-sm font-semibold text-base-content/75 underline-offset-4 hover:bg-base-200 hover:text-base-content"
              onClick={rejectAll}
            >
              {t('rejectAll')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl text-sm font-semibold text-primary underline-offset-4 hover:bg-primary/10"
              onClick={() => setCustomizing(true)}
            >
              {t('customize')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
