'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setGuestIntent } from '@/utils/biographer/guest';

type Landing = {
  project: { title: string; subject: string; purpose: string };
  participant: { name: string; relationship?: string };
  inviterName?: string;
  resumeUrl?: string;
};
export default function GuestLanding({
  token,
  mode,
}: {
  token: string;
  mode: 'invite' | 'resume';
}) {
  const t = useTranslations('Biographer.guest');
  const locale = useLocale();
  const router = useRouter();
  const [landing, setLanding] = useState<Landing>();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [consent, setConsent] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/biographer/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: mode === 'invite' ? 'previewInvite' : 'previewResume',
        token,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const value = (await r.json()) as Landing;
        setLanding(value);
        setName(value.participant.name);
        setRelationship(value.participant.relationship || '');
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('invalid'));
      });
    return () => controller.abort();
  }, [mode, token, t]);
  const enter = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/biographer/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: mode === 'invite' ? 'claim' : 'resume',
          token,
          ...(mode === 'invite' ? { input: { consent, name, relationship } } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGuestIntent({ projectId: data.project.id, participantId: data.participant.id });
      if (mode === 'resume') {
        router.replace(`/${locale}/biographer/contribution`);
        return;
      }
      setResumeUrl(new URL(data.resumeUrl, window.location.origin).toString());
      setClaimed(true);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };
  if (claimed)
    return (
      <main className="container mx-auto max-w-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">{t('saveReturn')}</h1>
        <p>{t('returnPrivacy')}</p>
        <input
          className="input input-bordered w-full"
          value={resumeUrl}
          readOnly
          aria-label={t('returnLink')}
        />
        <button
          className="btn btn-outline"
          onClick={() => void navigator.clipboard.writeText(resumeUrl)}
        >
          {t('copyLink')}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => router.replace(`/${locale}/biographer/contribution`)}
        >
          {t('continue')}
        </button>
      </main>
    );
  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t(mode === 'invite' ? 'invited' : 'resume')}</h1>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      {landing && (
        <>
          <h2 className="text-xl">{landing.project.title || landing.project.subject}</h2>
          <p>{landing.project.purpose}</p>
          {landing.inviterName && <p>{t('invitedBy', { name: landing.inviterName })}</p>}
          {mode === 'invite' && (
            <>
              <p>{t('disclosure')}</p>
              <label>
                {t('name')}
                <input
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                {t('relationship')}
                <input
                  className="input input-bordered w-full"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                {t('consent')}
              </label>
            </>
          )}
          <button
            className="btn btn-primary"
            disabled={busy || (mode === 'invite' && (!consent || !name.trim()))}
            onClick={() => void enter()}
          >
            {t(mode === 'invite' ? 'start' : 'continue')}
          </button>
        </>
      )}
    </main>
  );
}
