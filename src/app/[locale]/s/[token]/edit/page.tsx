'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function SharedStoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('common');
  const token = params.token as string;

  useEffect(() => {
    if (!token) return;

    // Redirect to the shared story page which will handle edit access
    router.push(`/${locale}/s/${token}`);
  }, [token, router, locale]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <h2 className="text-xl font-semibold">{t('Loading.redirectingToSharedStory')}</h2>
      </div>
    </div>
  );
}
