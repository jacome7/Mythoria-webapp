'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function BiographerEntry() {
  const t = useTranslations('Biographer');
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/biographer/projects', { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setEnabled(response.ok);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!enabled) return null;
  return (
    <Link href="/biographer" className="btn btn-outline">
      {t('title')}
    </Link>
  );
}
