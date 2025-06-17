'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getCurrentStoryId, hasValidStorySession } from '../../../../lib/story-session';
import { 
  TargetAudience, 
  NovelStyle, 
  GraphicalStyle,
  TargetAudienceLabels,
  NovelStyleLabels,
  GraphicalStyleLabels,
  getAllTargetAudiences,
  getAllNovelStyles,
  getAllGraphicalStyles
} from '../../../../types/story-enums';

interface StoryData {
  storyId: string;
  title: string;
  place: string | null;
  targetAudience: TargetAudience | null;
  novelStyle: NovelStyle | null;
  graphicalStyle: GraphicalStyle | null;
  plotDescription: string | null;
  additionalRequests: string | null;
}

export default function Step4Page() {
  const router = useRouter();
  const t = useTranslations('StorySteps.step4');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
    // Form data
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>('');
  const [novelStyle, setNovelStyle] = useState<NovelStyle | ''>('');
  const [graphicalStyle, setGraphicalStyle] = useState<GraphicalStyle | ''>('');
  const [plotDescription, setPlotDescription] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');

  const targetAudienceOptions = [
    { value: '', label: 'Select target audience...' },
    ...getAllTargetAudiences().map(value => ({
      value,
      label: TargetAudienceLabels[value]
    }))
  ];

  const novelStyleOptions = [
    { value: '', label: 'Select novel style...' },
    ...getAllNovelStyles().map(value => ({
      value,
      label: NovelStyleLabels[value]
    }))
  ];

  const graphicalStyleOptions = [
    { value: '', label: 'Select graphic style...' },
    ...getAllGraphicalStyles().map(value => ({
      value,
      label: GraphicalStyleLabels[value]
    }))
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
      setNovelStyle(story.novelStyle || '');
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
        },        body: JSON.stringify({
          title: title.trim(),
          place: place.trim() || null,
          targetAudience: targetAudience || null,
          novelStyle: novelStyle || null,
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
                <h1 className="card-title text-3xl mb-6">{t('heading')}</h1>
                
                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">{t('saving')}</p>
                  </div>
                ) : (
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
                      </div>                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Title Field */}
                      <div className="form-control md:col-span-2">
                        <label className="label">
                          <span className="label-text font-semibold">{t('fields.title')}</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t('fields.title')}
                          className="input input-bordered w-full"
                          required
                        />
                        <label className="label">
                          <span className="label-text-alt">{t('fields.titleHelp')}</span>
                        </label>
                      </div>

                      {/* Place Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold">{t('fields.place')}</span>
                        </label>
                        <input
                          type="text"
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder={t('fields.place')}
                          className="input input-bordered w-full"
                        />
                        <label className="label">
                          <span className="label-text-alt">{t('fields.placeHelp')}</span>
                        </label>
                      </div>                      {/* Target Audience Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold">{t('fields.audience')}</span>
                        </label>
                        <select
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value as TargetAudience | '')}
                          className="select select-bordered w-full"
                        >
                          {targetAudienceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt">{t('fields.audienceHelp')}</span>
                        </label>
                      </div>

                      {/* Novel Style Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold">{t('fields.novelStyle')}</span>
                        </label>
                        <select
                          value={novelStyle}
                          onChange={(e) => setNovelStyle(e.target.value as NovelStyle | '')}
                          className="select select-bordered w-full"
                        >
                          {novelStyleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt">{t('fields.novelStyleHelp')}</span>
                        </label>
                      </div>

                      {/* Graphic Style Field */}
                      <div className="form-control md:col-span-2">
                        <label className="label">
                          <span className="label-text font-semibold">{t('fields.graphicStyle')}</span>
                        </label>
                        <select
                          value={graphicalStyle}
                          onChange={(e) => setGraphicalStyle(e.target.value as GraphicalStyle | '')}
                          className="select select-bordered w-full"
                        >
                          {graphicalStyleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt">{t('fields.graphicStyleHelp')}</span>
                        </label>
                      </div>
                    </div>

                    {/* Story Outline Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{t('fields.outline')}</span>
                      </label>
                      <textarea
                        value={plotDescription}
                        onChange={(e) => setPlotDescription(e.target.value)}
                        placeholder="Describe all the details you'd like in the story..."
                        className="textarea textarea-bordered h-32 w-full"
                        rows={6}
                      />
                      <label className="label">
                        <span className="label-text-alt">{t('fields.outlineHelp')}</span>
                      </label>
                    </div>

                    {/* Additional Requests Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">{t('fields.additional')}</span>
                        <span className="label-text-alt">{t('fields.additional')}</span>
                      </label>
                      <textarea
                        value={additionalRequests}
                        onChange={(e) => setAdditionalRequests(e.target.value)}
                        placeholder={t('fields.additional')}
                        className="textarea textarea-bordered h-24 w-full"
                        rows={4}
                      />
                      <label className="label">
                        <span className="label-text-alt">{t('fields.additionalHelp')}</span>
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
                  nextLabel={saving ? t('saving') : t('nextChapter')}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
