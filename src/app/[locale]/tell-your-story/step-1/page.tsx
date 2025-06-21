'use client';

import Link from 'next/link';
import StepNavigation from '../../../../components/StepNavigation';
import ClientAuthWrapper from '../../../../components/ClientAuthWrapper';
import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { trackStoryCreation } from '../../../../lib/analytics';

interface AuthorData {
  authorId: string;
  clerkUserId: string;
  displayName: string;
  email: string;
  mobilePhone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLocale: string;
}

export default function Step1Page() {
  const locale = useLocale();
  const t = useTranslations('StorySteps.step1');
  const [, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');

  // Original values to track changes
  const [originalValues, setOriginalValues] = useState<{
    displayName: string;
    email: string;
    mobilePhone: string;
  }>({
    displayName: '',
    email: '',
    mobilePhone: ''
  });
  // Flag to track if any field has been edited
  const [hasChanges, setHasChanges] = useState(false);

  const fetchAuthorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        throw new Error(t('messages.fetchFailed'));
      }

      const data: AuthorData = await response.json();
      setAuthorData(data);

      // Pre-populate form fields
      const initialDisplayName = data.displayName || '';
      const initialEmail = data.email || '';
      const initialMobilePhone = data.mobilePhone || '';

      setDisplayName(initialDisplayName);
      setEmail(initialEmail);
      setMobilePhone(initialMobilePhone);

      // Store original values for change tracking
      setOriginalValues({
        displayName: initialDisplayName,
        email: initialEmail,
        mobilePhone: initialMobilePhone
      });

      // Reset changes flag
      setHasChanges(false);

    } catch (error) {
      console.error('Error fetching author data:', error);
      setError(t('messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    fetchAuthorData();

    // Track that user started story creation process
    trackStoryCreation.started({
      step: 1,
      user_profile_exists: true // We can set this based on response later
    });
  }, [fetchAuthorData]);

  // Function to check if current values differ from original values
  const checkForChanges = (currentDisplayName: string, currentEmail: string, currentMobilePhone: string) => {
    const hasChanged =
      currentDisplayName !== originalValues.displayName ||
      currentEmail !== originalValues.email ||
      currentMobilePhone !== originalValues.mobilePhone;

    setHasChanges(hasChanged);
  };
  const handleNext = async (): Promise<boolean> => {
    if (!displayName || !email) {
      setError(t('messages.required'));
      return false; // Prevent navigation
    }

    try {
      setLoading(true);
      setError(null);

      // Only update profile if there are changes
      if (hasChanges) {
        // Here you would typically save the data to your database
        // For now, we'll just simulate a successful save

        // Update original values after successful save
        setOriginalValues({
          displayName,
          email,
          mobilePhone
        }); setHasChanges(false);
      }

      // Track step 1 completion
      trackStoryCreation.step1Completed({
        step: 1,
        profile_updated: hasChanges,
        display_name_provided: !!displayName,
        email_provided: !!email,
        phone_provided: !!mobilePhone
      });

      return true; // Allow navigation
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(t('messages.saveFailed'));
      return false; // Prevent navigation
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientAuthWrapper
        signedOutFallback={
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="text-6xl">📚</div>
            <h1 className="text-4xl font-bold">{t('unauthenticated.title')}</h1>
            <p className="text-lg text-gray-600">
              {t('unauthenticated.description')}
            </p>
            <div className="space-x-4">
              <Link href={`/${locale}/sign-in`} className="btn btn-primary btn-lg">
                {t('unauthenticated.signIn')}
              </Link>
              <Link href={`/${locale}/sign-up`} className="btn btn-outline btn-lg">
                {t('unauthenticated.signUp')}
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              {t('unauthenticated.note')}
            </p>
          </div>
        }
      >
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}            {(() => {
            const currentStep = 1;
            const totalSteps = 6;
            return (
              <>
                {/* Mobile Progress Indicator */}
                <div className="block md:hidden mb-8">
                  <div className="text-center text-sm text-gray-600 mb-2">
                    Step {currentStep} of {totalSteps}
                  </div>
                  <progress
                    className="progress progress-primary w-full"
                    value={currentStep}
                    max={totalSteps}
                  ></progress>
                </div>

                {/* Desktop Progress Indicator */}
                <div className="hidden md:block mb-8">
                  <ul className="steps steps-horizontal w-full">
                    <li className="step step-primary" data-content="1"></li>
                    <li className="step" data-content="2"></li>
                    <li className="step" data-content="3"></li>
                    <li className="step" data-content="4"></li>
                    <li className="step" data-content="5"></li>
                    <li className="step" data-content="6"></li>
                  </ul>
                </div>
              </>
            );
          })()}

          {/* Step content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-3xl mb-6">{t('heading')}</h1>

              {loading ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p className="text-lg text-gray-600 mt-4">{t('messages.loadingProfile')}</p>
                </div>) : (
                <div className="space-y-6">
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-600">{t('intro')}</p>
                  </div>

                  {error && (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{t('fields.fullName')}</span>
                      </label>                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          checkForChanges(e.target.value, email, mobilePhone);
                        }}
                        placeholder={t('fields.fullName')}
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">{t('fields.fullNameHelp')}</span>
                      </label>
                    </div>

                    {/* Email Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{t('fields.email')}</span>
                      </label>                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          checkForChanges(displayName, e.target.value, mobilePhone);
                        }}
                        placeholder={t('fields.email')}
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">{t('fields.emailHelp')}</span>
                      </label>
                    </div>

                    {/* Mobile Phone Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{t('fields.mobile')}</span>
                      </label>                      <input
                        type="tel"
                        value={mobilePhone}
                        onChange={(e) => {
                          setMobilePhone(e.target.value);
                          checkForChanges(displayName, email, e.target.value);
                        }}
                        placeholder={t('fields.mobile')}
                        className="input input-bordered w-full"
                      />
                      <label className="label">
                        <span className="label-text-alt">{t('fields.mobileHelp')}</span>
                      </label>                    </div>                  </div>
                </div>
              )}

              <StepNavigation
                currentStep={1}
                totalSteps={7}
                nextHref="/tell-your-story/step-2"
                prevHref={null}
                onNext={handleNext}
                nextDisabled={loading || !displayName || !email}
              />
            </div>          </div>
        </div>
      </ClientAuthWrapper>
    </div>
  );
}
