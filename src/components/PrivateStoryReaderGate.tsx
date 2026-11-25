'use client';

import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { buildAuthEntryPath } from '@/lib/auth-return';

export default function PrivateStoryReaderGate({
  children,
  resourceKey,
}: {
  children: ReactNode;
  resourceKey: string;
}) {
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  const locale = useLocale();
  const tLoading = useTranslations('Loading');
  const tAuth = useTranslations('Auth');

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">{tLoading('default')}</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    const returnTo = `/${locale}/stories/read/${resourceKey}`;
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">{tAuth('accessRestricted')}</h1>
          <p className="text-lg">{tAuth('needSignIn')}</p>
          <div className="flex justify-center gap-2">
            <Link
              href={buildAuthEntryPath(locale, 'sign-in', returnTo)}
              className="btn btn-primary"
            >
              {tAuth('signIn')}
            </Link>
            <Link
              href={buildAuthEntryPath(locale, 'sign-up', returnTo)}
              className="btn btn-outline"
            >
              {tAuth('createAccount')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment key={JSON.stringify([locale, userId, sessionId, resourceKey])}>{children}</Fragment>
  );
}
