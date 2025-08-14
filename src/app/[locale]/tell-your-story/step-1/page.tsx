'use client';

import Link from 'next/link';
import StepNavigation from '../../../../components/StepNavigation';
import ClientAuthWrapper from '../../../../components/ClientAuthWrapper';
import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { trackStoryCreation } from '../../../../lib/analytics';
import { setStep1Data, getStep1Data } from '../../../../lib/story-session';

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
  const tStoryStep1 = useTranslations('StorySteps.step1');
  const tCommon = useTranslations('StorySteps.common');
  const [, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Form data
  const [customAuthor, setCustomAuthor] = useState('');
  const [dedicationMessage, setDedicationMessage] = useState('');
  // Original values to track changes
  const [originalValues, setOriginalValues] = useState<{
    customAuthor: string;
    dedicationMessage: string;
  }>({
    customAuthor: '',
    dedicationMessage: ''
  });
  // Flag to track if any field has been edited
  const [hasChanges, setHasChanges] = useState(false);

  const fetchAuthorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        throw new Error(tStoryStep1('messages.fetchFailed'));
      }

      const data: AuthorData = await response.json();
      setAuthorData(data);

      // Load existing step 1 data from session storage
      const step1Data = getStep1Data();
      const initialCustomAuthor = step1Data?.customAuthor || data.displayName || '';
      const initialDedicationMessage = step1Data?.dedicationMessage || '';

      setCustomAuthor(initialCustomAuthor);
      setDedicationMessage(initialDedicationMessage);

      // Store original values for change tracking
      setOriginalValues({
        customAuthor: initialCustomAuthor,
        dedicationMessage: initialDedicationMessage
      });

      // Reset changes flag
      setHasChanges(false);

    } catch (error) {
      console.error('Error fetching author data:', error);
      setError(tStoryStep1('messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [tStoryStep1]);
  useEffect(() => {
    fetchAuthorData();

    // Track that user started story creation process
    trackStoryCreation.started({
      step: 1,
      user_profile_exists: true // We can set this based on response later
    });
  }, [fetchAuthorData]);
  // Function to check if current values differ from original values
  const checkForChanges = (currentCustomAuthor: string, currentDedicationMessage: string) => {
    const hasChanged =
      currentCustomAuthor !== originalValues.customAuthor ||
      currentDedicationMessage !== originalValues.dedicationMessage;

    setHasChanges(hasChanged);
  };
  const handleNext = async (): Promise<boolean> => {
    if (!customAuthor) {
      setError(tStoryStep1('messages.required'));
      return false; // Prevent navigation
    }

    try {
      setLoading(true);
      setError(null);

      // Only update step data if there are changes
      if (hasChanges) {
        // Update original values after successful save
        setOriginalValues({
          customAuthor,
          dedicationMessage
        });
        setHasChanges(false);

        // Save step 1 data to session storage
        setStep1Data({
          customAuthor,
          dedicationMessage
        });
      }

      // Track step 1 completion
      trackStoryCreation.step1Completed({
        step: 1,
        profile_updated: hasChanges,
        custom_author_provided: !!customAuthor,
        dedication_provided: !!dedicationMessage
      });

      return true; // Allow navigation
    } catch (err) {
      console.error('Failed to save author data:', err);
      setError(tStoryStep1('messages.saveFailed'));
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
            <h1 className="text-4xl font-bold">{tStoryStep1('unauthenticated.title')}</h1>
            <p className="text-lg text-gray-600">
              {tStoryStep1('unauthenticated.description')}
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href={`/${locale}/sign-in`} className="btn btn-primary btn-lg">
                {tStoryStep1('unauthenticated.signIn')}
              </Link>
              <Link href={`/${locale}/sign-up`} className="btn btn-outline btn-lg">
                {tStoryStep1('unauthenticated.signUp')}
              </Link>
            </div>
          </div>
        }
      >
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          {(() => {
            const currentStep = 1;
            const totalSteps = 5;
            return (
              <>
                {/* Mobile Progress Indicator */}
                <div className="block md:hidden mb-8">
                  <div className="text-center text-sm text-gray-600 mb-2">
                    {tCommon('stepProgress', { currentStep, totalSteps })}
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
                  </ul>
                </div>
              </>
            );
          })()}

          {/* Step content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-3xl mb-6">{tStoryStep1('heading')}</h1>

              {loading ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p className="text-lg text-gray-600 mt-4">{tStoryStep1('messages.loadingProfile')}</p>
                </div>) : (
                <div className="space-y-6">
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-600">{tStoryStep1('intro')}</p>
                  </div>

                  {error && (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {/* Author Name Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{tStoryStep1('fields.authorName')}</span>
                      </label>
                      <input
                        type="text"
                        value={customAuthor}
                        onChange={(e) => {
                          setCustomAuthor(e.target.value);
                          checkForChanges(e.target.value, dedicationMessage);
                        }}
                        placeholder={tStoryStep1('fields.authorNamePlaceholder')}
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt break-words max-w-full whitespace-normal">{tStoryStep1('fields.authorNameHelp')}</span>
                      </label>
                    </div>
                    
                    {/* Dedication Message Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{tStoryStep1('fields.dedication')}</span>
                        <span className="label-text-alt break-words max-w-full whitespace-normal">{tStoryStep1('fields.optional')}</span>
                      </label>
                      <textarea
                        value={dedicationMessage}
                        onChange={(e) => {
                          setDedicationMessage(e.target.value);
                          checkForChanges(customAuthor, e.target.value);
                        }}
                        placeholder={tStoryStep1('fields.dedicationPlaceholder')}
                        className="textarea textarea-bordered h-24 w-full"
                        rows={4}
                      />
                      <label className="label">
                        <span className="label-text-alt break-words max-w-full whitespace-normal">{tStoryStep1('fields.dedicationHelp')}</span>
                      </label>
                    </div></div>
                </div>
              )}
              <StepNavigation
                currentStep={1}
                totalSteps={5}
                nextHref="/tell-your-story/step-2"
                prevHref={null}
                onNext={handleNext}
                nextDisabled={loading || !customAuthor}
              />
            </div>
          </div>
        </div>
      </ClientAuthWrapper>
    </div>
  );
}
