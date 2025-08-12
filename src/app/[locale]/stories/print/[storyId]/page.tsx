'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import dynamic from 'next/dynamic';

// Lazy load the main content component
const PrintOrderContent = dynamic(() => import('@/components/print-order/PrintOrderContent'));

export default function PrintOrderPage() {
  const params = useParams<{ storyId?: string }>();
  const storyId = (params?.storyId as string | undefined) ?? '';
  const router = useRouter();
  const locale = useLocale();
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <SignedIn>
  <PrintOrderContent storyId={storyId} />
      </SignedIn>

      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">{tCommon('Auth.accessRestricted')}</h1>
            <p className="text-lg text-gray-600">
              {tCommon('Auth.needSignIn')}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push(`/${locale}/sign-in`)}
                className="btn btn-primary"
              >
                {tCommon('Auth.signIn')}
              </button>
              <button
                onClick={() => router.push(`/${locale}/sign-up`)}
                className="btn btn-outline"
              >
                {tCommon('Auth.createAccount')}
              </button>
            </div>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
