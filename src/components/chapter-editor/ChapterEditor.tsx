'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { FiSave, FiImage, FiChevronLeft } from 'react-icons/fi';

import Toolbar from './Toolbar';
import {
  initialConfig,
  ContentInitializationPlugin,
  ContentChangePlugin,
  createInitialEditorState,
} from './lexical';
import { toAbsoluteImageUrl } from '@/utils/image-url';

interface ChapterEditorProps {
  initialContent?: string;
  chapterTitle?: string;
  chapterImageUri?: string | null;
  chapterNumber?: number;
  storyId?: string;
  locale?: string;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onSave?: (content: string, title: string) => void;
  onAIEdit?: () => void;
  onImageInsert?: () => void;
  onImageEdit?: (imageData: {
    imageUri: string;
    imageType: string;
    chapterNumber?: number;
  }) => void;
  isLoading?: boolean;
}

export default function ChapterEditor({
  initialContent = '',
  chapterTitle = '',
  chapterImageUri = null,
  chapterNumber = 1,
  storyId,
  locale = 'en',
  onContentChange,
  onTitleChange,
  onSave,
  onAIEdit,
  onImageInsert,
  onImageEdit,
  isLoading = false,
}: ChapterEditorProps) {
  const router = useRouter();
  const [currentTitle, setCurrentTitle] = useState(chapterTitle);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const t = useTranslations('ChapterEditor');

  const handleTitleChange = (title: string) => {
    setCurrentTitle(title);
    onTitleChange?.(title);
  };

  const handleContentChange = (content: string) => {
    setCurrentContent(content);
    onContentChange?.(content);
  };

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(currentContent, currentTitle);
    }
  };

  const handleCancel = () => {
    if (storyId && chapterNumber) {
      router.push(`/${locale}/stories/read/${storyId}/chapter/${chapterNumber}`);
    } else {
      router.back();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="space-y-2 px-4 md:px-0">
        <input
          id="chapter-title"
          type="text"
          value={currentTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input input-bordered w-full text-lg font-semibold"
          placeholder={t('titlePlaceholder')}
        />
      </div>

      {chapterImageUri && (
        <div className="space-y-2 px-4 md:px-0">
          <label className="block text-sm font-medium text-base-content">
            {t('imagePlaceholder', { number: chapterNumber })}
          </label>
          <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center w-full">
            <div className="space-y-4">
              <div className="relative mx-auto max-h-120 w-fit">
                <Image
                  src={toAbsoluteImageUrl(chapterImageUri) || ''}
                  alt={`Chapter ${chapterNumber}`}
                  width={600}
                  height={800}
                  className="max-h-120 rounded-lg object-contain"
                />
              </div>
              {onImageEdit && (
                <button
                  onClick={() =>
                    onImageEdit({
                      imageUri: chapterImageUri,
                      imageType: 'chapter',
                      chapterNumber,
                    })
                  }
                  className="btn btn-sm btn-outline"
                >
                  <FiImage className="w-4 h-4" />
                  {t('editImageButton')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <LexicalComposer
          initialConfig={{
            ...initialConfig,
            editorState: createInitialEditorState(),
          }}
        >
          <Toolbar onImageInsert={onImageInsert} onAIEdit={onAIEdit} />
          <div className="flex-1 flex flex-col border-0 md:border border-base-300 md:rounded-lg overflow-hidden relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="flex-1 p-4 md:p-4 prose prose-lg max-w-none focus:outline-none"
                  style={{ minHeight: '400px' }}
                />
              }
              placeholder={
                <div className="absolute top-4 left-4 md:left-4 text-base-content/50 pointer-events-none">
                  {t('contentPlaceholder')}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ContentInitializationPlugin
              initialContent={initialContent}
              chapterNumber={chapterNumber}
            />
            <ContentChangePlugin
              onContentChange={handleContentChange}
              onHasChanges={setHasChanges}
              initialContent={initialContent}
              currentTitle={currentTitle}
              chapterTitle={chapterTitle}
            />
          </div>
          <div className="px-4 py-4 md:p-4 border-t border-base-300 bg-base-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {chapterNumber && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-ghost btn-sm"
                    title={
                      storyId
                        ? `Go to reading page for Chapter ${chapterNumber}`
                        : t('goBackButton')
                    }
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    {t('backButton')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !hasChanges}
                  className="btn btn-primary"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  {isLoading ? t('saving') : t('saveButton')}
                </button>
              </div>
            </div>
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
}
