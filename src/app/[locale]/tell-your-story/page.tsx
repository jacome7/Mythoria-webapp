'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientAuthWrapper from '../../../components/ClientAuthWrapper';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function TellYourStoryPage() {
  const locale = useLocale();
  const router = useRouter();
  const tTellYourStoryPage = useTranslations('TellYourStoryPage');
  const tCommon = useTranslations('common');
  const SignedInContent = () => {
    useEffect(() => {
      router.push(`/${locale}/tell-your-story/step-1`);
    }, []);    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="text-lg text-gray-600 mt-4">{tCommon('Loading.redirecting')}</p>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientAuthWrapper
        signedOutFallback={
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">
              {tTellYourStoryPage('signedOut.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {tTellYourStoryPage('signedOut.subtitle')}
            </p>
            <div className="space-x-4">
              <Link href={`/${locale}/sign-up`} className="btn btn-primary">
                {tTellYourStoryPage('signedOut.getStarted')}
              </Link>
              <Link href={`/${locale}/sign-in`} className="btn btn-outline">
                {tCommon('Auth.signIn')}
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
