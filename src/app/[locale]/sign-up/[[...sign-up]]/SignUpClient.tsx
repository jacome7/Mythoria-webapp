'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useMemo } from 'react';
import type { LeadSessionData } from '@/types/lead';
import { formatPhoneNumberForClerk } from '@/utils/phone-number';

interface SignUpClientProps {
  locale: string;
  translations: {
    title: string;
    subtitle: string;
    pageTitle: string;
    pageSubtitle: string;
    features: {
      free: string;
      character: string;
      quality: string;
      creativity: string;
    };
  };
  leadSession: LeadSessionData | null;
}

export default function SignUpClient({ locale, translations, leadSession }: SignUpClientProps) {
  const search = useSearchParams();
  const redirectParam = search?.get('redirect');
  const defaultRedirect = `/${locale}/profile/onboarding`;
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/') ? redirectParam : defaultRedirect;

  // Prepare initial values for Clerk form (using the proper Clerk API)
  const initialValues = useMemo(() => {
    if (!leadSession) return undefined;

    // Split name into first and last name
    const nameParts = leadSession.name?.trim().split(/\s+/) || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Format phone number with proper country code based on user's locale
    const formattedPhone = formatPhoneNumberForClerk(leadSession.mobilePhone, leadSession.language);

    return {
      emailAddress: leadSession.email,
      ...(formattedPhone && { phoneNumber: formattedPhone }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    };
  }, [leadSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex">
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
            <h1 className="text-4xl font-bold text-gray-800">{translations.title}</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">{translations.subtitle}</p>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>{translations.features.free}</p>
            <p>{translations.features.character}</p>
            <p>{translations.features.quality}</p>
            <p>{translations.features.creativity}</p>
          </div>
        </div>
      </div>

      {/* Right side - Sign-up form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-2 sm:p-4 lg:p-8 border border-amber-100">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image
                src="/Mythoria-logo-white-transparent-256x168.png"
                alt="Mythoria Logo"
                width={128}
                height={84}
              />
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{translations.pageTitle}</h2>
              <p className="text-gray-600">{translations.pageSubtitle}</p>
            </div>
            <SignUp
              routing="hash"
              afterSignInUrl={safeRedirect}
              afterSignUpUrl={safeRedirect}
              fallbackRedirectUrl={defaultRedirect}
              initialValues={initialValues}
              appearance={{
                elements: {
                  formButtonPrimary:
                    'bg-amber-600 hover:bg-amber-700 text-sm normal-case font-medium',
                  card: 'bg-transparent shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton:
                    'bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium',
                  socialButtonsBlockButtonText: 'font-medium',
                  formFieldInput:
                    'border-2 border-gray-200 focus:border-amber-500 focus:ring-amber-500',
                  footerActionLink: 'text-amber-600 hover:text-amber-700',
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
