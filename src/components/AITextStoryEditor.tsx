'use client';

import { useState, useEffect } from 'react';
import { FiX, FiZap, FiEdit3, FiAlertCircle } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import CreditConfirmationModal from './CreditConfirmationModal';

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
  const t = useTranslations('common.aiEditModal');
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
  } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserRequest('');
      setError(null);
      setEditScope(currentChapter ? 'chapter' : 'story');
      setSelectedChapter(currentChapter ? currentChapter.chapterNumber : null);
    }
  }, [isOpen, currentChapter]);

  // Check edit credits
  const checkEditCredits = async () => {
    try {
      console.log('🔍 Checking edit credits for storyId:', story.storyId);
      const response = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'textEdit',
          storyId: story.storyId 
        })
      });
      
      console.log('📊 Credit check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Credit check successful:', data);
        setCreditInfo(data);
        return data;
      } else {
        const errorData = await response.json();
        console.error('❌ Credit check failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error checking credits:', error);
    }
    return null;
  };

  // Handle text edit
  const handleTextEdit = async () => {
    if (!userRequest.trim()) {
      setError('Please enter your editing request');
      return;
    }

    // Check credits first
    const credits = await checkEditCredits();
    if (!credits) {
      setError('Unable to check credits. Please try again.');
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
      const requestBody: {
        storyId: string;
        userRequest: string;
        scope: string;
        chapterNumber?: number;
      } = {
        storyId: story.storyId,
        userRequest: userRequest.trim(),
        scope: editScope
      };

      if (editScope === 'chapter' && selectedChapter) {
        requestBody.chapterNumber = selectedChapter;
      }

      const response = await fetch('/api/story-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onEditSuccess(data);
        onClose();
      } else {
        setError(data.error || 'Failed to edit content');
      }
    } catch (error) {
      console.error('Error editing content:', error);
      setError('An error occurred while editing');
    } finally {
      setIsLoading(false);
    }
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
                AI Text Editor - {story.title}
              </h2>
              <p className="text-sm text-gray-600">
                {currentChapter 
                  ? `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}`
                  : 'Full Story'
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
                {t('userRequest.label')}
              </label>
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder={t('userRequest.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{userRequest.length}/2000 characters</span>
              </div>
            </div>

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
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleTextEdit}
                disabled={isLoading || !userRequest.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('actions.editing')}</span>
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    <span>{t('actions.edit')}</span>
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
        />
      )}
    </div>
  );
}
