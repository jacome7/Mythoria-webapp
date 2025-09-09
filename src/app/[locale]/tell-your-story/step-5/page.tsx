"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import StepNavigation from '@/components/StepNavigation';
import ProgressIndicator from '@/components/ProgressIndicator';
import StoryGenerationProgress from '@/components/StoryGenerationProgress';
import { trackStoryCreation } from '@/lib/analytics';
import { getStep1Data } from '@/lib/story-session';
import { useStorySessionGuard } from '@/hooks/useStorySessionGuard';

interface StoryData {
  storyId: string;
  title: string;
}

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
  const searchParams = useSearchParams();
  const editStoryId = searchParams?.get("edit");
  const locale = useLocale();
  const tStoryStepsStep5 = useTranslations("StorySteps.step5");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [storyGenerationStarted, setStoryGenerationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStoryId = useStorySessionGuard();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [ebookPricing, setEbookPricing] = useState<EbookPricing | null>(null);

  useEffect(() => {
    if (!currentStoryId) return;

    Promise.all([
      fetchStoryData(currentStoryId),
      fetchUserCredits(),
      fetchEbookPricing(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [currentStoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStoryData = async (storyId: string) => {
    try {
      const response = await fetch(`/api/my-stories/${storyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch story data");
      }
      const data = await response.json();
      setStoryData(data.story);
    } catch (error) {
      console.error("Error fetching story data:", error);
      setError(tStoryStepsStep5("alerts.failedToFetchStoryData"));
    }
  };
  const fetchUserCredits = async () => {
    try {
      const response = await fetch("/api/my-credits");
      if (!response.ok) {
        throw new Error("Failed to fetch user credits");
      }
      const data = await response.json();
      setUserCredits(data.currentBalance || 0);
    } catch (error) {
      console.error("Error fetching user credits:", error);
      setError(tStoryStepsStep5("alerts.failedToFetchUserCredits"));
    }
  };

  const fetchEbookPricing = async () => {
    try {
      const response = await fetch("/api/pricing/services");
      if (!response.ok) {
        throw new Error("Failed to fetch pricing data");
      }
      const data = await response.json();
      const ebook = data.services.find(
        (service: ServiceResponse) => service.serviceCode === "eBookGeneration",
      );
      if (ebook) {
        setEbookPricing(ebook);
      }
    } catch (error) {
      console.error("Error fetching pricing data:", error);
      setError(tStoryStepsStep5("alerts.failedToFetchPricingData"));
    }
  };

  const hasInsufficientCredits = () => {
    // If pricing isn't loaded yet, assume insufficient credits to prevent premature actions
    if (!ebookPricing) return true;
    return userCredits < ebookPricing.cost;
  };

  const handleCompleteStory = async () => {
    if (!currentStoryId || !storyData || !ebookPricing) {
      setError(tStoryStepsStep5("storyDataNotAvailable"));
      return;
    }

    if (hasInsufficientCredits()) {
      setError(tStoryStepsStep5("alerts.insufficientCreditsError"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // First, deduct credits for the ebook generation
      const creditsResponse = await fetch(
        `/api/stories/${currentStoryId}/deduct-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storyId: currentStoryId,
            selectedFeatures: { ebook: true, printed: false, audiobook: false },
          }),
        },
      );

      if (!creditsResponse.ok) {
        const creditsError = await creditsResponse.json();
        console.error("Failed to deduct credits:", creditsError);
        setError(tStoryStepsStep5("alerts.failedToDeductCredits"));
        return;
      }

      const creditsResult = await creditsResponse.json();
      console.log("Credits deducted successfully:", creditsResult);

      // Update local credit balance
      setUserCredits(creditsResult.newBalance);

      // Get step 1 data from session
      const step1Data = getStep1Data();
      const dedicationMessage = step1Data?.dedicationMessage || "";
      const customAuthor = step1Data?.customAuthor || "";

      const response = await fetch("/api/stories/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId: currentStoryId,
          features: { ebook: true, printed: false, audiobook: false },
          dedicationMessage: dedicationMessage,
          customAuthor: customAuthor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to complete story:", errorData);
        setError(tStoryStepsStep5("alerts.failedToCompleteStory"));
        return;
      }

      const result = await response.json();
      console.log("Story generation started:", result);

      // Track story generation request
      const hasDedication = !!step1Data?.dedicationMessage;

      trackStoryCreation.generationRequested({
        story_id: currentStoryId,
        ebook_requested: true,
        printed_requested: false,
        audiobook_requested: false,
        has_delivery_address: false,
        has_dedication: hasDedication,
      });

      // Show the progress component instead of navigating to next step
      setStoryGenerationStarted(true);
    } catch (error) {
      console.error("Error completing story:", error);
      setError(tStoryStepsStep5("alerts.failedToCompleteStory"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {" "}
        <div className="max-w-4xl mx-auto text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">{tStoryStepsStep5("loadingStoryData")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Show progress component if story generation has started */}
            {storyGenerationStarted ? (
              <StoryGenerationProgress storyId={currentStoryId!} />
            ) : (
              <>
                <ProgressIndicator currentStep={5} totalSteps={5} />

                {/* Step content */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h1 className="card-title text-3xl mb-6 text-gray-800">
                      {tStoryStepsStep5("heading")}
                    </h1>

                    {error && (
                      <div className="alert alert-error mb-6">
                        <span>{error}</span>
                      </div>
                    )}

                    {storyData ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            {tStoryStepsStep5("readyToGenerate")}
                          </h2>
                          <p className="text-lg text-gray-600 mb-6">
                            {tStoryStepsStep5("aboutToStart")}{" "}
                            <strong className="text-gray-800">
                              {storyData.title}
                            </strong>
                          </p>

                          {/* Credits Information */}
                          <div className="space-y-4 mb-6">
                            {/* Ebook Service Info */}
                            {ebookPricing && (
                              <div className="card bg-base-200 p-6">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                  {tStoryStepsStep5("ebookGeneration")}
                                </h3>
                                <div className="flex justify-center items-center gap-6">
                                  <div className="text-center">
                                    <span className="text-sm text-gray-600">
                                      {tStoryStepsStep5("cost")}
                                    </span>
                                    <div className="text-2xl font-bold text-primary">
                                      {ebookPricing.cost}{" "}
                                      {tStoryStepsStep5("credits")}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-sm text-gray-600">
                                      {tStoryStepsStep5("yourCredits")}
                                    </span>
                                    <div
                                      className={`text-2xl font-bold ${hasInsufficientCredits() ? "text-error" : "text-success"}`}
                                    >
                                      {userCredits}{" "}
                                      {tStoryStepsStep5("credits")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Insufficient Credits Warning */}
                            {hasInsufficientCredits() && (
                              <div className="alert alert-warning">
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-gray-800">
                                    {tStoryStepsStep5(
                                      "insufficientCreditsTitle",
                                    )}
                                  </span>
                                  <span className="text-sm mt-2 text-gray-700">
                                    {tStoryStepsStep5("needMoreCredits", {
                                      count: ebookPricing
                                        ? ebookPricing.cost - userCredits
                                        : 0,
                                    })}
                                  </span>
                                  <a
                                    href={`/${locale}/pricing`}
                                    className="btn btn-outline btn-sm mt-2"
                                  >
                                    {tStoryStepsStep5("getMoreCredits")}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            className={`btn btn-primary btn-lg ${submitting ? "loading" : ""}`}
                            onClick={handleCompleteStory}
                            disabled={submitting || hasInsufficientCredits()}
                          >
                            {submitting
                              ? tStoryStepsStep5("startingGeneration")
                              : tStoryStepsStep5("generateMyStory")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-lg text-gray-600">
                          {tStoryStepsStep5("storyDataNotAvailable")}
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
                          : "/tell-your-story/step-4"
                      }
                      nextDisabled={true}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </SignedIn>
    </>
  );
}
