'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

export default function SharedStoryPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('SharedStoryPage');
  const tCommon = useTranslations('common');
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const accessSharedStory = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        const result = await response.json();

        if (result.success && result.redirectUrl) {
          // Redirect to the actual story page
          router.push(`/${locale}${result.redirectUrl}`);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error accessing shared story:', err);
        setError(t('errors.failedToAccess'));
      } finally {
        setLoading(false);
      }
    };

    accessSharedStory();
  }, [token, router, locale, t]);  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{t('loading.title')}</h2>
          <p className="text-gray-600">{t('loading.subtitle')}</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">{t('errors.unableToAccess')}</h2>
          <p className="text-gray-600">{error}</p>
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline btn-sm"
            >
              {tCommon('Actions.tryAgain')}
            </button>
            <div>
              <a
                href={`/${locale}`}
                className="btn btn-primary btn-sm"
              >
                {tCommon('Actions.goToHomepage')}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // This shouldn't normally be reached as we redirect on success
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
        <h2 className="text-xl font-semibold">{t('redirecting')}</h2>
      </div>
    </div>
  );
}
