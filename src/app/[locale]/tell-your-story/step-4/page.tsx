'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { trackStoryCreation } from '../../../../lib/analytics';
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
  imageGenerationInstructions: string | null;
  chapterCount?: number | null;
  storyLanguage?: string | null;
}

export default function Step4PageWrapper() {
  return (
    <Suspense>
      <Step4Page />
    </Suspense>
  );
}

function Step4Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string || 'en-US';
  const editStoryId = searchParams.get('edit');
  const t = useTranslations('StorySteps.step4');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);  // Form data
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>(TargetAudience.CHILDREN_3_6);
  const [novelStyle, setNovelStyle] = useState<NovelStyle | ''>('');
  const [graphicalStyle, setGraphicalStyle] = useState<GraphicalStyle | ''>('');
  const [plotDescription, setPlotDescription] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');
  const [imageGenerationInstructions, setImageGenerationInstructions] = useState('');
  const [chapterCount, setChapterCount] = useState<number>(4); // Default matches CHILDREN_3_6
  const [isChapterCountManual, setIsChapterCountManual] = useState(false);
  const [storyLanguage, setStoryLanguage] = useState<string>(locale);

  // Accordion state
  const [styleSettingOpen, setStyleSettingOpen] = useState(false);
  const [contentDetailsOpen, setContentDetailsOpen] = useState(false);
  
  // Modal state
  const [showStyleSamples, setShowStyleSamples] = useState(false);

  // Language options from translation
  const languageOptions = t.raw('languageOptions') as Array<{value: string, label: string}>;
  const hasStyleSettingData = () => {
    return place.trim() || novelStyle || graphicalStyle || imageGenerationInstructions.trim();
  };

  const hasContentDetailsData = () => {
    return plotDescription.trim() || additionalRequests.trim();
  };

  const getStyleSettingPreview = () => {
    const parts = [];
    if (novelStyle) parts.push(NovelStyleLabels[novelStyle]);
    if (graphicalStyle) parts.push(GraphicalStyleLabels[graphicalStyle]);
    if (place.trim()) parts.push(place.trim());
    if (imageGenerationInstructions.trim()) parts.push(t('previews.customImageInstructions'));
    return parts.join(', ');
  };

  const getContentDetailsPreview = () => {
    const parts = [];
    if (plotDescription.trim()) parts.push(t('previews.storyOutlineProvided'));
    if (additionalRequests.trim()) parts.push(t('previews.additionalRequestsProvided'));
    return parts.join(', ');
  };

  const isSectionComplete = (section: 'style' | 'content') => {
    if (section === 'style') {
      return novelStyle && graphicalStyle; // Required fields
    }
    return true; // Content details are optional
  };


  
  // Chapter count mapping based on target audience
  const getChapterCountForAudience = useCallback((audience: TargetAudience | ''): number => {
    if (!audience) return 6;
    const chapterMap: Record<TargetAudience, number> = {
      [TargetAudience.CHILDREN_0_2]: 2,
      [TargetAudience.CHILDREN_3_6]: 4,
      [TargetAudience.CHILDREN_7_10]: 6,
      [TargetAudience.CHILDREN_11_14]: 6,
      [TargetAudience.YOUNG_ADULT_15_17]: 8,
      [TargetAudience.ADULT_18_PLUS]: 10,
      [TargetAudience.ALL_AGES]: 6
    };

    return chapterMap[audience] || 6;
  }, []);

  const targetAudienceOptions = [
    { value: '', label: t('placeholders.selectAudience') },
    ...getAllTargetAudiences().map(value => ({
      value,
      label: TargetAudienceLabels[value]
    }))
  ];

  const novelStyleOptions = [
    { value: '', label: t('placeholders.selectNovelStyle') },
    ...getAllNovelStyles().map(value => ({
      value,
      label: NovelStyleLabels[value]
    }))
  ];

  const graphicalStyleOptions = [
    { value: '', label: t('placeholders.selectGraphicStyle') },
    ...getAllGraphicalStyles().map(value => ({
      value,
      label: GraphicalStyleLabels[value]
    }))];  // Auto-update chapter count when target audience changes (unless manually overridden)
  useEffect(() => {
    if (!isChapterCountManual && targetAudience) {
      const newCount = getChapterCountForAudience(targetAudience);
      setChapterCount(newCount);
    }
  }, [targetAudience, isChapterCountManual, getChapterCountForAudience]);
  const fetchStoryData = useCallback(async (storyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/my-stories/${storyId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch story data');
      }

      const data = await response.json();
      const story: StoryData = data.story;        // Pre-populate form fields
      setTitle(story.title || '');
      setPlace(story.place || '');
      setTargetAudience(story.targetAudience || '');
      setNovelStyle(story.novelStyle || '');
      setGraphicalStyle(story.graphicalStyle || '');
      setPlotDescription(story.plotDescription || '');
      setAdditionalRequests(story.additionalRequests || '');
      setImageGenerationInstructions(story.imageGenerationInstructions || '');
      
      // Set story language - prefer the one from the story, fallback to current locale
      setStoryLanguage(story.storyLanguage || locale);      // Handle chapter count - only mark as manual if it differs from the expected automatic value
      if (story.chapterCount !== null && story.chapterCount !== undefined) {
        const expectedCount = getChapterCountForAudience(story.targetAudience || '');
        const isManuallySet = story.chapterCount !== expectedCount;
        setChapterCount(story.chapterCount);
        setIsChapterCountManual(isManuallySet);
      } else {
        const defaultCount = getChapterCountForAudience(story.targetAudience || '');
        setChapterCount(defaultCount);
        setIsChapterCountManual(false);
      }
    } catch (error) {
      console.error('Error fetching story data:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [getChapterCountForAudience, locale]);

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
  }, [router, fetchStoryData]);
  const handleNext = async () => {
    // Auto-save before navigating
    if (!title.trim()) {
      setError(t('errors.titleRequired'));
      return;
    }

    if (!targetAudience) {
      setError(t('errors.audienceRequired'));
      return;
    }

    if (!novelStyle) {
      setError(t('errors.novelStyleRequired'));
      setStyleSettingOpen(true);
      return;
    }

    if (!graphicalStyle) {
      setError(t('errors.graphicStyleRequired'));
      setStyleSettingOpen(true);
      return;
    }

    if (!currentStoryId) {
      setError(t('errors.noStoryFound'));
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
          novelStyle: novelStyle || null,
          graphicalStyle: graphicalStyle || null,
          plotDescription: plotDescription.trim() || null,
          additionalRequests: additionalRequests.trim() || null,
          imageGenerationInstructions: imageGenerationInstructions.trim() || null,
          chapterCount: chapterCount,
          storyLanguage: storyLanguage,
        }),
      });      if (!response.ok) {
        throw new Error(t('errors.saveFailed'));
      }

      // Track step 4 completion
      trackStoryCreation.step4Completed({
        step: 4,
        story_id: currentStoryId,
        title_provided: !!title.trim(),
        place_provided: !!place.trim(),
        target_audience: targetAudience || undefined,
        novel_style: novelStyle || undefined,
        graphical_style: graphicalStyle || undefined,
        chapter_count: chapterCount,
        has_plot_description: !!plotDescription.trim(),
        has_additional_requests: !!additionalRequests.trim(),
        has_image_generation_instructions: !!imageGenerationInstructions.trim()
      });      // Navigate to next step after successful save
      if (editStoryId) {
        // In edit mode, pass the edit parameter to the next step
        router.push(`/tell-your-story/step-5?edit=${editStoryId}`);
      } else {
        // Normal flow - navigate to step 5
        router.push('/tell-your-story/step-5');
      }

    } catch (error) {
      console.error('Error saving story:', error);
      setError(t('errors.saveFailedTryAgain'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress indicator */}
            {(() => {              const currentStep = 4;
              const totalSteps = 5;
              return (
                <>
                  {/* Mobile Progress Indicator */}
                  <div className="block md:hidden mb-8">
                    <div className="text-center text-sm text-gray-600 mb-2">
                      {t('progress.stepLabel', { currentStep, totalSteps })}
                    </div>
                    <progress
                      className="progress progress-primary w-full"
                      value={currentStep}
                      max={totalSteps}
                    ></progress>
                  </div>

                  {/* Desktop Progress Indicator */}
                  <div className="hidden md:block mb-8">                    <ul className="steps steps-horizontal w-full">
                      <li className="step step-primary" data-content="1"></li>
                      <li className="step step-primary" data-content="2"></li>
                      <li className="step step-primary" data-content="3"></li>
                      <li className="step step-primary" data-content="4"></li>
                      <li className="step" data-content="5"></li>
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
                      </div>
                    )}

                    {/* Story Basics - Always Expanded */}
                    <div className="card bg-base-200 shadow-sm mb-6">
                      <div className="card-body">
                        <h2 className="card-title text-xl mb-4 flex items-center">
                          <span className="text-primary">📖</span>
                          {t('sections.storyBasics')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Title Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.title')} *</span>
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
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.titleHelp')}</span>
                            </label>
                          </div>

                          {/* Target Audience Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.audience')} *</span>
                            </label>
                            <select
                              value={targetAudience}
                              onChange={(e) => {
                                const newAudience = e.target.value as TargetAudience | '';
                                setTargetAudience(newAudience);
                                // Reset manual flag to allow automatic chapter count adjustment
                                setIsChapterCountManual(false);
                              }}
                              className="select select-bordered w-full"
                              required
                            >
                              {targetAudienceOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.audienceHelp')}</span>
                            </label>
                          </div>

                          {/* Book Size Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.bookSize')}</span>
                            </label>
                            <select
                              value={chapterCount}
                              onChange={(e) => {
                                setChapterCount(Number(e.target.value));
                                setIsChapterCountManual(true);
                              }}
                              className="select select-bordered w-full"
                            >
                              {[2, 4, 6, 8, 10].map((count) => (
                                <option key={count} value={count}>
                                  {count} {count === 1 ? t('plurals.chapter') : t('plurals.chapters')}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.bookSizeHelp')}</span>
                            </label>
                          </div>

                          {/* Story Language Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.storyLanguage')}</span>
                            </label>
                            <select
                              value={storyLanguage}
                              onChange={(e) => setStoryLanguage(e.target.value)}
                              className="select select-bordered w-full"
                            >
                              {languageOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('placeholders.storyLanguageHelp')}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Style & Setting - Collapsible */}
                    <div className="collapse collapse-arrow bg-base-200 mb-6">
                      <input 
                        type="checkbox" 
                        checked={styleSettingOpen}
                        onChange={(e) => setStyleSettingOpen(e.target.checked)}
                      />
                      <div className="collapse-title text-xl font-medium flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-primary mr-2">🎨</span>
                          {t('sections.styleSetting')}
                          {!isSectionComplete('style') && (
                            <span className="badge badge-warning badge-sm ml-2">{t('sections.required')}</span>
                          )}
                        </div>
                        {hasStyleSettingData() && (
                          <span className="text-sm text-gray-600 font-normal truncate max-w-xs hidden md:inline">
                            {getStyleSettingPreview()}
                          </span>
                        )}
                      </div>
                      <div className="collapse-content">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          {/* Place Field */}
                          <div className="form-control md:col-span-2">
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
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.placeHelp')}</span>
                            </label>
                          </div>

                          {/* Novel Style Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.novelStyle')} *</span>
                            </label>
                            <select
                              value={novelStyle}
                              onChange={(e) => setNovelStyle(e.target.value as NovelStyle | '')}
                              className="select select-bordered w-full"
                              required
                            >
                              {novelStyleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.novelStyleHelp')}</span>
                            </label>
                          </div>

                          {/* Graphic Style Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.graphicStyle')} *</span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm ml-2 text-primary hover:text-primary-focus"
                                onClick={() => setShowStyleSamples(true)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('modal.samples')}
                              </button>
                            </label>
                            <select
                              value={graphicalStyle}
                              onChange={(e) => setGraphicalStyle(e.target.value as GraphicalStyle | '')}
                              className="select select-bordered w-full"
                              required
                            >
                              {graphicalStyleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.graphicStyleHelp')}</span>
                            </label>
                          </div>

                          {/* Custom Image Instructions Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.imageInstructions')}</span>
                            </label>
                            <textarea
                              value={imageGenerationInstructions}
                              onChange={(e) => setImageGenerationInstructions(e.target.value)}
                              placeholder={t('placeholders.imageInstructions')}
                              className="textarea textarea-bordered h-24 w-full"
                              rows={4}
                              maxLength={1000}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {t('fields.imageInstructionsHelp')}
                                {imageGenerationInstructions.length > 0 && (
                                  <span className="ml-2 text-sm">({imageGenerationInstructions.length}/1000)</span>
                                )}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Details - Collapsible */}
                    <div className="collapse collapse-arrow bg-base-200 mb-6">
                      <input 
                        type="checkbox" 
                        checked={contentDetailsOpen}
                        onChange={(e) => setContentDetailsOpen(e.target.checked)}
                      />
                      <div className="collapse-title text-xl font-medium flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-primary mr-2">📝</span>
                          {t('sections.contentDetails')}
                        </div>
                        {hasContentDetailsData() && (
                          <span className="text-sm text-gray-600 font-normal truncate max-w-xs hidden md:inline">
                            {getContentDetailsPreview()}
                          </span>
                        )}
                      </div>
                      <div className="collapse-content">
                        <div className="space-y-6 pt-4">
                          {/* Story Outline Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.outline')}</span>
                            </label>
                            <textarea
                              value={plotDescription}
                              onChange={(e) => setPlotDescription(e.target.value)}
                              placeholder={t('placeholders.outlinePlaceholder')}
                              className="textarea textarea-bordered h-40 w-full"
                              rows={8}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.outlineHelp')}</span>
                            </label>
                          </div>

                          {/* Additional Requests Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">{t('fields.additional')}</span>
                            </label>
                            <textarea
                              value={additionalRequests}
                              onChange={(e) => setAdditionalRequests(e.target.value)}
                              placeholder={t('fields.additional')}
                              className="textarea textarea-bordered h-32 w-full"
                              rows={6}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">{t('fields.additionalHelp')}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Graphical Style Samples Modal */}
                {showStyleSamples && (
                  <div className="modal modal-open">
                    <div className="modal-box max-w-4xl h-3/4 max-h-screen">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{t('modal.title')}</h3>
                        <button 
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => setShowStyleSamples(false)}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="overflow-y-auto max-h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {getAllGraphicalStyles().map((style) => (
                            <div 
                              key={style}
                              className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => {
                                setGraphicalStyle(style);
                                setShowStyleSamples(false);
                              }}
                            >
                              <figure className="px-4 pt-4">
                                <Image
                                  src={`/images/GraphicTemplates/YoungAdults/${style}.jpg`}
                                  alt={t('modal.altText', { style: GraphicalStyleLabels[style] })}
                                  width={256}
                                  height={384}
                                  className="rounded-xl w-full h-96 object-contain"
                                  style={{ aspectRatio: '2/3' }}
                                  onError={(e) => {
                                    // Fallback for missing images
                                    e.currentTarget.src = '/images/placeholder-story-image.jpg';
                                  }}
                                />
                              </figure>
                              <div className="card-body items-center text-center p-4">
                                <h2 className="card-title text-base">
                                  {GraphicalStyleLabels[style]}
                                </h2>
                                {graphicalStyle === style && (
                                  <div className="badge badge-primary">{t('modal.selected')}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="modal-action">
                        <button 
                          className="btn"
                          onClick={() => setShowStyleSamples(false)}
                        >
                          {t('modal.close')}
                        </button>
                      </div>
                    </div>
                    <div 
                      className="modal-backdrop"
                      onClick={() => setShowStyleSamples(false)}
                    ></div>
                  </div>
                )}

                <StepNavigation
                  currentStep={4}
                  totalSteps={5}
                  nextHref={editStoryId ? `/tell-your-story/step-5?edit=${editStoryId}` : "/tell-your-story/step-5"}
                  prevHref={editStoryId ? `/tell-your-story/step-3?edit=${editStoryId}` : "/tell-your-story/step-3"}
                  onNext={handleNext}
                  nextDisabled={saving}
                  nextLabel={saving ? t('saving') : t('next')}
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
