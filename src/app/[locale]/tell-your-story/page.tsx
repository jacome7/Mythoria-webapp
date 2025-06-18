'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientAuthWrapper from '../../../components/ClientAuthWrapper';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

export default function TellYourStoryPage() {
  const locale = useLocale();
  const router = useRouter();
  const SignedInContent = () => {
    useEffect(() => {
      router.push(`/${locale}/tell-your-story/step-1`);
    }, []);

    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="text-lg text-gray-600 mt-4">Redirecting...</p>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientAuthWrapper
        signedOutFallback={
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Ready to Tell Your Story?</h1>
            <p className="text-lg text-gray-600">
              Sign up to start creating your magical adventures with Mythoria.
            </p>
            <div className="space-x-4">
              <Link href={`/${locale}/sign-up`} className="btn btn-primary">
                Get Started
              </Link>
              <Link href={`/${locale}/sign-in`} className="btn btn-outline">
                Sign In
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
