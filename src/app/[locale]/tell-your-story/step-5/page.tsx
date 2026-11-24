'use client';

import { Show, RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  PiArrowRight,
  PiBookOpen,
  PiHeadphones,
  PiPrinter,
  PiShareNetwork,
  PiSparkleFill,
} from 'react-icons/pi';
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
import styles from './Confirmation.module.css';

const creationStages = [
  {
    label: 'confirmation.writeStory',
    src: '/Papercut_icons/PaperAndPencil.webp',
    width: 256,
    height: 282,
  },
  {
    label: 'confirmation.createArtwork',
    src: '/Papercut_icons/Color_pallete.webp',
    width: 256,
    height: 241,
  },
  {
    label: 'confirmation.bookReady',
    src: '/Papercut_icons/openBook.webp',
    width: 256,
    height: 235,
  },
] as const;

const storyOutcomes = [
  { label: 'confirmation.readOnline', Icon: PiBookOpen },
  { label: 'confirmation.share', Icon: PiShareNetwork },
  { label: 'confirmation.requestPrint', Icon: PiPrinter },
  { label: 'confirmation.listenOnline', Icon: PiHeadphones },
] as const;

interface EbookPricing {
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
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [ebookPricing, setEbookPricing] = useState<EbookPricing | null>(null);
  const hasTrackedStepView = useRef(false);
  const generationIdempotencyKey = useRef<string | null>(null);
  const isPremiumBook = storyData?.bookType === premiumBookType;
  const needsFormatCorrection =
    isPremiumBook &&
    storyData.bookFormatEditable &&
    (!storyData.premiumBookPilot || !isPremiumBookAudience(storyData.targetAudience));
  const creditShortfall =
    ebookPricing && userCredits !== null ? Math.max(ebookPricing.cost - userCredits, 0) : 0;
  const hasInsufficientCredits = creditShortfall > 0;
  const canGenerate = ebookPricing !== null && userCredits !== null && !hasInsufficientCredits;

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
      const { currentBalance } = await response.json();
      if (typeof currentBalance !== 'number' || !Number.isFinite(currentBalance)) {
        throw new Error('User credit balance is unavailable');
      }
      setUserCredits(currentBalance);
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
      const {
        services,
        productProfile,
      }: { services: EbookPricing[]; productProfile: 'standard' | 'biographer' } =
        await response.json();
      const serviceCode =
        productProfile === 'biographer' ? 'biographerBookGeneration' : 'eBookGeneration';
      const ebook = services.find((service) => service.serviceCode === serviceCode);
      if (!ebook || !Number.isFinite(ebook.cost)) {
        throw new Error('Digital book pricing is unavailable');
      }
      setEbookPricing(ebook);
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
      user_credits: userCredits ?? undefined,
      can_generate: canGenerate,
    });
  }, [canGenerate, currentStoryId, ebookPricing, isSignedIn, loading, storyData, userCredits]);

  const handleCompleteStory = async () => {
    const blockedReason =
      !currentStoryId || !storyData
        ? 'story_data_missing'
        : !ebookPricing
          ? 'pricing_missing'
          : userCredits === null
            ? 'credits_missing'
            : hasInsufficientCredits
              ? 'insufficient_credits'
              : undefined;
    trackStoryCreation.generateClicked({
      step: 5,
      story_id: currentStoryId || undefined,
      has_story_data: !!storyData,
      has_pricing: !!ebookPricing,
      ebook_cost: ebookPricing?.cost,
      user_credits: userCredits ?? undefined,
      can_generate: canGenerate,
      blocked_reason: blockedReason,
    });

    if (!currentStoryId || !storyData || !ebookPricing || userCredits === null) {
      setError(tStoryStepsStep5('storyDataNotAvailable'));
      return;
    }
    if (needsFormatCorrection) {
      setError(tBook('correctFormat'));
      return;
    }

    if (hasInsufficientCredits) {
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
        {storyGenerationStarted ? (
          <div data-wizard-step="5" className={styles.generation}>
            <StoryGenerationProgress
              storyId={currentStoryId!}
              storyTitle={storyData?.title}
              premiumBook={isPremiumBook}
            />
          </div>
        ) : (
          <div data-wizard-step="5" className={styles.confirmation}>
            <div className={styles.wizardProgress}>
              <ProgressIndicator currentStep={5} totalSteps={5} showStepsOnMobile />
            </div>

            <div className={styles.panel}>
              <p className={styles.finale}>{tStoryStepsStep5('heading')}</p>

              {error && (
                <div className="alert alert-error mb-4" role="alert">
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
                <>
                  <header className={styles.intro}>
                    <span className={styles.flourish} aria-hidden="true">
                      <PiSparkleFill />
                    </span>
                    <h1 className={styles.title}>
                      {isPremiumBook ? tBook('title') : tStoryStepsStep5('confirmation.title')}
                    </h1>
                    <p className={styles.storyTitle}>{storyData.title}</p>
                  </header>

                  <section className={styles.section} aria-labelledby="confirmation-next-heading">
                    <h2 id="confirmation-next-heading" className={styles.sectionHeading}>
                      {tStoryStepsStep5('confirmation.nextHeading')}
                    </h2>
                    <ol className={styles.stages} role="list">
                      {creationStages.map(({ label, src, width, height }, index) => (
                        <li key={label} className={styles.stage}>
                          <ThemedArtwork
                            src={src}
                            alt=""
                            width={width}
                            height={height}
                            sizes="(max-width: 768px) 72px, 120px"
                            className={styles.stageArtwork}
                          />
                          <span>{tStoryStepsStep5(label)}</span>
                          {index < creationStages.length - 1 && (
                            <PiArrowRight className={styles.stageArrow} aria-hidden="true" />
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section
                    className={styles.section}
                    aria-labelledby="confirmation-outcomes-heading"
                  >
                    <span className={styles.flourish} aria-hidden="true">
                      <PiSparkleFill />
                    </span>
                    <h2 id="confirmation-outcomes-heading" className={styles.sectionHeading}>
                      {tStoryStepsStep5('confirmation.outcomesHeading')}
                    </h2>
                    <ul className={styles.outcomes} role="list">
                      {storyOutcomes.map(({ label, Icon }) => (
                        <li key={label}>
                          <Icon aria-hidden="true" />
                          <span>{tStoryStepsStep5(label)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.optional}>
                      {tStoryStepsStep5('confirmation.optionalAddOns')}
                    </p>
                  </section>

                  {(ebookPricing || userCredits !== null) && (
                    <div className={styles.credits}>
                      {ebookPricing && (
                        <p className={styles.cost}>
                          {tStoryStepsStep5('confirmation.digitalBook', {
                            count: ebookPricing.cost,
                          })}
                        </p>
                      )}
                      {userCredits !== null && (
                        <p className={styles.balance}>
                          {tStoryStepsStep5('confirmation.currentBalance')}{' '}
                          <strong
                            className={
                              hasInsufficientCredits ? styles.lowBalance : styles.availableBalance
                            }
                          >
                            {tStoryStepsStep5('confirmation.balanceCredits', {
                              count: userCredits,
                            })}
                          </strong>
                        </p>
                      )}
                    </div>
                  )}

                  {needsFormatCorrection && (
                    <div role="alert" className="alert alert-warning mt-4">
                      {tBook('correctFormat')}
                    </div>
                  )}

                  {hasInsufficientCredits && (
                    <div className="alert alert-warning mt-4" role="status">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-gray-800">
                          {tStoryStepsStep5('insufficientCreditsTitle')}
                        </span>
                        <span className="mt-2 text-sm text-gray-700">
                          {tStoryStepsStep5('needMoreCredits', {
                            count: creditShortfall,
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
                </>
              ) : (
                <h1 className={`${styles.title} py-8 text-center`}>
                  {tStoryStepsStep5('storyDataNotAvailable')}
                </h1>
              )}

              <div className={styles.actions}>
                <StepNavigation
                  currentStep={5}
                  totalSteps={5}
                  nextHref={null}
                  prevHref={
                    editStoryId
                      ? `/tell-your-story/step-4?edit=${editStoryId}`
                      : '/tell-your-story/step-4'
                  }
                  nextDisabled={!storyData || submitting || !canGenerate || needsFormatCorrection}
                  busy={submitting}
                  onNext={storyData ? handleCompleteStory : undefined}
                  prevLabel={tStoryStepsStep5('confirmation.back')}
                  nextLabel={
                    submitting
                      ? tStoryStepsStep5('startingGeneration')
                      : tStoryStepsStep5('generateMyStory')
                  }
                  inline
                />
              </div>
            </div>
          </div>
        )}
      </Show>
    </>
  );
}
