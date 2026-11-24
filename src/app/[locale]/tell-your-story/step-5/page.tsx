'use client';

import { Show, RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import ThemedArtwork from '@/components/ThemedArtwork';
import StepNavigation from '@/components/StepNavigation';
import ProgressIndicator from '@/components/ProgressIndicator';
import StoryGenerationProgress from '@/components/StoryGenerationProgress';
import { getGoogleAnalyticsContext, trackStoryCreation } from '@/lib/analytics';
import { ensureConsentChoice } from '@/lib/consent';
import { conversions } from '@/lib/openai-ads/events';
import { trackOpenAiAdsEvent } from '@/lib/openai-ads/pixel';
import { forgetWhispererDraft } from '@/lib/story-whisperer/draft-pointer';
import { getStep1Data } from '@/lib/story-session';
import { fetchStoryData } from '@/lib/story';
import { useStorySessionGuard } from '@/hooks/useStorySessionGuard';
import type { StoryData } from '@/types/story';
import { isPremiumBookAudience, premiumBookType } from '@/lib/premium-children-book/contract';

interface EbookPricing {
  id: string;
  name: string;
  cost: number;
  serviceCode: string;
}

interface ServiceResponse {
  id: string;
  name: string;
  cost: number;
  serviceCode: string;
}

export default function Step5PageWrapper() {
  return (
    <Suspense>
      <Step5Page />
    </Suspense>
  );
}

function Step5Page() {
  const { isSignedIn, userId } = useAuth();
  const searchParams = useSearchParams();
  const editStoryId = searchParams?.get('edit');
  const locale = useLocale();
  const tStoryStepsStep5 = useTranslations('StorySteps.step5');
  const tBook = useTranslations('PremiumBook');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [storyGenerationStarted, setStoryGenerationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editStoryDetails, setEditStoryDetails] = useState(false);
  const currentStoryId = useStorySessionGuard();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [ebookPricing, setEbookPricing] = useState<EbookPricing | null>(null);
  const hasTrackedStepView = useRef(false);
  const generationIdempotencyKey = useRef<string | null>(null);
  const isPremiumBook = storyData?.bookType === premiumBookType;
  const needsFormatCorrection =
    isPremiumBook &&
    storyData.bookFormatEditable &&
    (!storyData.premiumBookPilot || !isPremiumBookAudience(storyData.targetAudience));

  const loadStoryData = async (storyId: string) => {
    try {
      const data = await fetchStoryData(storyId);
      setStoryData(data);
      if (
        data.bookType === premiumBookType &&
        (data.status === 'writing' || data.status === 'published')
      ) {
        setStoryGenerationStarted(true);
      }
    } catch (error) {
      console.error('Error fetching story data:', error);
      setError(tStoryStepsStep5('alerts.failedToFetchStoryData'));
    }
  };

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/my-credits');
      if (!response.ok) {
        throw new Error('Failed to fetch user credits');
      }
      const data = await response.json();
      setUserCredits(data.currentBalance || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setError(tStoryStepsStep5('alerts.failedToFetchUserCredits'));
    }
  };

  const fetchEbookPricing = async () => {
    try {
      const response = await fetch(
        `/api/pricing/services?storyId=${encodeURIComponent(currentStoryId || '')}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch pricing data');
      }
      const data = await response.json();
      const ebook = data.services.find(
        (service: ServiceResponse) =>
          service.serviceCode ===
          (data.productProfile === 'biographer' ? 'biographerBookGeneration' : 'eBookGeneration'),
      );
      if (ebook) {
        setEbookPricing(ebook);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      setError(tStoryStepsStep5('alerts.failedToFetchPricingData'));
    }
  };

  useEffect(() => {
    if (!currentStoryId) return;

    Promise.all([loadStoryData(currentStoryId), fetchUserCredits(), fetchEbookPricing()]).finally(
      () => {
        setLoading(false);
      },
    );
  }, [currentStoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSignedIn || loading || !currentStoryId || !storyData || hasTrackedStepView.current)
      return;

    hasTrackedStepView.current = true;
    trackStoryCreation.stepViewed({
      step: 5,
      story_id: currentStoryId,
      has_pricing: !!ebookPricing,
      ebook_cost: ebookPricing?.cost,
      user_credits: userCredits,
      can_generate: !!ebookPricing && userCredits >= ebookPricing.cost,
    });
  }, [currentStoryId, ebookPricing, isSignedIn, loading, storyData, userCredits]);

  const hasInsufficientCredits = () => {
    // If pricing isn't loaded yet, assume insufficient credits to prevent premature actions
    if (!ebookPricing) return true;
    return userCredits < ebookPricing.cost;
  };

  const handleCompleteStory = async () => {
    const blockedReason =
      !currentStoryId || !storyData
        ? 'story_data_missing'
        : !ebookPricing
          ? 'pricing_missing'
          : userCredits < ebookPricing.cost
            ? 'insufficient_credits'
            : undefined;
    trackStoryCreation.generateClicked({
      step: 5,
      story_id: currentStoryId || undefined,
      has_story_data: !!storyData,
      has_pricing: !!ebookPricing,
      ebook_cost: ebookPricing?.cost,
      user_credits: userCredits,
      can_generate: !!ebookPricing && userCredits >= ebookPricing.cost,
      blocked_reason: blockedReason,
    });

    if (!currentStoryId || !storyData || !ebookPricing) {
      setError(tStoryStepsStep5('storyDataNotAvailable'));
      return;
    }
    if (needsFormatCorrection) {
      setError(tBook('correctFormat'));
      return;
    }

    if (hasInsufficientCredits()) {
      setError(tStoryStepsStep5('alerts.insufficientCreditsError'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setEditStoryDetails(false);

    try {
      await ensureConsentChoice();
      // Get step 1 data from session
      const step1Data = getStep1Data();
      const dedicationMessage = step1Data?.dedicationMessage || '';
      const customAuthor = step1Data?.customAuthor || '';
      const analyticsContext = await getGoogleAnalyticsContext();
      if (!analyticsContext) {
        console.warn('[Analytics] Story generation is continuing without GA4 context');
      }
      generationIdempotencyKey.current ||= crypto.randomUUID();

      const response = await fetch('/api/stories/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: currentStoryId,
          idempotencyKey: generationIdempotencyKey.current,
          features: { ebook: true, printed: false, audiobook: false },
          expectedBookType: storyData.bookType,
          dedicationMessage: dedicationMessage,
          customAuthor: customAuthor,
          analyticsContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const details: unknown[] =
          response.status === 400 && Array.isArray(errorData?.details) ? errorData.details : [];
        const fieldMessages = details.flatMap((detail) => {
          if (!detail || typeof detail !== 'object' || !('field' in detail) || !('code' in detail))
            return [];
          if (detail.field === 'customAuthor') {
            return [
              detail.code === 'too_long'
                ? tStoryStepsStep5('alerts.authorNameTooLong')
                : tStoryStepsStep5('alerts.authorNameInvalid'),
            ];
          }
          if (detail.field === 'dedicationMessage') {
            return [
              detail.code === 'too_long'
                ? tStoryStepsStep5('alerts.dedicationTooLong')
                : tStoryStepsStep5('alerts.dedicationInvalid'),
            ];
          }
          return [];
        });
        setEditStoryDetails(fieldMessages.length > 0);
        setError(
          fieldMessages.length
            ? [...new Set(fieldMessages)].join(' ')
            : response.status === 422 &&
                typeof errorData?.error === 'string' &&
                (errorData.error.startsWith('book_type_') ||
                  errorData.error === 'invalid_book_format' ||
                  errorData.error === 'incompatible_book_features')
              ? tBook('reviewFormat')
              : response.status === 409
                ? tStoryStepsStep5('alerts.insufficientCreditsError')
                : tStoryStepsStep5('alerts.failedToCompleteStory'),
        );
        return;
      }

      const result = await response.json();
      console.log('Story generation started:', result);
      setUserCredits(result.remainingCredits);
      if (typeof result?.adEventId === 'string' && result.adEventId) {
        const runId = typeof result.runId === 'string' ? result.runId : '';
        trackOpenAiAdsEvent({ ...conversions.storyLead(runId), eventId: result.adEventId });
      }

      if (userId) forgetWhispererDraft(userId, currentStoryId, true);

      // Show the progress component instead of navigating to next step
      setStoryGenerationStarted(true);
    } catch (error) {
      console.error('Error completing story:', error);
      setError(tStoryStepsStep5('alerts.failedToCompleteStory'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {' '}
        <div className="max-w-4xl mx-auto text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">{tStoryStepsStep5('loadingStoryData')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>

      <Show when="signed-in">
        <div data-wizard-step="5" className="container mx-auto px-2 sm:px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Show progress component if story generation has started */}
            {storyGenerationStarted ? (
              <StoryGenerationProgress storyId={currentStoryId!} premiumBook={isPremiumBook} />
            ) : (
              <>
                <ProgressIndicator currentStep={5} totalSteps={5} />

                {/* Step content */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h1 className="card-title text-3xl mb-6 text-gray-800">
                      {tStoryStepsStep5('heading')}
                    </h1>

                    {error && (
                      <div role="alert" className="alert alert-error mb-6">
                        <span>{error}</span>
                        {editStoryDetails && (
                          <Link
                            className="link"
                            href={`/${locale}/tell-your-story/step-1?returnTo=review`}
                          >
                            {tStoryStepsStep5('alerts.editStoryDetails')}
                          </Link>
                        )}
                      </div>
                    )}

                    {storyData ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            {tStoryStepsStep5('readyToGenerate')}
                          </h2>
                          <p className="text-lg text-gray-600 mb-6">
                            {tStoryStepsStep5('aboutToStart')}
                            <strong className="block mt-2 text-xl font-bold text-primary">
                              {storyData.title}
                            </strong>
                          </p>

                          <ThemedArtwork
                            src="/Papercut_icons/open-book-with-stars.webp"
                            alt=""
                            width={512}
                            height={256}
                            className="mx-auto mb-6 h-auto w-44 max-w-full"
                          />

                          {/* Credits Information */}
                          <div className="space-y-4 mb-6">
                            {/* Ebook Service Info */}
                            {ebookPricing && (
                              <div className="card bg-base-200 p-6">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                  {isPremiumBook
                                    ? tBook('title')
                                    : tStoryStepsStep5('ebookGeneration')}
                                </h3>
                                <div className="flex justify-center items-center gap-6">
                                  <div className="text-center">
                                    <span className="text-sm text-gray-600">
                                      {tStoryStepsStep5('cost')}
                                    </span>
                                    <div className="text-2xl font-bold text-primary">
                                      {ebookPricing.cost} {tStoryStepsStep5('credits')}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-sm text-gray-600">
                                      {tStoryStepsStep5('yourCredits')}
                                    </span>
                                    <div
                                      className={`text-2xl font-bold ${hasInsufficientCredits() ? 'text-error' : 'text-success'}`}
                                    >
                                      {userCredits} {tStoryStepsStep5('credits')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {needsFormatCorrection && (
                              <div role="alert" className="alert alert-warning">
                                {tBook('correctFormat')}
                              </div>
                            )}

                            {/* Insufficient Credits Warning */}
                            {hasInsufficientCredits() && (
                              <div className="alert alert-warning">
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-gray-800">
                                    {tStoryStepsStep5('insufficientCreditsTitle')}
                                  </span>
                                  <span className="text-sm mt-2 text-gray-700">
                                    {tStoryStepsStep5('needMoreCredits', {
                                      count: ebookPricing ? ebookPricing.cost - userCredits : 0,
                                    })}
                                  </span>
                                  <a
                                    href={`/${locale}/pricing#buy-credits`}
                                    className="btn btn-outline btn-sm mt-2"
                                  >
                                    {tStoryStepsStep5('getMoreCredits')}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-lg text-gray-600">
                          {tStoryStepsStep5('storyDataNotAvailable')}
                        </p>
                      </div>
                    )}
                    <StepNavigation
                      currentStep={5}
                      totalSteps={5}
                      nextHref={null} // No next button, user must complete the story
                      prevHref={
                        editStoryId
                          ? `/tell-your-story/step-4?edit=${editStoryId}`
                          : '/tell-your-story/step-4'
                      }
                      nextDisabled={
                        !storyData ||
                        submitting ||
                        needsFormatCorrection ||
                        hasInsufficientCredits()
                      }
                      busy={submitting}
                      onNext={storyData ? handleCompleteStory : undefined}
                      nextLabel={
                        submitting
                          ? tStoryStepsStep5('startingGeneration')
                          : tStoryStepsStep5('generateMyStory')
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Show>
    </>
  );
}
