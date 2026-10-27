'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClientAuthWrapper from '../../../components/ClientAuthWrapper';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { buildStoryAuthReturnSearch } from '@/lib/campaign-context';
import { buildAuthEntryPath } from '@/lib/auth-return';

function SignedInContent() {
  const locale = useLocale();
  const router = useRouter();
  const tLoading = useTranslations('Loading');
  const search = useSearchParams();
  const safeQuery = buildStoryAuthReturnSearch(search).toString();

  useEffect(() => {
    router.push(`/${locale}/tell-your-story/step-1${safeQuery ? `?${safeQuery}` : ''}`);
  }, [locale, router, safeQuery]);

  return (
    <div className="text-center py-12">
      <span className="loading loading-spinner loading-lg"></span>
      <p className="text-lg text-gray-600 mt-4">{tLoading('redirecting')}</p>
    </div>
  );
}

export default function TellYourStoryPage() {
  const locale = useLocale();
  const tTellYourStoryPage = useTranslations('TellYourStoryPage');
  const tAuth = useTranslations('Auth');
  const search = useSearchParams();
  const safeQuery = buildStoryAuthReturnSearch(search);
  const returnPath = `/${locale}/tell-your-story/step-1${safeQuery.size ? `?${safeQuery}` : ''}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <ClientAuthWrapper
        signedOutFallback={
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">{tTellYourStoryPage('signedOut.title')}</h1>
            <p className="text-lg text-gray-600">{tTellYourStoryPage('signedOut.subtitle')}</p>
            <div className="space-x-4">
              <Link
                href={buildAuthEntryPath(locale, 'sign-up', returnPath)}
                className="btn btn-primary"
              >
                {tTellYourStoryPage('signedOut.getStarted')}
              </Link>
              <Link
                href={buildAuthEntryPath(locale, 'sign-in', returnPath)}
                className="btn btn-outline"
              >
                {tAuth('signIn')}
              </Link>
            </div>
          </div>
        }
      >
        <SignedInContent />
      </ClientAuthWrapper>
    </div>
  );
}
