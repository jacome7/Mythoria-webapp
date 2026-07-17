'use client';

import { Show, RedirectToSignIn, useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export default function Step2Page() {
  const { isSignedIn } = useAuth();
  const hasTrackedStepView = useRef(false);
  const router = useRouter();
  const tStoryStepsStep2 = useTranslations('StorySteps.step2');
  const tStoryStepsCommon = useTranslations('StorySteps.common');

  // Modal states
  const [activeModal, setActiveModal] = useState<ContentType | null>(null);

  // UI states
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Character states
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const {
    storyText,
    setStoryText,
    uploadedImages,
    setUploadedImages,
    uploadedAudio,
    setUploadedAudio,
    isSaving,
    saveToSession,
  } = useStep2Session();

  const { pollJob } = useJobPolling();
  const locale = useLocale();

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

  const handleNextStep = async () => {
    try {
      setIsCreatingStory(true);
      setShowLoadingModal(true);

      // Save current state one more time
      saveToSession();

      // Get the current authenticated user
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        throw new Error(tStoryStepsStep2('errors.failedGetUser'));
      }
      const userData = await userResponse.json();

      // Create a new story in the database
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Story',
          authorId: userData.authorId,
          plotDescription: storyText || null,
          status: 'temporary',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || tStoryStepsStep2('errors.failedCreate'));
      }

      const { story } = await response.json();
      localStorage.setItem('currentStoryId', story.storyId);

      // If user selected existing characters, immediately associate them with the story
      // so that step 3 can load them even if GenAI structuring is skipped.
      if (selectedCharacterIds.length > 0) {
        try {
          await Promise.all(
            selectedCharacterIds.map(async (characterId) => {
              try {
                await fetch(`/api/stories/${story.storyId}/characters`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ characterId }),
                });
              } catch (e) {
                console.warn('Failed to link character to story', characterId, e);
              }
            }),
          );
        } catch (e) {
          console.warn('One or more characters failed to link to story', e);
        }
      }

      // Images/audio were already uploaded + analysed in step 2; collect their
      // object paths and kick off ASYNC structuring, then poll to completion.
      const imageObjectPaths = uploadedImages
        .filter((img) => img.status === 'done' && img.objectPath)
        .map((img) => img.objectPath as string);
      const audioObjectPath =
        uploadedAudio?.status === 'done' ? uploadedAudio.objectPath : undefined;

      if (storyText.trim() || imageObjectPaths.length > 0 || audioObjectPath) {
        const genaiResponse = await fetch('/api/stories/genai-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: story.storyId,
            userDescription:
              storyText ||
              (imageObjectPaths.length > 0
                ? 'Analyze the images to create a story'
                : audioObjectPath
                  ? 'Analyze the audio to create a story'
                  : ''),
            imageObjectPaths,
            audioObjectPath,
            characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
            locale,
          }),
        });

        const startData = await genaiResponse.json();
        if (genaiResponse.ok && startData?.jobId) {
          // The structure job relocates staged inputs into {storyId}/inputs at
          // job start. Remember this so returning to Step 2 re-points the
          // restored inputs to their new location (the staging copies are gone).
          if (imageObjectPaths.length > 0 || audioObjectPath) {
            localStorage.setItem(
              'step2RelocatedInputs',
              JSON.stringify({
                storyId: story.storyId,
                paths: imageObjectPaths,
                audioPath: audioObjectPath ?? null,
              }),
            );
          }
          const outcome = await pollJob<{ story?: unknown; characters?: unknown }>(startData.jobId);
          if (outcome.status === 'completed' && outcome.result) {
            localStorage.setItem(
              'genaiResults',
              JSON.stringify({
                story: outcome.result.story,
                characters: outcome.result.characters,
                processed: true,
              }),
            );
          } else {
            console.error('Story structuring job failed:', outcome.error);
          }
        } else {
          console.error('Failed to start story structuring:', startData);
        }
      }

      // Track step 2 completion
      trackStoryCreation.stepCompleted({
        step: 2,
        story_id: story.storyId,
        content_type: uploadedImages.length > 0 ? 'image' : uploadedAudio ? 'audio' : 'text',
        has_text: !!storyText.trim(),
        has_image: uploadedImages.length > 0,
        has_audio: uploadedAudio !== null,
        processed_with_genai: !!(storyText.trim() || uploadedImages.length > 0 || uploadedAudio),
      });

      router.push('/tell-your-story/step-3');
    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage =
        error instanceof Error ? error.message : tStoryStepsStep2('errors.unknown');
      alert(tStoryStepsStep2('alerts.failedToCreateStory', { errorMessage }));
    } finally {
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <ProgressIndicator currentStep={2} totalSteps={6} />

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">{tStoryStepsStep2('heading')}</h1>
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-600 text-lg">{tStoryStepsStep2('intro')}</p>
                </div>

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

                <CharacterSelection onChange={setSelectedCharacterIds} />

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
                  totalSteps={7}
                  nextHref={null}
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={isCreatingStory || mediaBusy}
                  onNext={handleNextStep}
                  nextLabel={
                    isCreatingStory ? tStoryStepsStep2('processing') : tStoryStepsStep2('next')
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
