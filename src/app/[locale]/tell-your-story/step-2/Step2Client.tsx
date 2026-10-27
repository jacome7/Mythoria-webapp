'use client';

import { Show, RedirectToSignIn, useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import StepNavigation from '@/components/StepNavigation';
import ProgressIndicator from '@/components/ProgressIndicator';
import { trackStoryCreation } from '@/lib/analytics';
import MediaCapture from './MediaCapture';
import CharacterSelection from './CharacterSelection';
import WritingTips from './WritingTips';
import { useStep2Session } from '@/hooks/useStep2Session';
import { useJobPolling } from '@/hooks/useJobPolling';
import styles from './Step2Page.module.css';
import StoryTemplatePicker from '@/components/story-templates/StoryTemplatePicker';
import type { StoryTemplate } from '@/types/story-template';
import { useIntentContext } from '@/hooks/useIntentContext';
import { useStoryTemplateJourney } from '@/hooks/useStoryTemplateJourney';
import {
  canContinueTemplate,
  compileStoryBrief,
  createTemplateJourney,
} from '@/lib/story-templates/journey';
import { isValidIntent } from '@/constants/intents';
import { clearStorySession } from '@/lib/story-session';
import {
  originalAudioPath,
  readStep2Submission,
  saveStep2Submission,
  storyInputFingerprint,
  type Step2Submission,
} from '@/lib/story-templates/submission';

type ContentType = 'text' | 'images' | 'audio';

const modalSurfaceClass =
  'modal-box !bg-[#fff7e6] !bg-gradient-to-br !from-[#fff8e8] !to-[#f7deb8] border border-[#5e401a]/20 shadow-[0_18px_30px_rgba(74,48,14,0.13)]';

const stripMagicIcon = (value: string) => value.replace(/^\s*✨\s*/u, '').replace(/\s*✨\s*$/u, '');

interface StoryModeCardProps {
  title: string;
  description: string;
  imageSrc: string;
  imageClassName?: string;
  onClick: () => void;
  status?: ReactNode;
}

function StoryModeCard({
  title,
  description,
  imageSrc,
  imageClassName,
  onClick,
  status,
}: StoryModeCardProps) {
  return (
    <button type="button" onClick={onClick} className={styles.modeCard}>
      <span className={styles.modeIconWrap} aria-hidden="true">
        <Image
          src={imageSrc}
          alt=""
          width={180}
          height={150}
          className={`${styles.modeIcon} ${imageClassName ?? ''}`}
          sizes="(max-width: 640px) 32vw, 180px"
        />
      </span>
      <span className={styles.modeCopy}>
        <span className={styles.modeTitle}>{title}</span>
        <span className={styles.modeDescription}>{description}</span>
        {status && <span className={styles.modeStatus}>{status}</span>}
      </span>
      <span className={styles.modeArrow} aria-hidden="true">
        <Image src="/Papercut_icons/select_button.webp" alt="" width={76} height={76} />
      </span>
    </button>
  );
}

export default function Step2Client({
  templatesEnabled = false,
  templates = [],
}: {
  templatesEnabled?: boolean;
  templates?: StoryTemplate[];
}) {
  const { isSignedIn, userId } = useAuth();
  const hasTrackedStepView = useRef(false);
  const router = useRouter();
  const tStoryStepsStep2 = useTranslations('StorySteps.step2');
  const tStoryStepsCommon = useTranslations('StorySteps.common');
  const tTemplates = useTranslations('StoryTemplates');
  const searchParams = useSearchParams();
  const intentContext = useIntentContext();
  const templateState = useStoryTemplateJourney(userId);
  const journey = templatesEnabled ? templateState.journey : null;
  const entryApplied = useRef(false);
  const submitting = useRef(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const startTime = useRef(0);
  useEffect(() => {
    startTime.current = Date.now();
  }, []);
  const templatesForIntent = useMemo(() => {
    const currentIntent = searchParams.get('primaryIntent');
    const intent = isValidIntent(currentIntent) ? currentIntent : intentContext?.intent;
    // With no intent, show three different types of starting point.
    const varied = ['drawing-adventure', 'little-love', 'pet-mission'];
    return [...templates].sort((a, b) =>
      intent
        ? Number(b.intents.includes(intent)) - Number(a.intents.includes(intent))
        : (varied.includes(a.id) ? varied.indexOf(a.id) : 10) -
          (varied.includes(b.id) ? varied.indexOf(b.id) : 10),
    );
  }, [templates, searchParams, intentContext]);

  // Modal states
  const [activeModal, setActiveModal] = useState<ContentType | null>(null);

  // UI states
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Character states
  const {
    storyText,
    setStoryText,
    uploadedImages,
    setUploadedImages,
    uploadedAudio,
    setUploadedAudio,
    isSaving,
    saveToSession,
    selectedCharacterIds,
    setSelectedCharacterIds,
  } = useStep2Session();

  const { pollJob } = useJobPolling();
  const locale = useLocale();

  useEffect(() => {
    if (!templatesEnabled || !templateState.ready || entryApplied.current) return;
    entryApplied.current = true;
    const selected = templates.find((item) => item.id === searchParams.get('templateId'));
    if (selected && !templateState.journey) templateState.save(createTemplateJourney(selected));
  }, [templatesEnabled, templateState, templates, searchParams]);

  const hasMedia =
    uploadedImages.some((image) => image.status === 'done' && image.objectPath) ||
    !!(uploadedAudio?.status === 'done' && uploadedAudio.objectPath);
  const canContinue = canContinueTemplate(journey, storyText, hasMedia);
  const guideContribution = [
    storyText,
    ...uploadedImages
      .filter((image) => image.status === 'done' && image.metadata)
      .map(
        (image) =>
          `Image observations (not verified biography): ${image.metadata?.description ?? ''} ${image.metadata?.text ?? ''}`,
      ),
  ]
    .join('\n')
    .slice(0, 8000);

  useEffect(() => {
    if (!isSignedIn || hasTrackedStepView.current) return;
    hasTrackedStepView.current = true;
    trackStoryCreation.stepViewed({ step: 2 });
  }, [isSignedIn]);

  // Block navigation while any uploaded media is still uploading/analysing.
  const imagesAnalyzing = uploadedImages.some(
    (img) => img.status === 'uploading' || img.status === 'analyzing',
  );
  const audioUploading = uploadedAudio?.status === 'uploading';
  const mediaBusy = imagesAnalyzing || audioUploading;

  const storyModeCards = [
    {
      type: 'text' as const,
      title: tStoryStepsStep2('tabWrite'),
      description: tStoryStepsStep2('modeCards.writeDescription'),
      imageSrc: '/Papercut_icons/Pencil.webp',
      imageClassName: styles.pencilIcon,
      status: storyText.trim() ? tStoryStepsStep2('badgeLabels.added') : null,
    },
    {
      type: 'images' as const,
      title: tStoryStepsStep2('tabImage'),
      description: tStoryStepsStep2('modeCards.imageDescription'),
      imageSrc: '/Papercut_icons/camera.webp',
      imageClassName: styles.cameraIcon,
      status:
        uploadedImages.length > 0
          ? `${uploadedImages.length} ${
              uploadedImages.length === 1
                ? tStoryStepsStep2('badgeLabels.image')
                : tStoryStepsStep2('badgeLabels.images')
            }`
          : null,
    },
    {
      type: 'audio' as const,
      title: tStoryStepsStep2('tabRecord'),
      description: tStoryStepsStep2('modeCards.recordDescription'),
      imageSrc: '/Papercut_icons/microphone.webp',
      imageClassName: styles.microphoneIcon,
      status: uploadedAudio ? tStoryStepsStep2('badgeLabels.added') : null,
    },
  ];

  const handleNextStep = async (confirmed = false) => {
    if (submitting.current || !canContinue) return;
    submitting.current = true;
    setSubmissionError(null);
    try {
      saveToSession();
      const brief = compileStoryBrief(journey, storyText);
      const imageObjectPaths = uploadedImages
        .filter((img) => img.status === 'done' && img.objectPath)
        .map((img) => img.objectPath!);
      const audioObjectPath =
        uploadedAudio?.status === 'done' ? uploadedAudio.objectPath : undefined;
      const fingerprint = await storyInputFingerprint({
        brief,
        imageIds: uploadedImages.filter((img) => img.status === 'done').map((img) => img.id),
        audio: originalAudioPath(audioObjectPath),
        characters: [...selectedCharacterIds].sort(),
        locale,
        preferences: journey?.preferences,
      });
      let saved = userId ? readStep2Submission(userId, templatesEnabled) : null;
      // Finish or observe the previous request before submitting changed input. A lost
      // POST response is retried with the exact saved payload and durable request ID.
      if (
        saved &&
        !saved.completed &&
        saved.fingerprint !== fingerprint &&
        (saved.jobId || saved.structurePayload)
      ) {
        setIsCreatingStory(true);
        setShowLoadingModal(true);
        if (!saved.jobId && saved.structurePayload) {
          const pendingResponse = await fetch('/api/stories/genai-structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: saved.structurePayload,
          });
          const pendingResult = await pendingResponse.json();
          if (!pendingResponse.ok || !pendingResult.jobId)
            throw new Error(tTemplates('structureError'));
          saved = { ...saved, jobId: pendingResult.jobId };
          saveStep2Submission(saved, templatesEnabled);
        }
        const previous = await pollJob(saved.jobId!);
        if (previous.status !== 'completed' && previous.error?.includes('Timed out'))
          throw new Error(tTemplates('structureError'));
        // Even a failed outline can have saved some details. Ask before replacing them.
        saved = { ...saved, completed: true };
        saveStep2Submission(saved, templatesEnabled);
      }
      if (saved?.completed && saved.fingerprint !== fingerprint && !confirmed) {
        setConfirmRebuild(true);
        return;
      }
      setConfirmRebuild(false);
      setIsCreatingStory(true);
      setShowLoadingModal(true);
      if (saved?.completed && saved.fingerprint === fingerprint) {
        localStorage.setItem('currentStoryId', saved.storyId);
        router.push('/tell-your-story/step-3');
        return;
      }

      // Persist the id before the request: retrying a lost response cannot create another draft.
      if (!saved && templatesEnabled && userId) {
        saved = { owner: userId, storyId: crypto.randomUUID(), fingerprint, completed: false };
        saveStep2Submission(saved, templatesEnabled);
      }
      let storyId = saved?.storyId;
      if (templatesEnabled && saved) {
        const response = await fetch('/api/story-guide/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: saved.storyId,
            title: templates.find((item) => item.id === journey?.templateId)?.title ?? 'My Story',
            plotDescription: brief,
            storyLanguage: locale,
          }),
        });
        if (!response.ok) throw new Error(tTemplates('structureError'));
      } else if (!storyId) {
        const response = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'My Story',
            plotDescription: brief || null,
            storyLanguage: locale,
            status: 'temporary',
          }),
        });
        if (!response.ok) throw new Error(tStoryStepsStep2('errors.failedCreate'));
        const data = await response.json();
        storyId = data.story.storyId;
        if (userId && storyId) {
          saved = { owner: userId, storyId, fingerprint, completed: false };
          saveStep2Submission(saved, templatesEnabled);
        }
      }
      if (!storyId || !saved) throw new Error(tTemplates('structureError'));
      localStorage.setItem('currentStoryId', storyId);
      let submission: Step2Submission =
        saved.fingerprint === fingerprint
          ? saved
          : {
              ...saved,
              fingerprint,
              completed: false,
              jobId: undefined,
              structureRequestId: undefined,
              structurePayload: undefined,
            };
      saveStep2Submission(submission, templatesEnabled);
      for (const characterId of selectedCharacterIds) {
        const linked = await fetch(`/api/stories/${storyId}/characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId }),
        });
        if (!linked.ok) throw new Error(tTemplates('structureError'));
      }
      if (brief.trim() || imageObjectPaths.length || audioObjectPath) {
        if (!submission.jobId) {
          if (!submission.structurePayload) {
            const structureRequestId = templatesEnabled ? crypto.randomUUID() : undefined;
            submission = {
              ...submission,
              structureRequestId,
              structurePayload: JSON.stringify({
                storyId,
                userDescription:
                  brief ||
                  (imageObjectPaths.length
                    ? 'Analyze the images to create a story'
                    : 'Analyze the audio to create a story'),
                imageObjectPaths,
                audioObjectPath,
                characterIds: selectedCharacterIds.length ? selectedCharacterIds : undefined,
                locale,
                storyPreferences: journey?.preferences,
                factuality: journey?.mode === 'memory' ? 'memory' : undefined,
                structureRequestId,
              }),
            };
            saveStep2Submission(submission, templatesEnabled);
          }
          const response = await fetch('/api/stories/genai-structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: submission.structurePayload,
          });
          const data = await response.json();
          if (!response.ok || !data.jobId) throw new Error(tTemplates('structureError'));
          submission = { ...submission, jobId: data.jobId };
          saveStep2Submission(submission, templatesEnabled);
          if (imageObjectPaths.length || audioObjectPath)
            localStorage.setItem(
              'step2RelocatedInputs',
              JSON.stringify({
                storyId,
                paths: imageObjectPaths,
                audioPath: audioObjectPath ?? null,
              }),
            );
        }
        const outcome = await pollJob<{ story?: unknown; characters?: unknown }>(submission.jobId!);
        if (outcome.status !== 'completed') {
          // Keep a pending job id on a polling timeout so retries resume it, rather than launch duplicate work.
          if (!outcome.error?.includes('Timed out'))
            saveStep2Submission(
              {
                ...submission,
                jobId: undefined,
                structureRequestId: undefined,
                structurePayload: undefined,
              },
              templatesEnabled,
            );
          throw new Error(tTemplates('structureError'));
        }
        localStorage.setItem(
          'genaiResults',
          JSON.stringify({ ...outcome.result, processed: true }),
        );
      }
      saveStep2Submission({ ...submission, completed: true }, templatesEnabled);
      trackStoryCreation.stepCompleted({
        step: 2,
        story_id: storyId,
        content_type: journey?.templateId
          ? 'template'
          : uploadedImages.length
            ? 'image'
            : uploadedAudio
              ? 'audio'
              : 'text',
        has_text: !!brief.trim(),
        has_image: imageObjectPaths.length > 0,
        has_audio: !!audioObjectPath,
        template_id: journey?.templateId ?? undefined,
        question_depth: journey?.answers.length ?? 0,
        time_to_continue_ms: Date.now() - startTime.current,
        processed_with_genai: !!(brief.trim() || imageObjectPaths.length || audioObjectPath),
      });
      router.push('/tell-your-story/step-3');
    } catch {
      setSubmissionError(tTemplates('structureError'));
    } finally {
      submitting.current = false;
      setIsCreatingStory(false);
      setShowLoadingModal(false);
    }
  };

  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>

      <Show when="signed-in">
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <ProgressIndicator currentStep={2} totalSteps={5} />

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">{tStoryStepsStep2('heading')}</h1>
                {!templatesEnabled && (
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-600 text-lg">{tStoryStepsStep2('intro')}</p>
                  </div>
                )}

                {templatesEnabled && (
                  <>
                    {(journey || storyText || hasMedia) && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={isCreatingStory || mediaBusy}
                          onClick={() => setConfirmReset(true)}
                        >
                          {tTemplates('newStory')}
                        </button>
                      </div>
                    )}
                    {confirmReset && (
                      <div className="rounded-xl border border-base-300 p-4 space-y-3" role="alert">
                        <p>{tTemplates('resetDescription')}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              clearStorySession();
                              templateState.save(null);
                              setStoryText('');
                              setUploadedImages([]);
                              setUploadedAudio(null);
                              setSelectedCharacterIds([]);
                              setShowExtraDetails(false);
                              setConfirmReset(false);
                              setConfirmRebuild(false);
                              setSubmissionError(null);
                              router.push('/tell-your-story/step-1');
                            }}
                          >
                            {tTemplates('confirmReset')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setConfirmReset(false)}
                          >
                            {tTemplates('cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                    {journey && (
                      <div className="sticky top-0 z-10 flex justify-end rounded-xl bg-base-100/95 p-2 shadow-sm">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!canContinue || isCreatingStory || mediaBusy}
                          onClick={() => void handleNextStep()}
                        >
                          {tTemplates('continue')}
                        </button>
                      </div>
                    )}
                    <StoryTemplatePicker
                      templates={templatesForIntent}
                      journey={journey}
                      onChange={templateState.save}
                      incomingTemplateId={searchParams.get('templateId')}
                      contribution={guideContribution}
                      disabled={isCreatingStory || !templateState.ready}
                      onFreeform={() => {
                        templateState.save(
                          journey
                            ? { ...journey, templateId: null, question: null }
                            : createTemplateJourney(),
                        );
                        setShowExtraDetails(true);
                      }}
                    />
                    {journey && (
                      <div className="space-y-4">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          aria-expanded={
                            showExtraDetails || journey.mode === 'memory' || !journey.templateId
                          }
                          onClick={() => setShowExtraDetails(!showExtraDetails)}
                        >
                          {tTemplates('addDetails')}
                        </button>
                        {(showExtraDetails || journey.mode === 'memory' || !journey.templateId) && (
                          <>
                            <label className="block">
                              <span className="block font-semibold mb-2">
                                {journey.mode === 'memory'
                                  ? tTemplates('memoryContributionLabel')
                                  : tTemplates('addDetails')}
                              </span>
                              <textarea
                                className="textarea textarea-bordered w-full min-h-24 text-base"
                                maxLength={8000}
                                value={storyText}
                                onChange={(e) => setStoryText(e.target.value)}
                                placeholder={tTemplates('memoryContributionPlaceholder')}
                              />
                            </label>
                            <p className="text-sm text-base-content/70">
                              {tTemplates('contributionHelp')}
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {storyModeCards
                                .filter((card) => card.type !== 'text')
                                .map((card) => (
                                  <button
                                    type="button"
                                    key={card.type}
                                    className="btn btn-outline"
                                    onClick={() => setActiveModal(card.type)}
                                  >
                                    {card.title}
                                    {card.status && (
                                      <span className="badge badge-sm">{card.status}</span>
                                    )}
                                  </button>
                                ))}
                            </div>
                            <CharacterSelection
                              initialSelectedIds={selectedCharacterIds}
                              onChange={setSelectedCharacterIds}
                            />
                          </>
                        )}
                        {journey.mode === 'memory' && !canContinue && (
                          <p role="status" className="text-sm">
                            {tTemplates('memoryContributionRequired')}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!templatesEnabled && (
                  <div className={styles.modeStack}>
                    {storyModeCards.map((card) => (
                      <StoryModeCard
                        key={card.type}
                        title={card.title}
                        description={card.description}
                        imageSrc={card.imageSrc}
                        imageClassName={card.imageClassName}
                        status={card.status}
                        onClick={() => setActiveModal(card.type)}
                      />
                    ))}
                  </div>
                )}

                {!templatesEnabled && (
                  <CharacterSelection
                    initialSelectedIds={selectedCharacterIds}
                    onChange={setSelectedCharacterIds}
                  />
                )}

                {submissionError && (
                  <p role="alert" className="alert alert-error">
                    {submissionError}
                  </p>
                )}
                {confirmRebuild && (
                  <section
                    role="region"
                    aria-label={tTemplates('restructureTitle')}
                    className="rounded-xl border border-primary/30 p-4 space-y-3"
                  >
                    <h2 className="font-bold">{tTemplates('restructureTitle')}</h2>
                    <p>{tTemplates('restructureDescription')}</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleNextStep(true)}
                      >
                        {tTemplates('confirmRestructure')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmRebuild(false)}
                      >
                        {tTemplates('cancel')}
                      </button>
                    </div>
                  </section>
                )}

                {/* Auto-save indicator */}
                {isSaving && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    <span className="loading loading-spinner loading-xs"></span>{' '}
                    {tStoryStepsCommon('saving')}
                  </div>
                )}

                {mediaBusy && (
                  <div className="text-center text-sm text-warning mt-2">
                    {tStoryStepsStep2('imageAnalysis.waitingHint')}
                  </div>
                )}

                <StepNavigation
                  currentStep={2}
                  totalSteps={5}
                  nextHref={null}
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={
                    isCreatingStory || mediaBusy || !canContinue || (templatesEnabled && !journey)
                  }
                  onPrev={saveToSession}
                  onNext={() => handleNextStep()}
                  nextLabel={
                    isCreatingStory
                      ? tStoryStepsStep2('processing')
                      : templatesEnabled
                        ? tTemplates('continue')
                        : tStoryStepsStep2('next')
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Modal - Improved with better text area */}
        {activeModal === 'text' &&
          createPortal(
            <div className={`modal modal-open ${styles.step2Modal}`}>
              <div
                className={`${modalSurfaceClass} ${styles.step2ModalBox} max-w-5xl w-11/12 flex flex-col p-0`}
              >
                <div className="modal-header flex justify-between items-center p-6 pb-4 border-b">
                  <h3 className={styles.modalTitle}>
                    <Image
                      src="/Papercut_icons/Pencil.webp"
                      alt=""
                      width={64}
                      height={64}
                      className={`${styles.modalTitleIcon} ${styles.pencilIcon}`}
                    />
                    {tStoryStepsStep2('tabWrite')}
                  </h3>
                  <button
                    className="btn btn-sm btn-circle btn-ghost"
                    onClick={() => setActiveModal(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col px-6 py-4">
                    {/* Enhanced text area with better scrolling */}
                    <div className="flex-1 relative rounded-lg border border-base-300 overflow-hidden">
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                        .enhanced-textarea {
                          /* Firefox scrollbar */
                          scrollbar-width: thick;
                          scrollbar-color: rgba(59, 130, 246, 0.6) rgba(156, 163, 175, 0.2);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar {
                          width: 16px;
                          height: 16px;
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-track {
                          background: rgba(156, 163, 175, 0.2);
                          border-radius: 8px;
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb {
                          background: rgba(59, 130, 246, 0.6);
                          border-radius: 8px;
                          border: 2px solid rgba(156, 163, 175, 0.2);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb:hover {
                          background: rgba(59, 130, 246, 0.8);
                        }
                        
                        .enhanced-textarea::-webkit-scrollbar-thumb:active {
                          background: rgba(59, 130, 246, 1);
                        }
                        
                        /* Mobile optimizations */
                        @media (max-width: 768px) {
                          .enhanced-textarea::-webkit-scrollbar {
                            width: 20px;
                            height: 20px;
                          }
                          
                          .enhanced-textarea::-webkit-scrollbar-thumb {
                            border: 3px solid rgba(156, 163, 175, 0.2);
                            border-radius: 10px;
                          }
                        }
                        
                        /* Touch devices - even larger scrollbar */
                        @media (hover: none) and (pointer: coarse) {
                          .enhanced-textarea::-webkit-scrollbar {
                            width: 24px;
                            height: 24px;
                          }
                          
                          .enhanced-textarea::-webkit-scrollbar-thumb {
                            border: 4px solid rgba(156, 163, 175, 0.2);
                            border-radius: 12px;
                          }
                        }
                      `,
                        }}
                      />
                      <textarea
                        className="enhanced-textarea w-full h-full p-4 resize-none text-base leading-relaxed border-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                        placeholder={tStoryStepsStep2('textPlaceholder')}
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                      />
                    </div>

                    <label className="label px-0 pt-2">
                      <span className="label-text-alt break-words max-w-full whitespace-normal">
                        {tStoryStepsStep2('textHelp')}
                      </span>
                    </label>
                  </div>

                  {/* Writing Tips */}
                  <div className="px-6 pb-4">
                    <WritingTips />
                  </div>
                </div>

                <div className="modal-action p-6 pt-4 border-t">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setActiveModal(null);
                      saveToSession();
                    }}
                  >
                    {tStoryStepsStep2('actions.done')}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <MediaCapture
          activeModal={activeModal === 'images' || activeModal === 'audio' ? activeModal : null}
          setActiveModal={setActiveModal}
          uploadedImages={uploadedImages}
          setUploadedImages={setUploadedImages}
          uploadedAudio={uploadedAudio}
          setUploadedAudio={setUploadedAudio}
          saveToSession={saveToSession}
        />

        {/* Loading Modal */}
        {showLoadingModal && (
          <div className="modal modal-open">
            <div className={`${modalSurfaceClass} max-w-md`}>
              <div className="text-center space-y-6">
                <h3 className="font-bold text-xl flex items-center justify-center gap-2">
                  <Image
                    src="/Papercut_icons/fa-magic-papercut.webp"
                    alt=""
                    width={28}
                    height={28}
                    aria-hidden="true"
                  />
                  {stripMagicIcon(tStoryStepsStep2('loadingModal.title'))}
                </h3>

                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>

                <div className="space-y-3">
                  <p className="text-base">{tStoryStepsStep2('loadingModal.message')}</p>
                  <p className="text-sm font-medium text-primary flex items-center justify-center gap-1">
                    {stripMagicIcon(tStoryStepsStep2('loadingModal.pleaseWait'))}
                    <Image
                      src="/Papercut_icons/fa-magic-papercut.webp"
                      alt=""
                      width={18}
                      height={18}
                      aria-hidden="true"
                    />
                  </p>
                </div>

                <Image
                  src="/Papercut_icons/gi-chocolate-bar-papercut.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto animate-bounce"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        )}
      </Show>
    </>
  );
}
