'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '@/components/StepNavigation';
import StoryGenerationProgress from '@/components/StoryGenerationProgress';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentStoryId, hasValidStorySession } from '@/lib/story-session';

interface StoryData {
  storyId: string;
  title: string;
  features?: {
    ebook?: boolean;
    printed?: boolean;
    audiobook?: boolean;
  };
  deliveryAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    stateRegion?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  dedicationMessage?: string;
}

export default function Step6Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [storyGenerationStarted, setStoryGenerationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<StoryData | null>(null);

  useEffect(() => {
    // Check if we have a valid story session
    if (!hasValidStorySession()) {
      router.push('/tell-your-story/step-1');
      return;
    }

    const storyId = getCurrentStoryId();
    setCurrentStoryId(storyId);
    
    if (storyId) {
      fetchStoryData(storyId);
    } else {
      setLoading(false);
    }
  }, [router]);

  const fetchStoryData = async (storyId: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/my-stories/${storyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch story data');
      }
      
      const data = await response.json();
      setStoryData(data.story);
    } catch (error) {
      console.error('Error fetching story data:', error);
      setError('Failed to load story data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleCompleteStory = async () => {
    if (!currentStoryId || !storyData) {
      setError('Story data not available');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/stories/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: currentStoryId,
          features: storyData.features || { ebook: true, printed: false, audiobook: false },
          deliveryAddress: storyData.deliveryAddress,
          dedicationMessage: storyData.dedicationMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete story');
      }

      const result = await response.json();
      console.log('Story generation started:', result);

      // Show the progress component instead of navigating to step-7
      setStoryGenerationStarted(true);
    } catch (error) {
      console.error('Error completing story:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete story');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading story data...</p>
        </div>
      </div>
    );
  }  return (
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
                {/* Progress indicator */}            {(() => {
                  const currentStep = 6;
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
                          <li className="step step-primary" data-content="2"></li>
                          <li className="step step-primary" data-content="3"></li>
                          <li className="step step-primary" data-content="4"></li>
                          <li className="step step-primary" data-content="5"></li>
                          <li className="step step-primary" data-content="6"></li>
                        </ul>
                      </div>
                    </>
                  );
                })()}

                {/* Step content */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h1 className="card-title text-3xl mb-6">Complete Your Story</h1>
                    
                    {error && (
                      <div className="alert alert-error mb-6">
                        <span>{error}</span>
                      </div>
                    )}

                    {storyData ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold mb-4">Ready to Generate Your Story!</h2>
                          <p className="text-lg text-gray-600 mb-6">
                            We&apos;re about to start creating your personalized story: <strong>{storyData.title}</strong>
                          </p>
                          
                          <div className="card bg-base-200 p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">Story Features:</h3>
                            <div className="flex flex-wrap justify-center gap-4">
                              {storyData.features?.ebook && (
                                <div className="badge badge-primary badge-lg">📖 eBook</div>
                              )}
                              {storyData.features?.printed && (
                                <div className="badge badge-secondary badge-lg">📚 Printed Book</div>
                              )}
                              {storyData.features?.audiobook && (
                                <div className="badge badge-accent badge-lg">🎧 Audiobook</div>
                              )}
                            </div>
                          </div>

                          <div className="alert alert-info mb-6">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold">⏱️ Story Generation Process</span>                          <span className="text-sm mt-2">
                                This process may take several minutes. We&apos;ll create your story chapters, 
                                generate illustrations, and prepare all selected formats. You&apos;ll be able to 
                                track the progress from your &quot;My Stories&quot; page.
                              </span>
                            </div>
                          </div>

                          <button 
                            className={`btn btn-primary btn-lg ${submitting ? 'loading' : ''}`}
                            onClick={handleCompleteStory}
                            disabled={submitting}
                          >
                            {submitting ? 'Starting Story Generation...' : '🚀 Generate My Story'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-lg text-gray-600">Story data not available. Please try again.</p>
                      </div>
                    )}                <StepNavigation 
                      currentStep={6}
                      totalSteps={6}
                      nextHref={null} // No next button, user must complete the story
                      prevHref="/tell-your-story/step-5"
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
