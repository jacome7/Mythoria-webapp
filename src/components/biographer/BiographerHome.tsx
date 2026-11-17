'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import type { BiographerProject } from '@/types/biographer';

export default function BiographerHome() {
  const t = useTranslations('Biographer');
  const locale = useLocale();
  const router = useRouter();
  const [projects, setProjects] = useState<BiographerProject[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void fetch('/api/biographer/projects', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setProjects((await response.json()).projects);
      })
      .catch(() => setError(t('unavailable')));
  }, [t]);
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/biographer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, consent }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      router.push(`/${locale}/biographer/${data.project.id}`);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-primary">Mythoria</p>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-xl">{t('intro')}</p>
        <p>{t('description')}</p>
      </header>
      <section className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body gap-4">
          <p>{t('privacy')}</p>
          <label className="flex gap-3 items-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>{t('consent')}</span>
          </label>
          <button
            className="btn btn-primary self-start"
            disabled={!consent || busy}
            onClick={() => void create()}
          >
            {busy ? <span className="loading loading-spinner loading-sm" /> : null}
            {t('start')}
          </button>
        </div>
      </section>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('projects')}</h2>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/biographer/${project.id}`}
            className="card border border-base-300 bg-base-100 p-5 hover:border-primary"
          >
            <span className="font-semibold">{project.title || t('untitled')}</span>
            <span className="text-sm opacity-70">
              {t('continue')} · {new Date(project.updatedAt).toLocaleDateString(locale)}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
