'use client';

import { Show, RedirectToSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import StepNavigation from '@/components/StepNavigation';
import ProgressIndicator from '@/components/ProgressIndicator';
import WritingPersonaForm from '@/components/WritingPersonaForm';
import { trackStoryCreation } from '@/lib/analytics';
import { useStorySessionGuard } from '@/hooks/useStorySessionGuard';
import { fetchStoryData } from '@/lib/story';
import {
  TargetAudience,
  NovelStyle,
  GraphicalStyle,
  TargetAudienceLabels,
  NovelStyleLabels,
  GraphicalStyleLabels,
  getAllTargetAudiences,
  getAllNovelStyles,
  getAllGraphicalStyles,
  LiteraryPersona,
  LiteraryPersonaMetadata,
  getAllLiteraryPersonas,
} from '@/types/story-enums';
import type { StoryData } from '@/types/story';
import type { SavedWritingPersona, WritingPersonaSettings } from '@/types/writing-persona';

const DEFAULT_GRAPHIC_TEMPLATE_AUDIENCE = TargetAudience.CHILDREN_3_6;

const getGraphicTemplateImageSrc = (
  audience: TargetAudience | '',
  style: GraphicalStyle,
): string => {
  const audienceSegment = audience || DEFAULT_GRAPHIC_TEMPLATE_AUDIENCE;
  return `/images/GraphicTemplates/${audienceSegment}/${style}.jpg`;
};

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
  const params = useParams() as { locale?: string } | null;
  // useParams can be null during hydration; guard and provide a safe fallback
  const locale = params?.locale && typeof params.locale === 'string' ? params.locale : 'en-US';
  const defaultPersona = LiteraryPersona.CLASSIC_NOVELIST;
  const editStoryId = searchParams?.get('edit');
  const tStoryStepsStep4 = useTranslations('StorySteps.step4');
  const tWritingPersonas = useTranslations('WritingPersonas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStoryId = useStorySessionGuard(); // Form data
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>(
    TargetAudience.CHILDREN_3_6,
  );
  const [novelStyle, setNovelStyle] = useState<NovelStyle | ''>('');
  const [graphicalStyle, setGraphicalStyle] = useState<GraphicalStyle | ''>('');
  const [literaryPersona, setLiteraryPersona] = useState<LiteraryPersona | ''>(defaultPersona);
  const [customWritingPersona, setCustomWritingPersona] = useState<WritingPersonaSettings | null>(
    null,
  );
  const [customWritingPersonaLabel, setCustomWritingPersonaLabel] = useState<string | null>(null);
  const [savedWritingPersonas, setSavedWritingPersonas] = useState<SavedWritingPersona[]>([]);
  const [plotDescription, setPlotDescription] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');
  const [imageGenerationInstructions, setImageGenerationInstructions] = useState('');
  const [chapterCount, setChapterCount] = useState<number>(4); // Default matches CHILDREN_3_6
  const [isChapterCountManual, setIsChapterCountManual] = useState(false);
  const [storyLanguage, setStoryLanguage] = useState<string>(locale);

  // Accordion state
  const [styleSettingOpen, setStyleSettingOpen] = useState(false);
  const [contentDetailsOpen, setContentDetailsOpen] = useState(false);

  // Dropdown state
  const [showGraphicalStyleDropdown, setShowGraphicalStyleDropdown] = useState(false);
  const [showLiteraryPersonaDropdown, setShowLiteraryPersonaDropdown] = useState(false);
  const [showPersonaMetaInfo, setShowPersonaMetaInfo] = useState(false);
  const [showCustomPersonaModal, setShowCustomPersonaModal] = useState(false);

  // Language options from translation
  const languageOptions = tStoryStepsStep4.raw('languageOptions') as Array<{
    value: string;
    label: string;
  }>;
  const literaryPersonaMessages = tStoryStepsStep4.raw('literaryPersona') as
    | {
        label?: string;
        helper?: string;
        placeholder?: string;
        autoSelected?: string;
        sampleLabel?: string;
        metaLabels?: {
          pov?: string;
          tone?: string;
          rhythm?: string;
          vocabulary?: string;
        };
        metaInfo?: {
          title?: string;
          description?: string;
          trigger?: string;
          items?: Record<
            'pov' | 'tone' | 'rhythm' | 'vocabulary',
            {
              label?: string;
              description?: string;
            }
          >;
        };
        options?: Record<
          LiteraryPersona,
          {
            name?: string;
            description?: string;
            sample?: string;
          }
        >;
      }
    | undefined;

  const personaMetaLabels = {
    pov: literaryPersonaMessages?.metaLabels?.pov || 'POV',
    tone: literaryPersonaMessages?.metaLabels?.tone || 'Tone',
    rhythm: literaryPersonaMessages?.metaLabels?.rhythm || 'Rhythm',
    vocabulary: literaryPersonaMessages?.metaLabels?.vocabulary || 'Vocabulary',
  };
  const personaMetaInfo = literaryPersonaMessages?.metaInfo;
  const personaMetaInfoItems = ['pov', 'tone', 'rhythm', 'vocabulary'] as const;
  const defaultPersonaMetaInfoDescriptions: Record<(typeof personaMetaInfoItems)[number], string> =
    {
      pov: 'Narrator perspective. 1st = I, 2nd = you, 3rd-limited = one character view, 3rd-omniscient = everyone.',
      tone: 'Emotional energy. 1 is calm/neutral, 5 is high-intensity or dramatic.',
      rhythm: 'Sentence pace. 1 is slow and flowing, 5 is fast and punchy.',
      vocabulary:
        'Word complexity. 1 is simple everyday words, 5 is richer, more advanced language.',
    };
  const personaSampleLabel = literaryPersonaMessages?.sampleLabel || 'Sample';

  const preferredPersonaOrder: LiteraryPersona[] = [
    LiteraryPersona.CLASSIC_NOVELIST,
    LiteraryPersona.STORYTELLER,
    LiteraryPersona.ADVENTUROUS_NARRATOR,
    LiteraryPersona.WHIMSICAL_POET,
    LiteraryPersona.INSTITUTIONAL_CHRONICLER,
    LiteraryPersona.FUN_REPORTER,
    LiteraryPersona.FRIENDLY_EDUCATOR,
    LiteraryPersona.NOIR_INVESTIGATOR,
    LiteraryPersona.SCIFI_ANALYST,
    LiteraryPersona.PUB_BUDDY_NARRATOR,
  ];

  const orderedLiteraryPersonas = [
    ...preferredPersonaOrder,
    ...getAllLiteraryPersonas().filter((value) => !preferredPersonaOrder.includes(value)),
  ];

  const literaryPersonaOptions = orderedLiteraryPersonas.map((value) => ({
    value,
    name: literaryPersonaMessages?.options?.[value]?.name || value,
    description: literaryPersonaMessages?.options?.[value]?.description || '',
    sample: literaryPersonaMessages?.options?.[value]?.sample || '',
    metadata: LiteraryPersonaMetadata[value],
  }));

  const literaryPersonaOptionMap = Object.fromEntries(
    literaryPersonaOptions.map((option) => [option.value, option]),
  ) as Record<LiteraryPersona, (typeof literaryPersonaOptions)[number]>;

  const getSelectedPersonaName = () => {
    if (customWritingPersona) {
      return customWritingPersonaLabel || tWritingPersonas('story.oneBookName');
    }

    if (literaryPersona) {
      return literaryPersonaOptionMap[literaryPersona]?.name || literaryPersona;
    }

    return '';
  };

  const getSelectedPersonaDescription = () => {
    if (customWritingPersona) {
      return tWritingPersonas('story.customDescription');
    }

    if (literaryPersona && literaryPersonaOptionMap[literaryPersona]?.description) {
      return literaryPersonaOptionMap[literaryPersona].description;
    }

    return literaryPersonaMessages?.helper || '';
  };

  const getSavedPersonaSettings = (persona: SavedWritingPersona): WritingPersonaSettings => ({
    pov: persona.pov,
    tone: persona.tone,
    formality: persona.formality,
    rhythm: persona.rhythm,
    vocabulary: persona.vocabulary,
    fictionality: persona.fictionality,
    dialogueDensity: persona.dialogueDensity,
    sensoriality: persona.sensoriality,
    subtextIrony: persona.subtextIrony,
    techniques: persona.techniques,
    specialRequirements: persona.specialRequirements,
  });

  const selectSavedPersona = (persona: SavedWritingPersona) => {
    setCustomWritingPersona(getSavedPersonaSettings(persona));
    setCustomWritingPersonaLabel(persona.name);
    setLiteraryPersona('');
    setShowLiteraryPersonaDropdown(false);
  };

  const hasStyleSettingData = () => {
    return (
      place.trim() ||
      novelStyle ||
      graphicalStyle ||
      literaryPersona ||
      !!customWritingPersona ||
      imageGenerationInstructions.trim()
    );
  };

  const hasContentDetailsData = () => {
    return plotDescription.trim() || additionalRequests.trim();
  };

  const getStyleSettingPreview = () => {
    const parts = [];
    const personaName = getSelectedPersonaName();
    if (personaName) parts.push(personaName);
    if (novelStyle) parts.push(NovelStyleLabels[novelStyle]);
    if (graphicalStyle) parts.push(GraphicalStyleLabels[graphicalStyle]);
    if (place.trim()) parts.push(place.trim());
    if (imageGenerationInstructions.trim())
      parts.push(tStoryStepsStep4('previews.customImageInstructions'));
    return parts.join(', ');
  };

  const getContentDetailsPreview = () => {
    const parts = [];
    if (plotDescription.trim()) parts.push(tStoryStepsStep4('previews.storyOutlineProvided'));
    if (additionalRequests.trim())
      parts.push(tStoryStepsStep4('previews.additionalRequestsProvided'));
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
      [TargetAudience.ALL_AGES]: 6,
    };

    return chapterMap[audience] || 6;
  }, []);

  const targetAudienceOptions = [
    { value: '', label: tStoryStepsStep4('placeholders.selectAudience') },
    ...getAllTargetAudiences().map((value) => ({
      value,
      label: TargetAudienceLabels[value],
    })),
  ];

  const novelStyleOptions = [
    { value: '', label: tStoryStepsStep4('placeholders.selectNovelStyle') },
    ...getAllNovelStyles().map((value) => ({
      value,
      label: NovelStyleLabels[value],
    })),
  ];

  // Auto-update chapter count when target audience changes (unless manually overridden)
  useEffect(() => {
    if (!isChapterCountManual && targetAudience) {
      const newCount = getChapterCountForAudience(targetAudience);
      setChapterCount(newCount);
    }
  }, [targetAudience, isChapterCountManual, getChapterCountForAudience]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGraphicalStyleDropdown) setShowGraphicalStyleDropdown(false);
        if (showLiteraryPersonaDropdown) setShowLiteraryPersonaDropdown(false);
        if (showCustomPersonaModal) setShowCustomPersonaModal(false);
      }
    };

    if (showGraphicalStyleDropdown || showLiteraryPersonaDropdown || showCustomPersonaModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showGraphicalStyleDropdown, showLiteraryPersonaDropdown, showCustomPersonaModal]);

  useEffect(() => {
    const loadWritingPersonas = async () => {
      try {
        const response = await fetch('/api/writing-personas');
        if (!response.ok) return;

        const payload = (await response.json()) as { personas?: SavedWritingPersona[] };
        setSavedWritingPersonas(payload.personas || []);
      } catch (error) {
        console.error('Error loading writing personas:', error);
      }
    };

    loadWritingPersonas();
  }, []);

  const loadStoryData = useCallback(
    async (storyId: string) => {
      try {
        setLoading(true);
        setError(null);
        const story: StoryData = await fetchStoryData(storyId);
        setTitle(story.title || '');
        setPlace(story.place || '');
        setTargetAudience(story.targetAudience || '');
        setNovelStyle(story.novelStyle || '');
        setGraphicalStyle(story.graphicalStyle || '');
        setLiteraryPersona((story.literaryPersona as LiteraryPersona | null) || defaultPersona);
        setCustomWritingPersona(story.customWritingPersona || null);
        setCustomWritingPersonaLabel(null);
        setPlotDescription(story.plotDescription || '');
        setAdditionalRequests(story.additionalRequests || '');
        setImageGenerationInstructions(story.imageGenerationInstructions || '');

        // Set story language - prefer the one from the story, fallback to current locale
        setStoryLanguage(story.storyLanguage || locale); // Handle chapter count - only mark as manual if it differs from the expected automatic value
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
        setError(tStoryStepsStep4('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [getChapterCountForAudience, locale, tStoryStepsStep4, defaultPersona],
  );

  useEffect(() => {
    if (!currentStoryId) return;

    loadStoryData(currentStoryId);
  }, [currentStoryId, loadStoryData]);
  const handleNext = async () => {
    // Auto-save before navigating
    if (!title.trim()) {
      setError(tStoryStepsStep4('errors.titleRequired'));
      return;
    }

    if (!targetAudience) {
      setError(tStoryStepsStep4('errors.audienceRequired'));
      return;
    }

    if (!novelStyle) {
      setError(tStoryStepsStep4('errors.novelStyleRequired'));
      setStyleSettingOpen(true);
      return;
    }

    if (!graphicalStyle) {
      setError(tStoryStepsStep4('errors.graphicStyleRequired'));
      setStyleSettingOpen(true);
      return;
    }

    if (!currentStoryId) {
      setError(tStoryStepsStep4('errors.noStoryFound'));
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
          literaryPersona: customWritingPersona ? null : literaryPersona || defaultPersona,
          customWritingPersona,
          plotDescription: plotDescription.trim() || null,
          additionalRequests: additionalRequests.trim() || null,
          imageGenerationInstructions: imageGenerationInstructions.trim() || null,
          chapterCount: chapterCount,
          storyLanguage: storyLanguage,
        }),
      });
      if (!response.ok) {
        throw new Error(tStoryStepsStep4('errors.saveFailed'));
      }

      // Track step 4 completion and the step-5 handoff for funnel observability.
      trackStoryCreation.stepCompleted({
        step: 4,
        story_id: currentStoryId,
        title_provided: !!title.trim(),
        place_provided: !!place.trim(),
        target_audience: targetAudience || undefined,
        novel_style: novelStyle || undefined,
        graphical_style: graphicalStyle || undefined,
        literary_persona: customWritingPersona
          ? 'custom-writing-persona'
          : literaryPersona || defaultPersona,
        chapter_count: chapterCount,
        has_plot_description: !!plotDescription.trim(),
        has_additional_requests: !!additionalRequests.trim(),
        has_image_generation_instructions: !!imageGenerationInstructions.trim(),
        next_step: 5,
        cta_key: 'next',
      }); // Navigate to next step after successful save
      if (editStoryId) {
        // In edit mode, pass the edit parameter to the next step
        router.push(`/tell-your-story/step-5?edit=${editStoryId}`);
      } else {
        // Normal flow - navigate to step 5
        router.push('/tell-your-story/step-5');
      }
    } catch (error) {
      console.error('Error saving story:', error);
      setError(tStoryStepsStep4('errors.saveFailedTryAgain'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>

      <Show when="signed-in">
        <div className="container mx-auto px-2 sm:px-3 md:px-5 py-8">
          <div className="max-w-4xl mx-auto">
            <ProgressIndicator currentStep={4} totalSteps={5} />

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-3 sm:p-5">
                <h1 className="card-title text-3xl mb-6">{tStoryStepsStep4('heading')}</h1>

                {loading ? (
                  <div className="text-center py-12">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="text-lg text-gray-600 mt-4">{tStoryStepsStep4('saving')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="prose max-w-none mb-6">
                      <p className="text-gray-600">{tStoryStepsStep4('intro')}</p>
                    </div>

                    {error && (
                      <div className="alert alert-error">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Story Basics - Always Expanded */}
                    <div className="card bg-base-200 shadow-sm mb-6">
                      <div className="card-body">
                        <h2 className="card-title text-xl mb-4 flex items-center">
                          <span className="text-primary">📖</span>
                          {tStoryStepsStep4('sections.storyBasics')}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Title Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.title')} *
                              </span>
                            </label>
                            <input
                              type="text"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder={tStoryStepsStep4('fields.title')}
                              className="input input-bordered w-full"
                              required
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.titleHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Target Audience Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.audience')} *
                              </span>
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
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.audienceHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Book Size Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.bookSize')}
                              </span>
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
                                  {count}{' '}
                                  {count === 1
                                    ? tStoryStepsStep4('plurals.chapter')
                                    : tStoryStepsStep4('plurals.chapters')}
                                </option>
                              ))}
                            </select>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.bookSizeHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Story Language Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.storyLanguage')}
                              </span>
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
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('placeholders.storyLanguageHelp')}
                              </span>
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
                          {tStoryStepsStep4('sections.styleSetting')}
                          {!isSectionComplete('style') && (
                            <span className="badge badge-warning badge-sm ml-2">
                              {tStoryStepsStep4('sections.required')}
                            </span>
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
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.place')}
                              </span>
                            </label>
                            <textarea
                              value={place}
                              onChange={(e) => setPlace(e.target.value)}
                              placeholder={tStoryStepsStep4('fields.place')}
                              className="textarea textarea-bordered w-full"
                              rows={4}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.placeHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Literary Persona Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {literaryPersonaMessages?.label ||
                                  tStoryStepsStep4('fields.literaryPersona')}
                              </span>
                            </label>
                            <button
                              type="button"
                              className={`w-full text-left border border-base-300 rounded-lg bg-base-100 px-4 py-3 focus:outline-none focus-visible:ring focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                !literaryPersona && !customWritingPersona ? 'text-gray-500' : ''
                              }`}
                              onClick={() => setShowLiteraryPersonaDropdown(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setShowLiteraryPersonaDropdown(true);
                                }
                              }}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-semibold whitespace-normal leading-snug">
                                  {getSelectedPersonaName() ||
                                    literaryPersonaMessages?.placeholder ||
                                    tStoryStepsStep4('placeholders.selectLiteraryPersona')}
                                </span>
                                <span className="text-xs text-gray-600 whitespace-normal leading-snug">
                                  {getSelectedPersonaDescription()}
                                </span>
                              </div>
                            </button>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {literaryPersonaMessages?.helper || ''}
                              </span>
                            </label>
                          </div>

                          {/* Novel Style Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.novelStyle')} *
                              </span>
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
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.novelStyleHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Graphic Style Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.graphicStyle')} *
                              </span>
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                className={`select select-bordered w-full text-left ${!graphicalStyle ? 'text-gray-500' : ''}`}
                                onClick={() => setShowGraphicalStyleDropdown(true)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setShowGraphicalStyleDropdown(true);
                                  }
                                }}
                              >
                                {graphicalStyle
                                  ? GraphicalStyleLabels[graphicalStyle]
                                  : tStoryStepsStep4('placeholders.selectGraphicStyle')}
                                <svg
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.graphicStyleHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Custom Image Instructions Field */}
                          <div className="form-control md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.imageInstructions')}
                              </span>
                            </label>
                            <textarea
                              value={imageGenerationInstructions}
                              onChange={(e) => setImageGenerationInstructions(e.target.value)}
                              placeholder={tStoryStepsStep4('placeholders.imageInstructions')}
                              className="textarea textarea-bordered h-24 w-full"
                              rows={4}
                              maxLength={1000}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.imageInstructionsHelp')}
                                {imageGenerationInstructions.length > 0 && (
                                  <span className="ml-2 text-sm">
                                    ({imageGenerationInstructions.length}/1000)
                                  </span>
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
                          {tStoryStepsStep4('sections.contentDetails')}
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
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.outline')}
                              </span>
                            </label>
                            <textarea
                              value={plotDescription}
                              onChange={(e) => setPlotDescription(e.target.value)}
                              placeholder={tStoryStepsStep4('placeholders.outlinePlaceholder')}
                              className="textarea textarea-bordered h-40 w-full"
                              rows={8}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.outlineHelp')}
                              </span>
                            </label>
                          </div>

                          {/* Additional Requests Field */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-semibold">
                                {tStoryStepsStep4('fields.additional')}
                              </span>
                            </label>
                            <textarea
                              value={additionalRequests}
                              onChange={(e) => setAdditionalRequests(e.target.value)}
                              placeholder={tStoryStepsStep4('fields.additional')}
                              className="textarea textarea-bordered h-32 w-full"
                              rows={6}
                            />
                            <label className="label">
                              <span className="label-text-alt break-words max-w-full whitespace-normal">
                                {tStoryStepsStep4('fields.additionalHelp')}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Literary Persona Selector */}
                {showLiteraryPersonaDropdown && (
                  <div className="modal modal-open !fixed !inset-0 !z-[10000] p-0 sm:p-4">
                    <div className="modal-box flex h-[100dvh] max-h-[100dvh] w-full flex-col rounded-none px-4 sm:h-[90dvh] sm:max-h-[90dvh] sm:w-auto sm:max-w-4xl sm:rounded-box sm:px-6">
                      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
                        <h3 className="font-bold text-lg">
                          {literaryPersonaMessages?.label ||
                            tStoryStepsStep4('fields.literaryPersona')}
                        </h3>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => setShowLiteraryPersonaDropdown(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setShowLiteraryPersonaDropdown(false);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
                            {tWritingPersonas('story.builtInLabel')}
                          </h4>
                          <Link
                            href="/my-personas"
                            className="link link-primary text-sm"
                            onClick={() => setShowLiteraryPersonaDropdown(false)}
                          >
                            {tWritingPersonas('story.manageLink')}
                          </Link>
                        </div>
                        {literaryPersonaOptions.map((option) => (
                          <div
                            key={option.value}
                            className={`card bg-base-100 shadow-sm hover:shadow-lg transition-shadow cursor-pointer ${
                              !customWritingPersona && literaryPersona === option.value
                                ? 'border-2 border-primary'
                                : 'border border-transparent'
                            }`}
                            onClick={() => {
                              setLiteraryPersona(option.value);
                              setCustomWritingPersona(null);
                              setCustomWritingPersonaLabel(null);
                              setShowLiteraryPersonaDropdown(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setLiteraryPersona(option.value);
                                setCustomWritingPersona(null);
                                setCustomWritingPersonaLabel(null);
                                setShowLiteraryPersonaDropdown(false);
                              }
                            }}
                            tabIndex={0}
                          >
                            <div className="card-body p-4 gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-full">
                                  <h4 className="card-title text-base">{option.name}</h4>
                                  {option.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {option.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-700">
                                    <div className="flex flex-wrap gap-2 flex-1">
                                      <span className="badge badge-outline">
                                        {personaMetaLabels.pov}: {option.metadata.pov}
                                      </span>
                                      <span className="badge badge-outline">
                                        {personaMetaLabels.tone}: {option.metadata.tone}/5
                                      </span>
                                      <span className="badge badge-outline">
                                        {personaMetaLabels.rhythm}: {option.metadata.rhythm}/5
                                      </span>
                                      <span className="badge badge-outline">
                                        {personaMetaLabels.vocabulary}: {option.metadata.vocabulary}
                                        /5
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-xs btn-circle border border-base-300"
                                      aria-label={
                                        personaMetaInfo?.trigger ||
                                        'Learn what these attributes mean'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPersonaMetaInfo(true);
                                      }}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setShowPersonaMetaInfo(true);
                                        }
                                      }}
                                    >
                                      i
                                    </button>
                                  </div>
                                  {option.sample && (
                                    <div className="bg-base-200 rounded-md p-3 text-sm mt-3 whitespace-pre-wrap leading-relaxed">
                                      <div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                                        {personaSampleLabel}
                                      </div>
                                      <p className="mt-1">{option.sample}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {savedWritingPersonas.length > 0 && (
                          <>
                            <h4 className="pt-2 text-sm font-semibold uppercase tracking-wide text-base-content/60">
                              {tWritingPersonas('story.savedLabel')}
                            </h4>
                            {savedWritingPersonas.map((persona) => (
                              <div
                                key={persona.codename}
                                className={`card bg-base-100 shadow-sm hover:shadow-lg transition-shadow cursor-pointer ${
                                  customWritingPersonaLabel === persona.name
                                    ? 'border-2 border-primary'
                                    : 'border border-transparent'
                                }`}
                                onClick={() => selectSavedPersona(persona)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    selectSavedPersona(persona);
                                  }
                                }}
                                tabIndex={0}
                              >
                                <div className="card-body p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h4 className="card-title text-base">{persona.name}</h4>
                                      <p className="mt-1 text-sm text-gray-600">
                                        {tWritingPersonas('list.summary', {
                                          pov: tWritingPersonas(`form.pov.options.${persona.pov}`),
                                          tone: persona.tone,
                                          rhythm: persona.rhythm,
                                          vocabulary: persona.vocabulary,
                                        })}
                                      </p>
                                    </div>
                                    <span className="badge badge-primary badge-outline">
                                      {tWritingPersonas('story.savedBadge')}
                                    </span>
                                  </div>
                                  {persona.specialRequirements && (
                                    <p className="mt-3 rounded-md bg-base-200 p-3 text-sm text-base-content/70">
                                      {persona.specialRequirements}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        <button
                          type="button"
                          className={`w-full rounded-lg border border-dashed p-4 text-left transition hover:border-primary hover:bg-primary/5 ${
                            customWritingPersona && !customWritingPersonaLabel
                              ? 'border-primary bg-primary/5'
                              : 'border-base-300 bg-base-100'
                          }`}
                          onClick={() => {
                            setShowLiteraryPersonaDropdown(false);
                            setShowCustomPersonaModal(true);
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold">
                                {tWritingPersonas('story.createOneBook')}
                              </h4>
                              <p className="mt-1 text-sm text-base-content/70">
                                {tWritingPersonas('story.customDescription')}
                              </p>
                            </div>
                            <span className="badge badge-secondary badge-outline">
                              {tWritingPersonas('story.customBadge')}
                            </span>
                          </div>
                        </button>
                      </div>

                      <div className="modal-action flex-shrink-0">
                        <button
                          className="btn"
                          onClick={() => setShowLiteraryPersonaDropdown(false)}
                        >
                          {tStoryStepsStep4('modal.close')}
                        </button>
                      </div>
                    </div>
                    <div
                      className="modal-backdrop"
                      onClick={() => setShowLiteraryPersonaDropdown(false)}
                    ></div>
                  </div>
                )}

                {showCustomPersonaModal && (
                  <div className="modal modal-open">
                    <div className="modal-box w-[calc(100%-0.75rem)] sm:max-w-4xl sm:w-auto max-h-[90vh] overflow-y-auto px-4 sm:px-6">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-lg">
                            {tWritingPersonas('story.modalTitle')}
                          </h3>
                          <p className="mt-1 text-sm text-base-content/70">
                            {tWritingPersonas('story.modalDescription')}
                          </p>
                        </div>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => setShowCustomPersonaModal(false)}
                        >
                          ×
                        </button>
                      </div>
                      <WritingPersonaForm
                        initialSettings={customWritingPersona}
                        submitLabel={tWritingPersonas('story.useVoice')}
                        cancelLabel={tStoryStepsStep4('modal.close')}
                        onCancel={() => setShowCustomPersonaModal(false)}
                        onSubmit={({ settings }) => {
                          setCustomWritingPersona(settings);
                          setCustomWritingPersonaLabel(null);
                          setLiteraryPersona('');
                          setShowCustomPersonaModal(false);
                        }}
                      />
                    </div>
                    <div
                      className="modal-backdrop"
                      onClick={() => setShowCustomPersonaModal(false)}
                    ></div>
                  </div>
                )}

                {showPersonaMetaInfo && (
                  <div className="modal modal-open">
                    <div className="modal-box w-[calc(100%-0.75rem)] sm:max-w-2xl sm:w-auto px-4 sm:px-6">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className="font-bold text-lg">
                            {personaMetaInfo?.title || 'Narrator signals explained'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {personaMetaInfo?.description ||
                              'These quick badges show the narrator point of view, tone, rhythm, and vocabulary level so you can pick the voice that fits your story.'}
                          </p>
                        </div>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => setShowPersonaMetaInfo(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setShowPersonaMetaInfo(false);
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {personaMetaInfoItems.map((key) => {
                          const item = personaMetaInfo?.items?.[key];
                          const label = item?.label || personaMetaLabels[key];
                          const description =
                            item?.description || defaultPersonaMetaInfoDescriptions[key];

                          return (
                            <div key={key} className="rounded-lg bg-base-200 p-3">
                              <div className="font-semibold text-sm">{label}</div>
                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                {description}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="modal-action">
                        <button className="btn" onClick={() => setShowPersonaMetaInfo(false)}>
                          {tStoryStepsStep4('modal.close')}
                        </button>
                      </div>
                    </div>
                    <div
                      className="modal-backdrop"
                      onClick={() => setShowPersonaMetaInfo(false)}
                    ></div>
                  </div>
                )}

                {/* Graphical Style Custom Dropdown Gallery */}
                {showGraphicalStyleDropdown && (
                  <div className="modal modal-open !fixed !inset-0 !z-[10000] p-0 sm:p-4">
                    <div className="modal-box flex h-[100dvh] max-h-[100dvh] w-full flex-col rounded-none px-4 sm:h-[90dvh] sm:max-h-[90dvh] sm:w-auto sm:max-w-4xl sm:rounded-box sm:px-6">
                      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
                        <h3 className="font-bold text-lg">
                          {tStoryStepsStep4('fields.graphicStyle')}
                        </h3>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => setShowGraphicalStyleDropdown(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setShowGraphicalStyleDropdown(false);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {getAllGraphicalStyles().map((style) => (
                            <div
                              key={style}
                              className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => {
                                setGraphicalStyle(style);
                                setShowGraphicalStyleDropdown(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setGraphicalStyle(style);
                                  setShowGraphicalStyleDropdown(false);
                                }
                              }}
                              tabIndex={0}
                            >
                              <figure className="px-4 pt-4">
                                <Image
                                  src={getGraphicTemplateImageSrc(targetAudience, style)}
                                  alt={tStoryStepsStep4('modal.altText', {
                                    style: GraphicalStyleLabels[style],
                                  })}
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
                                  <div className="badge badge-primary">
                                    {tStoryStepsStep4('modal.selected')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="modal-action flex-shrink-0">
                        <button
                          className="btn"
                          onClick={() => setShowGraphicalStyleDropdown(false)}
                        >
                          {tStoryStepsStep4('modal.close')}
                        </button>
                      </div>
                    </div>
                    <div
                      className="modal-backdrop"
                      onClick={() => setShowGraphicalStyleDropdown(false)}
                    ></div>
                  </div>
                )}

                <StepNavigation
                  currentStep={4}
                  totalSteps={5}
                  nextHref={
                    editStoryId
                      ? `/tell-your-story/step-5?edit=${editStoryId}`
                      : '/tell-your-story/step-5'
                  }
                  prevHref={
                    editStoryId
                      ? `/tell-your-story/step-3?edit=${editStoryId}`
                      : '/tell-your-story/step-3'
                  }
                  onNext={handleNext}
                  nextDisabled={
                    saving || !title.trim() || !targetAudience || !novelStyle || !graphicalStyle
                  }
                  nextLabel={saving ? tStoryStepsStep4('saving') : tStoryStepsStep4('next')}
                />
                <p className="mt-3 text-right text-sm text-gray-600">
                  {tStoryStepsStep4('generationReviewHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
