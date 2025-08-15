'use client';

import AITextStoryEditor from '../../../../../components/AITextStoryEditor';
import AIImageEditor from '../../../../../components/AIImageEditor';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { FiArrowLeft } from 'react-icons/fi';

// Components
import ChapterNavigation from '../../../../../components/ChapterNavigation';
import StoryInfoEditor from '../../../../../components/StoryInfoEditor';
import ToastContainer from '../../../../../components/ToastContainer';

// Hooks
import { useToast } from '../../../../../hooks/useToast';

// API types (matching the route response)
interface ApiStory {
  storyId: string;
  title: string;
  synopsis?: string;
  dedicationMessage?: string;
  customAuthor?: string;
  coverUri?: string;
  backcoverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiChapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  hasNextVersion: boolean;
  hasPreviousVersion: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  story: ApiStory;
  chapters: ApiChapter[];
}

export default function StoryEditPage() {
  const params = useParams<{ storyId?: string; locale?: string }>();
  const router = useRouter();
  const { user } = useUser();
  const tLoading = useTranslations('Loading');
  const tErrors = useTranslations('Errors');
  const tActions = useTranslations('Actions');
  const tStoryEditPage = useTranslations('StoryEditPage');

  const storyId = (params?.storyId as string | undefined) ?? '';
  const locale = (params?.locale as string | undefined) ?? '';

  // Convert API data to component-compatible format
  const convertApiChaptersToChapters = (apiChapters: ApiChapter[]) => {
    return apiChapters.map(chapter => ({
      ...chapter,
      createdAt: new Date(chapter.createdAt),
      updatedAt: new Date(chapter.updatedAt)
    }));
  };

  // State
  const [storyData, setStoryData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAITextEditor, setShowAITextEditor] = useState(false);
  const [showAIImageEditor, setShowAIImageEditor] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<{
    imageUri: string;
    imageType: 'cover' | 'backcover' | 'chapter';
    chapterNumber?: number;
    title?: string;
  } | null>(null);
  
  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Load story data
  const loadStoryData = useCallback(async () => {
    if (!storyId || !user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/stories/${storyId}/edit`);
      
      if (!response.ok) {
        throw new Error(tStoryEditPage('errors.failedToLoadStoryData'));
      }

      const data: ApiResponse = await response.json();
      if (data.success) {
        setStoryData(data);
      } else {
        throw new Error(tStoryEditPage('errors.failedToLoadStory'));
      }
    } catch (error) {
      console.error(tStoryEditPage('logging.errorLoadingStory'), error);
      addToast(tStoryEditPage('errors.failedToLoadStoryDataToast'), 'error');
    } finally {
      setLoading(false);
    }
  }, [storyId, user, addToast, tStoryEditPage]);

  // Update story info
  const updateStoryInfo = async (updates: Partial<ApiStory>) => {
    if (!storyData) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/stories/${storyId}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(tStoryEditPage('errors.failedToUpdateStoryInfo'));
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setStoryData(prev => {
          if (!prev) return prev;
          return { ...prev, story: result.story };
        });

        addToast(tStoryEditPage('success.storyInfoUpdated'), 'success');
      }
    } catch (error) {
      console.error(tStoryEditPage('logging.errorUpdatingStoryInfo'), error);
      addToast(tStoryEditPage('errors.failedToUpdateStoryInfo'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle go back navigation
  const handleGoBack = () => {
    // Navigate to general story reading page
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  // Handle chapter navigation
  const handleChapterChange = (chapterNumber: number) => {
    if (chapterNumber === 0) {
      // Stay on story info page (current page)
      return;
    } else {
      // Navigate to chapter edit page
      router.push(`/${locale}/stories/edit/${storyId}/chapter/${chapterNumber}`);
    }
  };

  // Handle AI edit success
  const handleAIEditSuccess = async (updatedData: Record<string, unknown>) => {
    console.log(tStoryEditPage('logging.aiEditSuccessUpdatedData'), updatedData);
    
    // Handle full story edit
    if (updatedData.scope === 'story') {
      const storyEditData = updatedData as {
        scope: 'story';
        updatedChapters: Array<{
          chapterNumber: number;
          success: boolean;
          error?: string;
        }>;
        totalChapters: number;
        successfulEdits: number;
        failedEdits: number;
        autoSaved: boolean;
      };
      
      // Reload story data to get all updated chapters
      await loadStoryData();
      
      // Show detailed results
      const successCount = storyEditData.successfulEdits;
      const failCount = storyEditData.failedEdits;
      
      if (failCount > 0) {
        const failedChapters = storyEditData.updatedChapters
          .filter(ch => !ch.success)
          .map(ch => ch.chapterNumber)
          .join(', ');
        
        addToast(
          tStoryEditPage('chapterUpdates.chaptersUpdatedSuccessfully', {
            successCount: successCount.toString(),
            failedChapters: failedChapters
          }),
          'warning'
        );
      } else {
        addToast(
          tStoryEditPage('chapterUpdates.allChaptersUpdated', {
            successCount: successCount.toString()
          }),
          'success'
        );
      }
    } else if (updatedData.updatedHtml && updatedData.chaptersUpdated) {
      // For story-wide edits (legacy format), reload data to get all updated chapters
      await loadStoryData();
      addToast(tStoryEditPage('success.storyUpdated'), 'success');
    } else if (updatedData.updatedHtml) {
      // For single chapter edits, we could update directly but currently
      // this page doesn't show individual chapter content, so reload
      await loadStoryData();
      addToast(tStoryEditPage('success.chapterUpdated'), 'success');
    } else {
      // Fallback: reload story data to get the latest changes
      await loadStoryData();
      addToast(tStoryEditPage('success.contentUpdated'), 'success');
    }
  };

  // Handle AI edit optimistic update
  const handleAIEditOptimisticUpdate = (_updatedData: Record<string, unknown>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // This could be used for optimistic UI updates if needed
  };

  // Handle AI edit revert
  const handleAIEditRevertUpdate = (_originalData: Record<string, unknown>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // This could be used to revert optimistic updates
  };

  // Load data on mount
  useEffect(() => {
    loadStoryData();
  }, [loadStoryData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg font-medium">{tLoading('default')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!storyData) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{tStoryEditPage('errors.errorEmoji')}</div>
          <h1 className="text-2xl font-bold mb-2">{tErrors('generic')}</h1>
          <p className="text-base-content/70 mb-6">{tStoryEditPage('errors.failedToLoadStoryData')}</p>
          <button
            onClick={() => router.push(`/${locale}/stories`)}
            className="btn btn-primary"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            {tActions('goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="btn btn-ghost btn-sm"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">{tActions('goBack')}</span>
            </button>
            
            <h1 className="text-xl font-bold">{storyData.story.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            <ChapterNavigation
              chapters={convertApiChaptersToChapters(storyData.chapters)}
              currentChapter={0}
              onChapterChange={handleChapterChange}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-0">
        <div className="space-y-6">
          {/* Story Info Editor */}
          <StoryInfoEditor
            story={storyData.story}
            onSave={updateStoryInfo}
            onEditCover={() => {
              if (storyData.story.coverUri) {
                setSelectedImageData({
                  imageUri: storyData.story.coverUri,
                  imageType: 'cover',
                  title: tStoryEditPage('imageTypes.frontCover')
                });
                setShowAIImageEditor(true);
              }
            }}
            onEditBackcover={() => {
              if (storyData.story.backcoverUri) {
                setSelectedImageData({
                  imageUri: storyData.story.backcoverUri,
                  imageType: 'backcover',
                  title: tStoryEditPage('imageTypes.backCover')
                });
                setShowAIImageEditor(true);
              }
            }}
            isLoading={saving}
          />

          {/* AI Text Editor Modal */}
          <AITextStoryEditor
            isOpen={showAITextEditor}
            onClose={() => setShowAITextEditor(false)}
            story={{
              storyId: storyData.story.storyId,
              title: storyData.story.title,
              coverUri: storyData.story.coverUri,
              backcoverUri: storyData.story.backcoverUri,
              targetAudience: storyData.story.targetAudience,
              graphicalStyle: storyData.story.graphicalStyle
            }}
            chapters={storyData.chapters.map(chapter => ({
              id: chapter.id,
              chapterNumber: chapter.chapterNumber,
              title: chapter.title,
              imageUri: chapter.imageUri,
              imageThumbnailUri: chapter.imageThumbnailUri,
              htmlContent: chapter.htmlContent,
              audioUri: chapter.audioUri,
              version: chapter.version
            }))}
            onEditSuccess={handleAIEditSuccess}
            onOptimisticUpdate={handleAIEditOptimisticUpdate}
            onRevertUpdate={handleAIEditRevertUpdate}
          />

          {/* AI Image Editor Modal */}
          {selectedImageData && (
            <AIImageEditor
              isOpen={showAIImageEditor}
              onClose={() => {
                setShowAIImageEditor(false);
                setSelectedImageData(null);
              }}
              story={{
                storyId: storyData.story.storyId,
                title: storyData.story.title,
                coverUri: storyData.story.coverUri,
                backcoverUri: storyData.story.backcoverUri,
                targetAudience: storyData.story.targetAudience,
                graphicalStyle: storyData.story.graphicalStyle
              }}
              imageData={selectedImageData}
              onImageEditSuccess={handleAIEditSuccess}
              onOptimisticUpdate={handleAIEditOptimisticUpdate}
              onRevertUpdate={handleAIEditRevertUpdate}
            />
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

