'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentStoryId, hasValidStorySession } from '../../../../lib/story-session';

interface StoryData {
  storyId: string;
  title: string;
  place: string | null;
  targetAudience: string | null;
  graphicalStyle: string | null;
  plotDescription: string | null;
  additionalRequests: string | null;
}

export default function Step4Page() {
  const router = useRouter();  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  
  // Form data
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [graphicalStyle, setGraphicalStyle] = useState('');
  const [plotDescription, setPlotDescription] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');

  const targetAudienceOptions = [
    { value: '', label: 'Select target audience...' },
    { value: 'Toddlers', label: 'Toddlers (1-3 years)' },
    { value: 'Young Kids', label: 'Young Kids (4-6 years)' },
    { value: 'Kids', label: 'Kids (7-12 years)' },
    { value: 'Teenagers', label: 'Teenagers (13-17 years)' },
    { value: 'Adults', label: 'Adults (18+ years)' }
  ];

  const graphicalStyleOptions = [
    { value: '', label: 'Select graphic style...' },
    { value: 'Colored Book', label: 'Colored Book' },
    { value: 'Watercolor', label: 'Watercolor' },
    { value: 'Pixar Animation', label: 'Pixar Animation' },
    { value: 'Disney Style', label: 'Disney Style' },
    { value: 'Anime', label: 'Anime' },
    { value: 'Cartoon', label: 'Cartoon' },
    { value: 'Realistic', label: 'Realistic' },
    { value: 'Minimalist', label: 'Minimalist' },
    { value: 'Vintage', label: 'Vintage' },
    { value: 'Comic Book', label: 'Comic Book' }
  ];

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
    }
  }, [router]);

  const fetchStoryData = async (storyId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/my-stories/${storyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch story data');
      }
      
      const data = await response.json();
      const story: StoryData = data.story;
      
      // Pre-populate form fields
      setTitle(story.title || '');
      setPlace(story.place || '');
      setTargetAudience(story.targetAudience || '');
      setGraphicalStyle(story.graphicalStyle || '');
      setPlotDescription(story.plotDescription || '');
      setAdditionalRequests(story.additionalRequests || '');
      
    } catch (error) {
      console.error('Error fetching story data:', error);
      setError('Failed to load story information. Please try again.');
    } finally {
      setLoading(false);
    }  };

  const handleNext = async () => {
    // Auto-save before navigating
    if (!title.trim()) {
      setError('Title is required before proceeding to the next step.');
      return;
    }

    if (!currentStoryId) {
      setError('No story found. Please start from step 1.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/my-stories/${currentStoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          place: place.trim() || null,
          targetAudience: targetAudience || null,
          graphicalStyle: graphicalStyle || null,
          plotDescription: plotDescription.trim() || null,
          additionalRequests: additionalRequests.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save story details');
      }

      // Navigate to next step after successful save
      router.push('/tell-your-story/step-5');
      
    } catch (error) {
      console.error('Error saving story:', error);
      setError('Failed to save story details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      
      <SignedIn>        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress indicator */}
            {(() => {
              const currentStep = 4;
              const totalSteps = 7;
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
                      <li className="step" data-content="5"></li>
                      <li className="step" data-content="6"></li>
                      <li className="step" data-content="7"></li>
                    </ul>
                  </div>
                </>
              );
            })()}

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">Chapter 4 - The Plot</h1>
                
                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">Loading your story details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="prose max-w-none mb-6">
                      <p className="text-gray-600">
                        Now let&apos;s define the core elements of your story. Tell us about the world you want to create, 
                        who you&apos;re writing for, and how you envision your story looking.
                      </p>
                    </div>

                    {error && (
                      <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Title Field */}
                      <div className="form-control md:col-span-2">
                        <label className="label">
                          <span className="label-text font-semibold">Book Title *</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter your book title"
                          className="input input-bordered w-full"
                          required
                        />
                        <label className="label">
                          <span className="label-text-alt">Choose a captivating title for your story</span>
                        </label>
                      </div>

                      {/* Place Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold">Setting/Place</span>
                        </label>
                        <input
                          type="text"
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="e.g., Enchanted Forest, Modern City, Space Station..."
                          className="input input-bordered w-full"
                        />
                        <label className="label">
                          <span className="label-text-alt">Where does your story take place? (real or imaginary)</span>
                        </label>
                      </div>

                      {/* Target Audience Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold">Target Audience</span>
                        </label>
                        <select
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="select select-bordered w-full"
                        >
                          {targetAudienceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt">Who is this story written for?</span>
                        </label>
                      </div>

                      {/* Graphic Style Field */}
                      <div className="form-control md:col-span-2">
                        <label className="label">
                          <span className="label-text font-semibold">Graphic Style</span>
                        </label>
                        <select
                          value={graphicalStyle}
                          onChange={(e) => setGraphicalStyle(e.target.value)}
                          className="select select-bordered w-full"
                        >
                          {graphicalStyleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt">Choose the artistic style for your story&apos;s illustrations</span>
                        </label>
                      </div>
                    </div>

                    {/* Story Outline Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Story Outline</span>
                      </label>
                      <textarea
                        value={plotDescription}
                        onChange={(e) => setPlotDescription(e.target.value)}
                        placeholder="Describe all the details you'd like in the story..."
                        className="textarea textarea-bordered h-32 w-full"
                        rows={6}
                      />
                      <label className="label">
                        <span className="label-text-alt">Describe your story&apos;s plot, characters, and key events</span>
                      </label>
                    </div>

                    {/* Additional Requests Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Additional Requests</span>
                        <span className="label-text-alt">Optional</span>
                      </label>
                      <textarea
                        value={additionalRequests}
                        onChange={(e) => setAdditionalRequests(e.target.value)}
                        placeholder="Mention any specific products, companies, or details to include..."
                        className="textarea textarea-bordered h-24 w-full"
                        rows={4}
                      />
                      <label className="label">
                        <span className="label-text-alt">Any special requests or specific elements you want included</span>
                      </label>
                    </div>                  </div>
                )}

                <StepNavigation
                  currentStep={4}
                  totalSteps={7}
                  nextHref="/tell-your-story/step-5"
                  prevHref="/tell-your-story/step-3"
                  onNext={handleNext}
                  nextDisabled={saving}
                  nextLabel={saving ? "Saving..." : "Next Chapter"}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
