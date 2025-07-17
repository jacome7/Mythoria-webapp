'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiX, FiZap, FiEdit3, FiAlertCircle } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import CreditConfirmationModal from './CreditConfirmationModal';
import JobProgressModal from './JobProgressModal';
import { createTextEditJob } from '@/utils/async-job-api';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
}

interface Story {
  storyId: string;
  title: string;
  coverUri?: string;
  backcoverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
}

interface AITextStoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
  chapters: Chapter[];
  currentChapter?: Chapter; // If editing from chapter page
  onEditSuccess: (updatedData: Record<string, unknown>) => void;
  onOptimisticUpdate?: (updatedData: Record<string, unknown>) => void;
  onRevertUpdate?: (originalData: Record<string, unknown>) => void;
}

type EditScope = 'chapter' | 'story';

export default function AITextStoryEditor({ 
  isOpen, 
  onClose, 
  story,
  chapters,
  currentChapter,
  onEditSuccess,
  onOptimisticUpdate, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRevertUpdate // eslint-disable-line @typescript-eslint/no-unused-vars
}: AITextStoryEditorProps) {
  const t = useTranslations('components.aiTextStoryEditor');
  const [editScope, setEditScope] = useState<EditScope>(currentChapter ? 'chapter' : 'story');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(
    currentChapter ? currentChapter.chapterNumber : null
  );
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Credit confirmation state
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    nextThreshold: number;
    isFree: boolean;
    // Full story edit specific fields
    chapterCount?: number;
    totalCredits?: number;
    freeEdits?: number;
    paidEdits?: number;
    message?: string;
  } | null>(null);

  // Job progress state
  const [showJobProgress, setShowJobProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Check edit credits
  const checkEditCredits = useCallback(async () => {
    try {
      console.log('🔍 Checking edit credits for storyId:', story.storyId, 'scope:', editScope);
      
      // Use different endpoints based on edit scope
      const endpoint = editScope === 'story' 
        ? '/api/ai-edit/check-full-story-credits'
        : '/api/ai-edit/check-credits';
      
      const requestBody = editScope === 'story'
        ? { storyId: story.storyId }
        : { action: 'textEdit', storyId: story.storyId };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📊 Credit check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Credit check successful:', data);
        
        // Normalize the response format
        const normalizedData = editScope === 'story' ? {
          canEdit: data.canEdit,
          requiredCredits: data.totalCredits,
          currentBalance: data.currentBalance,
          editCount: 0, // Not relevant for full story
          nextThreshold: 0, // Not relevant for full story
          isFree: data.totalCredits === 0,
          chapterCount: data.chapterCount,
          totalCredits: data.totalCredits,
          freeEdits: data.freeEdits,
          paidEdits: data.paidEdits,
          message: data.message
        } : {
          canEdit: data.canEdit,
          requiredCredits: data.requiredCredits,
          currentBalance: data.currentBalance,
          editCount: data.editCount,
          nextThreshold: data.nextThreshold,
          isFree: data.isFree,
          message: data.message
        };
        
        setCreditInfo(normalizedData);
        return normalizedData;
      } else {
        const errorData = await response.json();
        console.error('❌ Credit check failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error checking credits:', error);
    }
    return null;
  }, [story.storyId, editScope]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserRequest('');
      setError(null);
      setEditScope(currentChapter ? 'chapter' : 'story');
      setSelectedChapter(currentChapter ? currentChapter.chapterNumber : null);
    }
  }, [isOpen, currentChapter]);

  // Check credits automatically when scope changes
  useEffect(() => {
    if (isOpen) {
      checkEditCredits();
    }
  }, [isOpen, editScope, story.storyId, selectedChapter, checkEditCredits]);

  // Handle text edit
  const handleTextEdit = async () => {
    if (!userRequest.trim()) {
      setError(t('errors.enterRequest'));
      return;
    }

    // Check credits first
    const credits = await checkEditCredits();
    if (!credits) {
      setError(t('errors.unableToCheckCredits'));
      return;
    }

    if (!credits.canEdit) {
      setShowCreditConfirmation(true);
      return;
    }

    await performTextEdit();
  };

  const performTextEdit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare job parameters
      const jobParams: {
        storyId: string;
        userRequest: string;
        scope: 'chapter' | 'story';
        chapterNumber?: number;
      } = {
        storyId: story.storyId,
        userRequest: userRequest.trim(),
        scope: editScope
      };

      // Add chapter number only if editing a specific chapter
      if (editScope === 'chapter' && selectedChapter) {
        jobParams.chapterNumber = selectedChapter;
      }

      // Create async job
      const jobResponse = await createTextEditJob(jobParams);
      console.log('🚀 Text edit job created:', jobResponse);

      if (jobResponse.success && jobResponse.jobId) {
        // Show progress modal and start tracking
        setCurrentJobId(jobResponse.jobId);
        setShowJobProgress(true);
        setIsLoading(false);
      } else {
        throw new Error('Failed to create text edit job');
      }

    } catch (error) {
      console.error('Error creating text edit job:', error);
      setError(error instanceof Error ? error.message : t('errors.failedToEdit'));
      setIsLoading(false);
    }
  };

  const handleJobComplete = (result: { 
    updatedChapters?: unknown[]; 
    totalChapters?: number; 
    successfulEdits?: number; 
    failedEdits?: number; 
    tokensUsed?: number; 
    timestamp?: string; 
    [key: string]: unknown; 
  }) => {
    console.log('✅ Text edit job completed:', result);
    setShowJobProgress(false);
    setCurrentJobId(null);
    
    // Handle different response types based on edit scope
    if (editScope === 'story') {
      // Full story edit - show results and redirect
      const storyEditData = {
        scope: 'story',
        updatedChapters: result.updatedChapters || [],
        totalChapters: result.totalChapters || 0,
        successfulEdits: result.successfulEdits || 0,
        failedEdits: result.failedEdits || 0,
        tokensUsed: result.tokensUsed || 0,
        timestamp: result.timestamp || new Date().toISOString(),
        autoSaved: true // Indicate that changes were automatically saved
      };
      
      onEditSuccess(storyEditData);
    } else {
      // Single chapter edit
      onEditSuccess(result);
    }
    
    onClose();
  };

  const handleJobError = (error: string) => {
    console.error('❌ Text edit job failed:', error);
    setShowJobProgress(false);
    setCurrentJobId(null);
    setError(error || 'Text editing job failed');
  };

  const handleJobProgressClose = () => {
    // Only allow closing if job is completed or failed
    setShowJobProgress(false);
    setCurrentJobId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiEdit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('title', { storyTitle: story.title })}
              </h2>
              <p className="text-sm text-gray-600">
                {currentChapter 
                  ? `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}`
                  : t('fullStoryTitle')
                }
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
            {/* Scope Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Edit Scope
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="chapter"
                    checked={editScope === 'chapter'}
                    onChange={(e) => setEditScope(e.target.value as EditScope)}
                    disabled={!currentChapter && chapters.length === 0}
                    className="mr-2"
                  />
                  Current Chapter Only
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="story"
                    checked={editScope === 'story'}
                    onChange={(e) => setEditScope(e.target.value as EditScope)}
                    className="mr-2"
                  />
                  All Chapters
                </label>
              </div>
            </div>

            {/* Chapter Selection (when scope is chapter) */}
            {editScope === 'chapter' && chapters.length > 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Chapter
                </label>
                <select
                  value={selectedChapter || ''}
                  onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.chapterNumber}>
                      Chapter {chapter.chapterNumber}: {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Request */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Edit Request
              </label>
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder={t('requestPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={8}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('characterCount', { count: userRequest.length, max: 2000 })}</span>
              </div>
            </div>

            {/* Full Story Edit Explanation */}
            {editScope === 'story' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiEdit3 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    How Full Story Edit Works
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• AI will apply your request to all chapters in the story</p>
                  <p>• Each chapter edit counts as one edit towards your credit usage</p>
                  <p>• All successful changes will be automatically saved</p>
                  <p>• You can review the changes after the edit is complete</p>
                  <p>• If some chapters fail to edit, the successful ones will still be saved</p>
                </div>
              </div>
            )}

            {/* Cost Estimation */}
            {creditInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiAlertCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Cost Estimation
                  </span>
                </div>
                <div className="text-sm text-blue-800">
                  {editScope === 'story' ? (
                    // Full story edit cost info
                    <>
                      <p className="mb-1">{creditInfo.message}</p>
                      {creditInfo.freeEdits && creditInfo.freeEdits > 0 && (
                        <p className="text-blue-600">
                          • {creditInfo.freeEdits} free chapter edits
                        </p>
                      )}
                      {creditInfo.paidEdits && creditInfo.paidEdits > 0 && (
                        <p className="text-blue-600">
                          • {creditInfo.paidEdits} paid chapter edits
                        </p>
                      )}
                      <p className="text-blue-600">
                        • Current balance: {creditInfo.currentBalance} credits
                      </p>
                    </>
                  ) : (
                    // Single chapter edit cost info
                    <>
                      <p className="mb-1">
                        {creditInfo.isFree 
                          ? "This edit is free!" 
                          : `This edit will cost ${creditInfo.requiredCredits} credit${creditInfo.requiredCredits === 1 ? '' : 's'}`
                        }
                      </p>
                      <p className="text-blue-600">
                        • Current balance: {creditInfo.currentBalance} credits
                      </p>
                      {!creditInfo.isFree && (
                        <p className="text-blue-600">
                          • Edit count: {creditInfo.editCount} (next threshold: {creditInfo.nextThreshold})
                        </p>
                      )}
                      {creditInfo.message && (
                        <p className="text-blue-600 mt-1">
                          • {creditInfo.message}
                        </p>
                      )}
                    </>
                  )}
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
              <button
                onClick={handleTextEdit}
                disabled={isLoading || !userRequest.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('loading')}</span>
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    <span>{t('editButton')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Confirmation Modal */}
      {showCreditConfirmation && creditInfo && (
        <CreditConfirmationModal
          isOpen={showCreditConfirmation}
          onClose={() => setShowCreditConfirmation(false)}
          onConfirm={performTextEdit}
          action="textEdit"
          requiredCredits={creditInfo.requiredCredits}
          currentBalance={creditInfo.currentBalance}
          editCount={creditInfo.editCount}
          isFree={creditInfo.isFree}
          // Full story edit specific props
          isFullStory={editScope === 'story'}
          chapterCount={creditInfo.chapterCount}
          message={creditInfo.message}
        />
      )}

      {/* Job Progress Modal */}
      {showJobProgress && (
        <JobProgressModal
          isOpen={showJobProgress}
          onClose={handleJobProgressClose}
          jobId={currentJobId}
          jobType="text_edit"
          onComplete={handleJobComplete}
          onError={handleJobError}
        />
      )}
    </div>
  );
}
