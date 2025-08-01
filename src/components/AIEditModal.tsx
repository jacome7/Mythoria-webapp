'use client';

import { useState, useEffect } from 'react';
import { FiX, FiZap, FiEdit3, FiFileText, FiImage } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import ImageEditingTab from './ImageEditingTab';
import CreditConfirmationModal from './CreditConfirmationModal';
import EditCreditInfo from './EditCreditInfo';
import { StoryImage } from '@/utils/imageUtils';
import { chapterService } from '@/db/services';

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  onEditSuccess: (updatedHtml: string, autoSave?: boolean) => void;
}

interface Chapter {
  number: number;
  title: string;
}

type EditTab = 'text' | 'images';

export default function AIEditModal({ 
  isOpen, 
  onClose, 
  storyId, 
  onEditSuccess
}: AIEditModalProps) {
  const t = useTranslations('common.aiEditModal');
  const [activeTab, setActiveTab] = useState<EditTab>('text');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [storyImages, setStoryImages] = useState<StoryImage[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  
  // Credit confirmation state
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    nextThreshold: number;
    isFree: boolean;
  } | null>(null);
  const [pendingEditData, setPendingEditData] = useState<{
    userRequest: string;
    chapterNumber?: number;
  } | null>(null);
  
  // Credit info for display (before submission)
  const [textEditCreditInfo, setTextEditCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    message?: string;
    nextThreshold?: number;
    isFree?: boolean;
  } | null>(null);

  // Credit info for image editing
  const [imageEditCreditInfo, setImageEditCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    message?: string;
    nextThreshold?: number;
    isFree?: boolean;
  } | null>(null);

  // Load chapters from database
  useEffect(() => {
    const loadChapters = async () => {
      if (isOpen && storyId) {
        try {
          const tableOfContents = await chapterService.getChapterTableOfContents(storyId);
          const chaptersList = tableOfContents.map((chapter: { chapterNumber: number; title: string }) => ({
            number: chapter.chapterNumber,
            title: chapter.title || `Chapter ${chapter.chapterNumber}`
          }));
          
          console.log('Loaded chapters from database:', chaptersList);
          setChapters(chaptersList);
        } catch (error) {
          console.error('Error loading chapters:', error);
          setChapters([]);
        }
      }
    };

    if (isOpen) {
      loadChapters();
    }
  }, [isOpen, storyId]);

  // Load credit info for text editing when modal opens
  useEffect(() => {
    const loadTextEditCreditInfo = async () => {
      if (!isOpen || !storyId) {
        setTextEditCreditInfo(null);
        return;
      }

      try {
        const response = await fetch('/api/ai-edit/check-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'textEdit',
            storyId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setTextEditCreditInfo({
            canEdit: data.canEdit,
            requiredCredits: data.requiredCredits,
            currentBalance: data.currentBalance,
            editCount: data.editCount,
            message: data.message,
            nextThreshold: data.nextThreshold,
            isFree: data.isFree
          });
        }
      } catch (error) {
        console.error('Error loading text edit credit info:', error);
      }
    };

    loadTextEditCreditInfo();
  }, [isOpen, storyId]);

  // Load credit info for image editing when modal opens
  useEffect(() => {
    const loadImageEditCreditInfo = async () => {
      if (!isOpen || !storyId) {
        setImageEditCreditInfo(null);
        return;
      }

      try {
        const response = await fetch('/api/ai-edit/check-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'imageEdit',
            storyId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setImageEditCreditInfo({
            canEdit: data.canEdit,
            requiredCredits: data.requiredCredits,
            currentBalance: data.currentBalance,
            editCount: data.editCount,
            message: data.message,
            nextThreshold: data.nextThreshold,
            isFree: data.isFree
          });
        }
      } catch (error) {
        console.error('Error loading image edit credit info:', error);
      }
    };

    loadImageEditCreditInfo();
  }, [isOpen, storyId]);  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userRequest.trim()) {
      setError(t('errors.enterRequest'));
      return;
    }

    if (userRequest.length > 2000) {
      setError(t('errors.requestTooLong'));
      return;
    }

    // Check credit requirements before proceeding
    try {
      const creditCheckResponse = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'textEdit',
          storyId
        }),
      });

      const creditData = await creditCheckResponse.json();

      if (!creditCheckResponse.ok) {
        setError(creditData.error || t('errors.checkCreditsFailed'));
        return;
      }

      if (!creditData.canEdit) {
        setError(creditData.message || t('errors.insufficientCredits'));
        return;
      }

      // Store the edit data for later execution
      setPendingEditData({
        userRequest: userRequest.trim(),
        chapterNumber: selectedChapter || undefined
      });

      // Store credit info and show confirmation modal
      setCreditInfo({
        canEdit: creditData.canEdit,
        requiredCredits: creditData.requiredCredits,
        currentBalance: creditData.currentBalance,
        editCount: creditData.editCount,
        nextThreshold: creditData.nextThreshold,
        isFree: creditData.isFree
      });

      setShowCreditConfirmation(true);

    } catch (error) {
      console.error('Error checking credits:', error);
      setError(t('errors.checkCreditsFailedRetry'));
    }
  };

  const handleCreditConfirmation = async () => {
    if (!pendingEditData) return;

    setShowCreditConfirmation(false);
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: {
        storyId: string;
        userRequest: string;
        chapterNumber?: number;
      } = {
        storyId,
        userRequest: pendingEditData.userRequest
      };

      if (pendingEditData.chapterNumber) {
        requestBody.chapterNumber = pendingEditData.chapterNumber;
      }

      const response = await fetch('/api/story-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onEditSuccess(data.updatedHtml);
        onClose();
        setUserRequest('');
        setSelectedChapter(null);
        setPendingEditData(null);
        setCreditInfo(null);
      } else {
        setError(data.error || t('errors.editFailed'));
      }
    } catch (error) {
      console.error('Error editing story:', error);
      setError(t('errors.editFailed'));
    } finally {
      setIsLoading(false);
    }
  };
  const handleImageUpdated = (updatedImages: StoryImage[]) => {
    setStoryImages(updatedImages);
    console.log('Images updated in AIEditModal:', updatedImages);
  };

  const handleImageEditSuccess = async (originalUrl: string, newUrl: string) => {
    console.log('handleImageEditSuccess called:', { originalUrl, newUrl });
    
    try {
      setIsSavingImage(true);
      
      // Update the story images list to reflect the change
      setStoryImages(currentImages => 
        currentImages.map(img => 
          img.latestVersion.url === originalUrl 
            ? { 
                ...img, 
                latestVersion: { ...img.latestVersion, url: newUrl },
                versions: img.versions.map(v => 
                  v.url === originalUrl ? { ...v, url: newUrl } : v
                )
              } 
            : img
        )
      );
      
      console.log('Image successfully updated in the story');
      setIsSavingImage(false);
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error updating image:', error);
      setIsSavingImage(false);
      setError(t('errors.updateImageFailed'));
    }
  };

  const handleClose = () => {
    if (!isLoading && !isSavingImage) {
      onClose();
      setUserRequest('');
      setSelectedChapter(null);
      setActiveTab('text');
      setError(null);
      setIsSavingImage(false);
      setShowCreditConfirmation(false);
      setCreditInfo(null);
      setPendingEditData(null);
      setTextEditCreditInfo(null);
      setImageEditCreditInfo(null);
    }  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-20 rounded-lg">
              <FiZap className="w-5 h-5 text-primary" />
            </div>            <div>
              <h2 className="text-xl font-bold">{t('title')}</h2>
              <p className="text-sm text-base-content/70">
                {t('description')}
              </p>
            </div>
          </div>          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading || isSavingImage}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="tabs tabs-boxed mb-6 bg-base-200">
            <button
              className={`tab ${activeTab === 'text' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('text')}
              disabled={isLoading || isSavingImage}
            >
              <FiFileText className="w-4 h-4 mr-2" />
              {t('tabs.text')}
            </button>
            <button
              className={`tab ${activeTab === 'images' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('images')}
              disabled={isLoading || isSavingImage}
            >
              <FiImage className="w-4 h-4 mr-2" />
              {t('tabs.images')}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'text' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chapter Selection */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">{t('editSelection.label')}</span>
                </label>
                <select
                  value={selectedChapter === null ? 'full' : selectedChapter.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'full') {
                      setSelectedChapter(null);
                    } else {
                      setSelectedChapter(parseInt(value));
                    }
                  }}
                  className="select select-bordered w-full"
                  disabled={isLoading}
                >
                  <option value="full">{t('editSelection.entireStory')}</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.number} value={chapter.number.toString()}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Request */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    {t('editRequest.label')}
                  </span>
                  <span className="label-text-alt break-words max-w-full whitespace-normal">
                    {t('editRequest.charactersCount', { 
                      current: userRequest.length,
                      max: 2000
                    })}
                  </span>
                </label>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={t('editRequest.placeholder')}
                  className="textarea textarea-bordered w-full h-32 resize-none"
                  maxLength={2000}
                  disabled={isLoading}
                  required
                />              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Loading State */}              {isLoading && (
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="loading loading-spinner loading-sm"></span>
                    <div>
                      <p className="font-medium">{t('loadingState.title')}</p>
                      <p className="text-sm text-base-content/70">
                        {t('loadingState.description')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <progress className="progress progress-primary w-full"></progress>
                  </div>
                </div>
              )}

              {/* Credit Information */}
              {textEditCreditInfo && (
                <EditCreditInfo
                  canEdit={textEditCreditInfo.canEdit}
                  requiredCredits={textEditCreditInfo.requiredCredits}
                  currentBalance={textEditCreditInfo.currentBalance}
                  editCount={textEditCreditInfo.editCount}
                  message={textEditCreditInfo.message}
                  nextThreshold={textEditCreditInfo.nextThreshold}
                  isFree={textEditCreditInfo.isFree}
                  action="textEdit"
                />
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-base-300">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost flex-1"
                  disabled={isLoading}
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={isLoading || !userRequest.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      {t('buttons.processing')}
                    </>
                  ) : (
                    <>
                      <FiEdit3 className="w-4 h-4" />
                      {t('buttons.applyChanges')}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>              <ImageEditingTab
                storyId={storyId}
                storyImages={storyImages}
                onImageEditSuccess={handleImageEditSuccess}
                onImageUpdated={handleImageUpdated}
              />
              
              {/* Credit Information for Image Editing */}
              {imageEditCreditInfo && (
                <div className="mt-6">
                  <EditCreditInfo
                    canEdit={imageEditCreditInfo.canEdit}
                    requiredCredits={imageEditCreditInfo.requiredCredits}
                    currentBalance={imageEditCreditInfo.currentBalance}
                    editCount={imageEditCreditInfo.editCount}
                    message={imageEditCreditInfo.message}
                    nextThreshold={imageEditCreditInfo.nextThreshold}
                    isFree={imageEditCreditInfo.isFree}
                    action="imageEdit"
                  />
                </div>
              )}
              
              {/* Actions for Image Tab */}
              <div className="flex gap-3 pt-6 border-t border-base-300 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost flex-1"
                  disabled={isLoading || isSavingImage}
                >
                  {t('buttons.close')}
                </button>
              </div>
            </>          )}
        </div>
      </div>
      
      {/* Image Save Loading Modal */}
      {isSavingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-base-100 rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <div>
                <h3 className="text-lg font-semibold">{t('imageSave.title')}</h3>
                <p className="text-sm text-base-content/70 mt-2">
                  {t('imageSave.description')}
                </p>
              </div>
            </div>
          </div>
        </div>      )}
      
      {/* Credit Confirmation Modal */}
      {showCreditConfirmation && creditInfo && (
        <CreditConfirmationModal
          isOpen={showCreditConfirmation}
          onClose={() => {
            setShowCreditConfirmation(false);
            setPendingEditData(null);
            setCreditInfo(null);
          }}          onConfirm={handleCreditConfirmation}
          action="textEdit"
          requiredCredits={creditInfo.requiredCredits}
          currentBalance={creditInfo.currentBalance}
          editCount={creditInfo.editCount}
          isFree={creditInfo.isFree}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
