'use client';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import {
  CONSENT_UPDATED_EVENT,
  getStoredConsent,
  saveConsent,
  updateGoogleConsent,
  consentStateFromPreferences,
} from '@/lib/consent';
import Link from 'next/link';

export default function ReferralCustomer({
  captureOnly = false,
  compact = false,
}: {
  captureOnly?: boolean;
  compact?: boolean;
}) {
  const { isSignedIn } = useUser();
  const locale = useLocale();
  const t = useTranslations('Referrals');
  const [candidate, setCandidate] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [available, setAvailable] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const captureId = useRef<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get('referral') || '';
    if (/^[A-Z0-9][A-Z0-9_-]{4,31}$/.test(value)) {
      setCandidate(value);
      setCode(value);
    }
    url.searchParams.delete('referral');
    window.history.replaceState(window.history.state, '', url);
    const update = () => setConsented(getStoredConsent()?.preferences?.referrals === true);
    update();
    window.addEventListener(CONSENT_UPDATED_EVENT, update);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, update);
  }, []);
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    void fetch('/api/referrals/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const data = await response.json();
        setActiveCode(data.activeCode);
        setAvailable(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);
  useEffect(() => {
    if (!candidate || !consented) return;
    captureId.current ||= crypto.randomUUID();
    let cancelled = false;
    void fetch('/api/referrals/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: candidate, locale, requestId: captureId.current }),
    })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        if (isSignedIn) {
          const linked = await fetch('/api/referrals/link', { method: 'POST' });
          if (linked.ok && !cancelled) {
            const data = await linked.json();
            setActiveCode(data.activeCode);
            setAvailable(true);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [candidate, consented, isSignedIn, locale]);
  const acceptReferral = () => {
    const preferences = {
      analytics: false,
      advertising: false,
      ...getStoredConsent()?.preferences,
      referrals: true,
    };
    const state = consentStateFromPreferences(preferences);
    saveConsent(state, preferences);
    updateGoogleConsent(state);
    setConsented(true);
  };
  const change = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/referrals/me/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, confirmed }),
      });
      if (!response.ok) {
        setMessage(t('error'));
        return;
      }
      const data = await response.json();
      setActiveCode(data.activeCode);
      setCandidate('');
      setConfirmed(false);
      setMessage(t('saved'));
    } catch {
      setMessage(t('error'));
    } finally {
      setBusy(false);
    }
  };
  if (captureOnly) return null;
  if (!candidate && !available) return null;
  if (compact)
    return (
      <p className="text-sm">
        {t('activeCode')}: {activeCode || t('none')} ·{' '}
        <Link className="link" href={`/${locale}/profile#referral`}>
          {t('change')}
        </Link>
      </p>
    );
  return (
    <section id="referral" className="card border border-base-300 bg-base-100 my-6">
      <div className="card-body">
        <h2 className="card-title">{t('customerTitle')}</h2>
        {candidate && <p>{t('candidate', { code: candidate })}</p>}
        {candidate && !consented && (
          <>
            <p>{t('consentExplanation', { days: 90 })}</p>
            <button className="btn btn-primary" onClick={acceptReferral}>
              {t('allowReferral')}
            </button>
          </>
        )}
        {isSignedIn && (
          <>
            <p>
              {t('activeCode')}: <strong>{activeCode || t('none')}</strong>
            </p>
            <form onSubmit={change} className="space-y-3">
              <label className="form-control">
                <span>{t('code')}</span>
                <input
                  className="input input-bordered"
                  value={code}
                  maxLength={32}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  required
                />
              </label>
              <label className="flex items-start gap-3">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  required
                />
                <span>{t('confirmChange')}</span>
              </label>
              <button disabled={busy || !confirmed} className="btn btn-primary">
                {t('change')}
              </button>
            </form>
          </>
        )}
        {!isSignedIn && candidate && (
          <Link
            className="link"
            href={`/${locale}/sign-in?redirect_url=${encodeURIComponent(`/${locale}?referral=${candidate}`)}`}
          >
            {t('signIn')}
          </Link>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </section>
  );
}
