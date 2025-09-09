"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { FiArrowLeft, FiRotateCcw, FiRotateCw } from "react-icons/fi";

// Components
import ChapterEditor from "@/components/chapter-editor/ChapterEditor";
import ChapterNavigation from "../../../../../../../components/ChapterNavigation";
import ToastContainer from "../../../../../../../components/ToastContainer";
import AITextStoryEditor from "../../../../../../../components/AITextStoryEditor";
import AIImageEditor from "../../../../../../../components/AIImageEditor";

// Hooks
import { useToast } from "../../../../../../../hooks/useToast";

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

export default function EditChapterPage() {
  const params = useParams<{
    storyId?: string;
    chapterNumber?: string;
    locale?: string;
  }>();
  const router = useRouter();
  const { user } = useUser();
  const tLoading = useTranslations("Loading");
  const tErrors = useTranslations("Errors");
  const tActions = useTranslations("Actions");
  const tChapterEditor = useTranslations("ChapterEditor");
  const tStoryInfoEditor = useTranslations("StoryInfoEditor");
  const tEditor = useTranslations("Editor");

  const storyId = (params?.storyId as string | undefined) ?? "";
  const chapterNumber = parseInt(
    (params?.chapterNumber as string | undefined) ?? "0",
    10,
  );
  const locale = (params?.locale as string | undefined) ?? "";

  // Convert API data to component-compatible format
  const convertApiChaptersToChapters = (apiChapters: ApiChapter[]) => {
    return apiChapters.map((chapter) => ({
      ...chapter,
      createdAt: new Date(chapter.createdAt),
      updatedAt: new Date(chapter.updatedAt),
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
    imageType: "cover" | "backcover" | "chapter";
    chapterNumber?: number;
    title?: string;
  } | null>(null);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Calculate current chapter data
  const currentChapterData = storyData?.chapters.find(
    (c) => c.chapterNumber === chapterNumber,
  );

  // Load story data
  const loadStoryData = useCallback(async () => {
    if (!storyId || !user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/stories/${storyId}/edit`);

      if (!response.ok) {
        throw new Error("Failed to load story data");
      }

      const data: ApiResponse = await response.json();
      if (data.success) {
        setStoryData(data);

        // Verify the requested chapter exists
        if (!data.chapters.some((c) => c.chapterNumber === chapterNumber)) {
          throw new Error(tEditor("chapterNotFound"));
        }
      } else {
        throw new Error("Failed to load story");
      }
    } catch (error) {
      console.error("Error loading story:", error);
      addToast(tChapterEditor("errors.failedToLoadStoryData"), "error");
    } finally {
      setLoading(false);
    }
  }, [storyId, user, addToast, chapterNumber, tChapterEditor, tEditor]);

  // Save chapter content and create new version
  const saveChapterContent = async (content: string, title: string) => {
    if (!storyData || saving) return;

    try {
      setSaving(true);

      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterNumber}/edit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title || `Chapter ${chapterNumber}`,
            htmlContent: content,
            imageUri: currentChapterData?.imageUri || null,
            imageThumbnailUri: currentChapterData?.imageThumbnailUri || null,
            audioUri: currentChapterData?.audioUri || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save chapter");
      }

      const result = await response.json();

      // Update local state with new version
      setStoryData((prev) => {
        if (!prev) return prev;

        const updatedChapters = prev.chapters.map((chapter) =>
          chapter.chapterNumber === chapterNumber
            ? {
                ...chapter,
                htmlContent: content,
                title: title,
                version: result.chapter.version,
              }
            : chapter,
        );

        return { ...prev, chapters: updatedChapters };
      });

      addToast(
        tStoryInfoEditor("messages.chapterSavedWithVersion", {
          version: result.chapter.version,
        }),
        "success",
      );
    } catch (error) {
      console.error("Error saving chapter:", error);
      addToast(tStoryInfoEditor("messages.failedToSaveChapter"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Undo: revert to previous version
  const undoChapter = async () => {
    if (!storyData || !currentChapterData) return;

    if (currentChapterData.version <= 1) {
      addToast(tStoryInfoEditor("messages.noPreviousVersion"), "warning");
      return;
    }

    try {
      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterNumber}/edit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ version: currentChapterData.version - 1 }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to undo chapter");
      }

      const result = await response.json();

      // Update local state
      setStoryData((prev) => {
        if (!prev) return prev;

        const updatedChapters = prev.chapters.map((chapter) =>
          chapter.chapterNumber === chapterNumber
            ? {
                ...chapter,
                htmlContent: result.chapter.htmlContent,
                title: result.chapter.title,
                version: result.chapter.version,
              }
            : chapter,
        );

        return { ...prev, chapters: updatedChapters };
      });

      addToast(
        tStoryInfoEditor("messages.revertedToVersion", {
          version: result.chapter.version,
        }),
        "success",
      );
    } catch (error) {
      console.error("Error undoing chapter:", error);
      addToast(tStoryInfoEditor("messages.failedToUndoChapter"), "error");
    }
  };

  // Redo: advance to next version (if exists)
  const redoChapter = async () => {
    if (!storyData || !currentChapterData) return;

    try {
      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterNumber}/edit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ version: currentChapterData.version + 1 }),
        },
      );

      if (!response.ok) {
        // Silently fail if no newer version exists
        return;
      }

      const result = await response.json();

      // Update local state
      setStoryData((prev) => {
        if (!prev) return prev;

        const updatedChapters = prev.chapters.map((chapter) =>
          chapter.chapterNumber === chapterNumber
            ? {
                ...chapter,
                htmlContent: result.chapter.htmlContent,
                title: result.chapter.title,
                version: result.chapter.version,
              }
            : chapter,
        );

        return { ...prev, chapters: updatedChapters };
      });

      addToast(
        tStoryInfoEditor("messages.advancedToVersion", {
          version: result.chapter.version,
        }),
        "success",
      );
    } catch (error) {
      console.error("Error redoing chapter:", error);
    }
  };

  // Handle go back navigation
  const handleGoBack = () => {
    // Navigate to the specific chapter reading page
    router.push(`/${locale}/stories/read/${storyId}/chapter/${chapterNumber}`);
  };

  // Handle chapter navigation
  const handleChapterChange = (newChapterNumber: number) => {
    if (newChapterNumber === 0) {
      // Navigate to story info edit page
      router.push(`/${locale}/stories/edit/${storyId}`);
    } else {
      // Navigate to different chapter edit page
      router.push(
        `/${locale}/stories/edit/${storyId}/chapter/${newChapterNumber}`,
      );
    }
  };

  // Handle content changes
  const handleContentChange = () => {
    // Chapter editor handles its own state
  };

  // Handle title changes
  const handleTitleChange = () => {
    // Chapter editor handles its own state
  };

  // Handle AI edit

  // Handle AI edit success
  const handleAIEditSuccess = async (updatedData: Record<string, unknown>) => {
    console.log("AI Edit Success - Updated Data:", updatedData);

    // Handle full story edit - redirect to main story page
    if (updatedData.scope === "story") {
      const storyEditData = updatedData as {
        scope: "story";
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

      // Show toast with results
      const successCount = storyEditData.successfulEdits;
      const failCount = storyEditData.failedEdits;

      if (failCount > 0) {
        const failedChapters = storyEditData.updatedChapters
          .filter((ch) => !ch.success)
          .map((ch) => ch.chapterNumber)
          .join(", ");

        addToast(
          tEditor("chapterUpdates.chaptersUpdatedSuccessfully", {
            successCount,
            failedChapters,
          }),
          "warning",
        );
      } else {
        addToast(
          tEditor("chapterUpdates.allChaptersUpdated", { successCount }),
          "success",
        );
      }

      // Redirect to main story edit page
      router.push(`/${locale}/stories/edit/${storyId}`);
      return;
    }

    // Handle single chapter edit
    if (
      updatedData.updatedHtml &&
      typeof updatedData.updatedHtml === "string"
    ) {
      // Update the specific chapter content immediately
      setStoryData((prev) => {
        if (!prev) return prev;

        const updatedChapters = prev.chapters.map((chapter) =>
          chapter.chapterNumber === chapterNumber
            ? {
                ...chapter,
                htmlContent: updatedData.updatedHtml as string,
                // Increment version to trigger re-render
                version: chapter.version + 1,
              }
            : chapter,
        );

        return { ...prev, chapters: updatedChapters };
      });

      addToast(
        tStoryInfoEditor("messages.chapterUpdatedSuccessfully"),
        "success",
      );
    } else {
      // Fallback: reload story data to get the latest changes
      await loadStoryData();
      addToast(
        tStoryInfoEditor("messages.contentUpdatedSuccessfully"),
        "success",
      );
    }
  };

  // Handle AI edit optimistic update
  const handleAIEditOptimisticUpdate = (
    _updatedData: Record<string, unknown>,
  ) => {
    // Mark as intentionally unused for now to avoid lint warnings until optimistic UI is implemented
    void _updatedData;
  };

  // Handle AI edit revert
  const handleAIEditRevertUpdate = (_originalData: Record<string, unknown>) => {
    // Mark as intentionally unused for now to avoid lint warnings until revert logic is implemented
    void _originalData;
  };

  // Handle image edit
  const handleImageEdit = (imageData: {
    imageUri: string;
    imageType: string;
    chapterNumber?: number;
  }) => {
    setSelectedImageData({
      imageUri: imageData.imageUri,
      imageType: imageData.imageType as "cover" | "backcover" | "chapter",
      chapterNumber: imageData.chapterNumber,
      title: tEditor("imageEditor.chapterTitle", {
        chapterNumber: imageData.chapterNumber ?? 0,
      }),
    });
    setShowAIImageEditor(true);
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
          <p className="text-lg font-medium">{tLoading("default")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!storyData || !currentChapterData) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold mb-2">{tErrors("generic")}</h1>
          <p className="text-base-content/70 mb-6">
            {tEditor("chapterNotFound")}
          </p>
          <button
            onClick={() => router.push(`/${locale}/stories/edit/${storyId}`)}
            className="btn btn-primary"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            {tEditor("backToStory")}
          </button>
        </div>
      </div>
    );
  }

  const canUndo = currentChapterData && currentChapterData.version > 1;
  const canRedo = currentChapterData && currentChapterData.hasNextVersion;

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleGoBack} className="btn btn-ghost btn-sm">
              <FiArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">
                {tActions("goBack")}
              </span>
            </button>

            <h1 className="text-xl font-bold">{storyData.story.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            <ChapterNavigation
              chapters={convertApiChaptersToChapters(storyData.chapters)}
              currentChapter={chapterNumber}
              onChapterChange={handleChapterChange}
            />

            {/* Version Control */}
            <button
              onClick={undoChapter}
              disabled={!canUndo}
              className="btn btn-outline btn-sm"
              title={tEditor("undoPreviousVersion")}
            >
              <FiRotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={redoChapter}
              disabled={!canRedo}
              className="btn btn-outline btn-sm"
              title={tEditor("redoNextVersion")}
            >
              <FiRotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:max-w-7xl md:mx-auto md:p-4">
        <div className="space-y-6 md:space-y-6">
          {/* Chapter Editor */}
          <ChapterEditor
            key={`chapter-${chapterNumber}-v${currentChapterData.version}`}
            initialContent={currentChapterData.htmlContent}
            chapterTitle={currentChapterData.title}
            chapterImageUri={currentChapterData.imageUri}
            chapterNumber={chapterNumber}
            storyId={storyId}
            locale={locale}
            onContentChange={handleContentChange}
            onTitleChange={handleTitleChange}
            onSave={saveChapterContent}
            onImageEdit={handleImageEdit}
            isLoading={saving}
          />
        </div>

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
            graphicalStyle: storyData.story.graphicalStyle,
          }}
          chapters={storyData.chapters.map((chapter) => ({
            id: chapter.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            imageUri: chapter.imageUri,
            imageThumbnailUri: chapter.imageThumbnailUri,
            htmlContent: chapter.htmlContent,
            audioUri: chapter.audioUri,
            version: chapter.version,
          }))}
          currentChapter={{
            id: currentChapterData.id,
            chapterNumber: currentChapterData.chapterNumber,
            title: currentChapterData.title,
            imageUri: currentChapterData.imageUri,
            imageThumbnailUri: currentChapterData.imageThumbnailUri,
            htmlContent: currentChapterData.htmlContent,
            audioUri: currentChapterData.audioUri,
            version: currentChapterData.version,
          }}
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
              graphicalStyle: storyData.story.graphicalStyle,
            }}
            imageData={selectedImageData}
            onImageEditSuccess={handleAIEditSuccess}
            onOptimisticUpdate={handleAIEditOptimisticUpdate}
            onRevertUpdate={handleAIEditRevertUpdate}
          />
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
