'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import StepNavigation from '@/components/StepNavigation';
import ProgressIndicator from '@/components/ProgressIndicator';
import { trackStoryCreation } from '@/lib/analytics';
import MediaCapture from './MediaCapture';
import CharacterSelection from './CharacterSelection';
import WritingTips from './WritingTips';
import { useStep2Session } from '@/hooks/useStep2Session';
import { useMediaUpload } from '@/hooks/useMediaUpload';

type ContentType = 'text' | 'images' | 'audio';

export default function Step2Page() {
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

  const { uploadMedia } = useMediaUpload();
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

      // Process with GenAI if any content provided
      if (storyText.trim() || uploadedImages.length > 0 || uploadedAudio) {
        console.log('Processing content with GenAI (signed uploads)...');

        let imageObjectPath: string | undefined;
        let audioObjectPath: string | undefined;
        let imageDataB64: string | undefined;
        let audioDataB64: string | undefined;

        if (uploadedImages.length > 0) {
          const { objectPath, dataUrl } = await uploadMedia(
            story.storyId,
            'image',
            uploadedImages[0].file,
          );
          imageObjectPath = objectPath;
          imageDataB64 = dataUrl;
        }

        if (uploadedAudio) {
          const { objectPath, dataUrl } = await uploadMedia(
            story.storyId,
            'audio',
            uploadedAudio.file,
          );
          audioObjectPath = objectPath;
          audioDataB64 = dataUrl;
        }

        // Send to GenAI for processing with object paths
        const genaiResponse = await fetch('/api/stories/genai-structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userDescription:
              storyText ||
              (imageObjectPath || imageDataB64
                ? 'Analyze the images to create a story'
                : audioObjectPath || audioDataB64
                  ? 'Analyze the audio to create a story'
                  : ''),
            // Prefer object paths; if not available, include base64 data
            imageObjectPath,
            audioObjectPath,
            imageData: imageDataB64,
            audioData: audioDataB64,
            storyId: story.storyId,
            characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
          }),
        });

        const responseData = await genaiResponse.json();

        if (genaiResponse.ok) {
          console.log('GenAI processing successful:', responseData);
          localStorage.setItem(
            'genaiResults',
            JSON.stringify({
              story: responseData.story,
              characters: responseData.characters,
              processed: true,
            }),
          );
        } else {
          console.error('GenAI processing failed:', responseData);
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
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
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

                {/* Progress Indicator - Removed */}

                {/* Action Buttons - Reduced height */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Write Button */}
                  <button
                    onClick={() => setActiveModal('text')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      storyText.trim() ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">✍️</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabWrite')}</span>
                    {storyText.trim() && (
                      <span className="badge badge-primary badge-sm">✓ Added</span>
                    )}
                  </button>

                  {/* Image Button */}
                  <button
                    onClick={() => setActiveModal('images')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      uploadedImages.length > 0 ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">📸</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabImage')}</span>
                    {uploadedImages.length > 0 && (
                      <span className="badge badge-primary badge-sm">
                        {uploadedImages.length}{' '}
                        {uploadedImages.length === 1
                          ? tStoryStepsStep2('badgeLabels.image')
                          : tStoryStepsStep2('badgeLabels.images')}
                      </span>
                    )}
                  </button>

                  {/* Audio Button */}
                  <button
                    onClick={() => setActiveModal('audio')}
                    className={`btn h-auto py-3 px-4 flex flex-col items-center gap-2 ${
                      uploadedAudio ? 'btn-outline btn-primary' : 'btn-outline'
                    }`}
                  >
                    <span className="text-2xl">🎤</span>
                    <span className="text-base font-semibold">{tStoryStepsStep2('tabRecord')}</span>
                    {uploadedAudio && (
                      <span className="badge badge-primary badge-sm">
                        {tStoryStepsStep2('badgeLabels.added')}
                      </span>
                    )}
                  </button>
                </div>

                <CharacterSelection onChange={setSelectedCharacterIds} />
                {/* Reassurance Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <p className="text-blue-800 text-sm mt-1">
                        {tStoryStepsStep2('reassurance')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-save indicator */}
                {isSaving && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    <span className="loading loading-spinner loading-xs"></span>{' '}
                    {tStoryStepsCommon('saving')}
                  </div>
                )}

                <StepNavigation
                  currentStep={2}
                  totalSteps={7}
                  nextHref={null}
                  prevHref="/tell-your-story/step-1"
                  nextDisabled={isCreatingStory}
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
        {activeModal === 'text' && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl w-11/12 h-[90vh] flex flex-col p-0">
              <div className="modal-header flex justify-between items-center p-6 pb-4 border-b">
                <h3 className="font-bold text-2xl">✍️ {tStoryStepsStep2('tabWrite')}</h3>
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
          </div>
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
            <div className="modal-box max-w-md">
              <div className="text-center space-y-6">
                <h3 className="font-bold text-xl">{tStoryStepsStep2('loadingModal.title')}</h3>

                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>

                <div className="space-y-3">
                  <p className="text-base">{tStoryStepsStep2('loadingModal.message')}</p>
                  <p className="text-sm font-medium text-primary">
                    {tStoryStepsStep2('loadingModal.pleaseWait')}
                  </p>
                </div>

                <div className="text-6xl animate-bounce">🍫</div>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
