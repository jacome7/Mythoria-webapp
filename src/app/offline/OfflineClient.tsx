'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PapercutCard, PapercutEmptyState, PapercutPage } from '@/components/papercut';

// Separated client component to satisfy lint rules and avoid require()
const OfflineClient: React.FC = () => {
  const t = useTranslations('Offline');
  const [online, setOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : false,
  );
  const [redirecting, setRedirecting] = React.useState(false);

  React.useEffect(() => {
    function handleOnline() {
      setOnline(true);
      setRedirecting(true);
      setTimeout(() => {
        window.location.replace('/');
      }, 1200);
    }
    function handleOffline() {
      setOnline(false);
      setRedirecting(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <PapercutPage variant="auth">
      <PapercutEmptyState title={t('title')} description={t('description')} icon="!">
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <button onClick={() => window.history.back()} className="btn btn-primary">
            {t('actions.goBack')}
          </button>
          <button onClick={() => window.location.reload()} className="btn btn-outline">
            {t('actions.retry')}
          </button>
          <Link href="/" className="btn btn-ghost">
            {t('actions.goHome')}
          </Link>
        </div>
      </PapercutEmptyState>

      <PapercutCard className="mx-auto mt-8 max-w-xl p-6">
        <h2 className="mb-3 text-xl font-semibold">{t('tipsTitle')}</h2>
        <ul className="list-inside list-disc space-y-1 text-left text-sm leading-relaxed">
          <li>{t('tips.readCached')}</li>
          <li>{t('tips.reuseNav')}</li>
          <li>{t('tips.wait')}</li>
        </ul>
        <div className="mt-6 text-sm opacity-70" role="status" aria-live="polite">
          {redirecting
            ? t('status.backOnline')
            : online
              ? t('status.backOnline')
              : t('status.stillOffline')}
        </div>
      </PapercutCard>
    </PapercutPage>
  );
};

export default OfflineClient;
