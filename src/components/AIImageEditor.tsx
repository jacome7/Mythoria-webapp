'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiX, FiImage, FiAlertCircle, FiZap } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import CreditConfirmationModal from './CreditConfirmationModal';
import JobProgressModal from './JobProgressModal';
import { toAbsoluteImageUrl } from '../utils/image-url';
import { createImageEditJob } from '@/utils/async-job-api';

interface Story {
  storyId: string;
  title: string;
  coverUri?: string;
  backcoverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
}

interface AIImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
  imageData: {
    imageUri: string;
    imageType: 'cover' | 'backcover' | 'chapter';
    chapterNumber?: number;
    title?: string;
  };
  onImageEditSuccess: (updatedImageData: Record<string, unknown>) => void;
  onOptimisticUpdate?: (updatedImageData: Record<string, unknown>) => void;
  onRevertUpdate?: (originalImageData: Record<string, unknown>) => void;
}

export default function AIImageEditor({
  isOpen,
  onClose,
  story,
  imageData,
  onImageEditSuccess,
  onOptimisticUpdate, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRevertUpdate // eslint-disable-line @typescript-eslint/no-unused-vars
}: AIImageEditorProps) {
  const t = useTranslations('components.aiImageEditor');
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageGenerated, setNewImageGenerated] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  
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
  const [pendingImageEditData, setPendingImageEditData] = useState<{
    imageUrl: string;
    imageType: string;
    chapterNumber?: number;
    userRequest: string;
  } | null>(null);

  // Job progress state
  const [showJobProgress, setShowJobProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserRequest('');
      setError(null);
      setNewImageGenerated(null);
      setIsReplacing(false);
    }
  }, [isOpen]);

  // Check image edit credits
  const checkImageEditCredits = async () => {
    try {
      console.log('🔍 Checking image edit credits for storyId:', story.storyId);
      const response = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'imageEdit',
          storyId: story.storyId 
        })
      });
      
      console.log('📊 Image credit check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Image credit check successful:', data);
        setCreditInfo(data);
        return data;
      } else {
        const errorData = await response.json();
        console.error('❌ Image credit check failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error checking image credits:', error);
    }
    return null;
  };

  // Handle image edit
  const handleImageEdit = async () => {
    if (!userRequest.trim()) {
      setError(t('errors.describeChanges'));
      return;
    }

    // Check credits first
    const credits = await checkImageEditCredits();
    if (!credits) {
      setError(t('errors.unableToCheckCredits'));
      return;
    }

    if (!credits.canEdit) {
      setPendingImageEditData({
        imageUrl: imageData.imageUri,
        imageType: imageData.imageType,
        chapterNumber: imageData.chapterNumber,
        userRequest: userRequest.trim()
      });
      setShowCreditConfirmation(true);
      return;
    }

    await performImageEdit();
  };

  const performImageEdit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare job parameters
      const requestData = pendingImageEditData || {
        imageUrl: imageData.imageUri,
        imageType: imageData.imageType,
        chapterNumber: imageData.chapterNumber,
        userRequest: userRequest.trim()
      };

      const jobParams: {
        storyId: string;
        imageUrl: string;
        imageType: 'cover' | 'backcover' | 'chapter';
        userRequest: string;
        chapterNumber?: number;
        graphicalStyle?: string;
      } = {
        storyId: story.storyId,
        imageUrl: requestData.imageUrl,
        imageType: requestData.imageType as 'cover' | 'backcover' | 'chapter',
        userRequest: requestData.userRequest
      };

      // Add chapter number only if provided
      if (requestData.chapterNumber) {
        jobParams.chapterNumber = requestData.chapterNumber;
      }

      // Add graphical style if available
      if (story.graphicalStyle) {
        jobParams.graphicalStyle = story.graphicalStyle;
      }

      // Create async job
      const jobResponse = await createImageEditJob(jobParams);
      console.log('🚀 Image edit job created:', jobResponse);

      if (jobResponse.success && jobResponse.jobId) {
        // Show progress modal and start tracking
        setCurrentJobId(jobResponse.jobId);
        setShowJobProgress(true);
        setIsLoading(false);
        setPendingImageEditData(null);
      } else {
        throw new Error('Failed to create image edit job');
      }

    } catch (error) {
      console.error('Error creating image edit job:', error);
      setError(error instanceof Error ? error.message : t('errors.failedToGenerate'));
      setIsLoading(false);
      setPendingImageEditData(null);
    }
  };

  const handleJobComplete = (result: { newImageUrl?: string; [key: string]: unknown }) => {
    console.log('✅ Image edit job completed:', result);
    setShowJobProgress(false);
    setCurrentJobId(null);
    
    if (result && result.newImageUrl) {
      setNewImageGenerated(result.newImageUrl);
      setError(null);
    } else {
      setError('Job completed but no image was generated');
    }
  };

  const handleJobError = (error: string) => {
    console.error('❌ Image edit job failed:', error);
    setShowJobProgress(false);
    setCurrentJobId(null);
    setError(error || 'Image editing job failed');
  };

  const handleJobProgressClose = () => {
    // Only allow closing if job is completed or failed
    setShowJobProgress(false);
    setCurrentJobId(null);
  };

  const handleReplaceImage = async () => {
    if (!newImageGenerated) return;

    setIsReplacing(true);
    try {
      const response = await fetch('/api/image-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.storyId,
          imageType: imageData.imageType,
          newImageUrl: newImageGenerated,
          chapterNumber: imageData.chapterNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onImageEditSuccess(data);
        onClose();
      } else {
        setError(data.error || t('errors.failedToReplace'));
      }
    } catch (error) {
      console.error('Error replacing image:', error);
      setError(t('errors.failedToReplace'));
    } finally {
      setIsReplacing(false);
    }
  };

  const getImageTitle = () => {
    if (imageData.title) return imageData.title;
    
    switch (imageData.imageType) {
      case 'cover':
        return t('imageTypes.cover');
      case 'backcover':
        return t('imageTypes.backcover');
      case 'chapter':
        return t('imageTypes.chapter', { number: imageData.chapterNumber ?? 0 });
      default:
        return 'Image';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiImage className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('title', { imageType: getImageTitle() })}
              </h2>
              <p className="text-sm text-gray-600">
                {story.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Current Image */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('currentImage')}
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="relative mx-auto max-w-sm">
                  <Image
                    src={toAbsoluteImageUrl(imageData.imageUri) || ''}
                    alt={getImageTitle()}
                    width={400}
                    height={500}
                    className="w-full h-auto rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>

            {/* User Request */}
            <div className="space-y-3">
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder={t('requestPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
                maxLength={1000}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('characterCount', { count: userRequest.length, max: 1000 })}</span>
              </div>
            </div>

            {/* New Image Preview */}
            {newImageGenerated && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  New Generated Image
                </label>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="relative mx-auto max-w-sm">
                    <Image
                      src={toAbsoluteImageUrl(newImageGenerated) || ''}
                      alt="Generated Image"
                      width={400}
                      height={500}
                      className="w-full h-auto rounded-lg object-cover"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-green-600 mb-3">
                      New image generated successfully!
                    </p>
                    <button
                      onClick={handleReplaceImage}
                      disabled={isReplacing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto transition-colors"
                    >
                      {isReplacing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('loading')}</span>
                        </>
                      ) : (
                        <>
                          <FiImage className="w-4 h-4" />
                          <span>{t('replaceButton')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <FiAlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('cancelButton')}
              </button>
              {!newImageGenerated && (
                <button
                  onClick={handleImageEdit}
                  disabled={isLoading || !userRequest.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <FiZap className="w-4 h-4" />
                      <span>{t('generateButton')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Credit Confirmation Modal */}
      {showCreditConfirmation && creditInfo && (
        <CreditConfirmationModal
          isOpen={showCreditConfirmation}
          onClose={() => setShowCreditConfirmation(false)}
          onConfirm={performImageEdit}
          action="imageEdit"
          requiredCredits={creditInfo.requiredCredits}
          currentBalance={creditInfo.currentBalance}
          editCount={creditInfo.editCount}
          isFree={creditInfo.isFree}
        />
      )}

      {/* Job Progress Modal */}
      {showJobProgress && (
        <JobProgressModal
          isOpen={showJobProgress}
          onClose={handleJobProgressClose}
          jobId={currentJobId}
          jobType="image_edit"
          onComplete={handleJobComplete}
          onError={handleJobError}
        />
      )}
    </div>
  );
}
