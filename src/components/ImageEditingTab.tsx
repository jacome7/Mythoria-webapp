'use client';

import { FiImage } from 'react-icons/fi';
import ReferenceImageSection from './image-editing-tab/ReferenceImageSection';
import PreviewSection from './image-editing-tab/PreviewSection';
import PromptSection from './image-editing-tab/PromptSection';
import { useImageEditingTab } from './image-editing-tab/useImageEditingTab';
import { StoryImage } from '@/utils/imageUtils';

interface ImageEditingTabProps {
  storyId: string;
  storyImages: StoryImage[];
  onImageEditSuccess: (originalUrl: string, newUrl: string) => void;
  onImageUpdated: (updatedImages: StoryImage[]) => void;
}

export default function ImageEditingTab(props: ImageEditingTabProps) {
  const {
    t,
    storyImages,
    selectedImage,
    selectedVersion,
    userRequest,
    setUserRequest,
    isLoading,
    error,
    previewImage,
    newImageGenerated,
    isReplacing,
    handleImageSelect,
    handleVersionSelect,
    handleSubmit,
    handleReplaceImage,
  } = useImageEditingTab(props);

  if (storyImages.length === 0) {
    return (
      <div className="text-center py-12">
        <FiImage className="w-12 h-12 text-base-content/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-base-content/70 mb-2">{t('noImages.title')}</h3>
        <p className="text-base-content/50">{t('noImages.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReferenceImageSection
        storyImages={storyImages}
        selectedImage={selectedImage}
        selectedVersion={selectedVersion}
        onSelectImage={handleImageSelect}
        onSelectVersion={handleVersionSelect}
        t={t}
      />
      <PreviewSection
        previewImage={previewImage}
        newImageGenerated={newImageGenerated}
        onReplace={handleReplaceImage}
        isReplacing={isReplacing}
        t={t}
      />
      {selectedImage && (
        <PromptSection
          userRequest={userRequest}
          setUserRequest={setUserRequest}
          isLoading={isLoading}
          error={error}
          onSubmit={handleSubmit}
          t={t}
        />
      )}
    </div>
  );
}
