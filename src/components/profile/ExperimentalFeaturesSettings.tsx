'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ExperimentalFeaturesSettings({
  initialValue,
}: {
  initialValue: boolean | null;
}) {
  const t = useTranslations('ProfilePage.experimentalFeatures');
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialValue);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setStatus('saving');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experimentalFeaturesEnabled: next }),
      });
      if (!response.ok) throw new Error('Failed to save preference');
      setStatus('saved');
      router.refresh();
    } catch {
      setEnabled(previous);
      setStatus('error');
    }
  }

  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="card-title text-primary">{t('title')}</span>
            <span className="block text-sm opacity-80 mt-2">{t('description')}</span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={enabled === true}
            disabled={enabled === null || status === 'saving'}
            onChange={(event) => save(event.target.checked)}
          />
        </label>
        {enabled === null && (
          <p role="alert" className="text-error">
            {t('loadFailed')}
          </p>
        )}
        {status === 'saving' && <p role="status">{t('saving')}</p>}
        {status === 'saved' && (
          <p role="status" className="text-success">
            {t('saved')}
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="text-error">
            {t('saveFailed')}
          </p>
        )}
      </div>
    </section>
  );
}
