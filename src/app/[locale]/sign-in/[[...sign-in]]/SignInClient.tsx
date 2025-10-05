'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SignInClientProps {
  locale: string;
}

export default function SignInClient({ locale }: SignInClientProps) {
  const tSignInPage = useTranslations('SignInPage');
  const search = useSearchParams();
  const redirectParam = search?.get('redirect');
  // Allow only internal redirects: must start with '/'
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/') ? redirectParam : `/${locale}/my-stories`;
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex">
      {/* Left side - Logo and branding (only on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <Image
              src="/Mythoria-logo-white-512x336.jpg"
              alt="Mythoria Logo"
              width={256}
              height={168}
              className="drop-shadow-lg"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">{tSignInPage('title')}</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">{tSignInPage('subtitle')}</p>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              {tSignInPage('firstTimeText')}{' '}
              <Link href={`/${locale}/sign-up`} className="font-medium underline text-primary">
                {tSignInPage('createAccountLink')}
              </Link>{' '}
              {tSignInPage('createAccountText')}
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>{tSignInPage('features.unlimited')}</p>
            <p>{tSignInPage('features.library')}</p>
            <p>{tSignInPage('features.customize')}</p>
          </div>
        </div>
      </div>

      {/* Right side - Sign-in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-2 sm:p-4 lg:p-8 border border-orange-100">
            <div className="lg:hidden flex justify-center mb-6">
              <Image
                src="/Mythoria-logo-white-transparent-256x168.png"
                alt="Mythoria Logo"
                width={128}
                height={84}
              />
            </div>

            {/* Mobile-only first-time user message */}
            <div className="lg:hidden text-center mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-sm text-gray-600 mb-3">
                {tSignInPage('firstTimeText')}{' '}
                <Link href={`/${locale}/sign-up`} className="font-medium underline text-primary">
                  {tSignInPage('createAccountLink')}
                </Link>{' '}
                {tSignInPage('createAccountText')}
              </p>
              <Link href={`/${locale}/sign-up`} className="btn btn-sm btn-outline btn-primary">
                {tSignInPage('createAccountLink')}
              </Link>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{tSignInPage('pageTitle')}</h2>
              <p className="text-gray-600">{tSignInPage('pageSubtitle')}</p>
            </div>
            <SignIn
              routing="hash"
              afterSignInUrl={safeRedirect}
              afterSignUpUrl={safeRedirect}
              fallbackRedirectUrl={`/${locale}/my-stories`}
              appearance={{
                elements: {
                  formButtonPrimary:
                    'bg-orange-600 hover:bg-orange-700 text-sm normal-case font-medium',
                  card: 'bg-transparent shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton:
                    'bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium',
                  socialButtonsBlockButtonText: 'font-medium',
                  formFieldInput:
                    'border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500',
                  footerActionLink: 'text-orange-600 hover:text-orange-700',
                  dividerLine: 'bg-gray-200',
                  dividerText: 'text-gray-500',
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
