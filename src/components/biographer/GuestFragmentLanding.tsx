'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import GuestLanding from './GuestLanding';
export default function GuestFragmentLanding({ mode }: { mode: 'invite' | 'resume' }) {
  const t = useTranslations('Biographer.guest');
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const state = window as Window & { __mythoriaBiographerFragment?: string };
    const value = state.__mythoriaBiographerFragment || window.location.hash.slice(1);
    delete state.__mythoriaBiographerFragment;
    if (/^[A-Za-z0-9_-]{43}$/.test(value)) setToken(value);
    if (window.location.hash)
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setLoaded(true);
  }, []);
  if (!loaded) return null;
  return token ? (
    <GuestLanding mode={mode} token={token} />
  ) : (
    <main className="container mx-auto max-w-2xl p-6">
      <p role="alert">{t('invalid')}</p>
    </main>
  );
}
