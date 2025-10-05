'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

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
    <div className="max-w-xl mx-auto text-center py-16 px-4">
      <h1 className="text-4xl font-bold text-base-content mb-4">{t('title')}</h1>
      <p className="text-base-content/70 mb-6 leading-relaxed">{t('description')}</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">{t('tipsTitle')}</h2>
        <ul className="list-disc list-inside text-left text-sm space-y-1">
          <li>{t('tips.readCached')}</li>
          <li>{t('tips.reuseNav')}</li>
          <li>{t('tips.wait')}</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      <div className="mt-8 text-sm opacity-70" role="status" aria-live="polite">
        {redirecting
          ? t('status.backOnline')
          : online
            ? t('status.backOnline')
            : t('status.stillOffline')}
      </div>
    </div>
  );
};

export default OfflineClient;
