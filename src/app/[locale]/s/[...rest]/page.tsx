'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function SharedStoryRouteHandler() {
  const params = useParams<{ rest?: string[] }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('SharedStoryPage');
  
  useEffect(() => {
  const restParam = params?.rest;
    if (Array.isArray(restParam)) {
      const [token, ...rest] = restParam as string[];
      
      if (token) {
        // If there are additional path segments (like 'edit'), include them
        const additionalPath = rest.length > 0 ? `/${rest.join('/')}` : '';
        router.replace(`/${locale}/s/${token}${additionalPath}`);
      } else {
        // Invalid token, redirect to home
        router.replace(`/${locale}`);
      }
    }
  }, [params, router, locale]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <h2 className="text-xl font-semibold">{t('redirecting')}</h2>
      </div>
    </div>
  );
}
