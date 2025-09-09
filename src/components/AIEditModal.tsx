'use client';

import { useState } from 'react';
import AIEditModalLayout from './ai-edit/AIEditModalLayout';
import { useAIEdit } from './ai-edit/useAIEdit';
import { StoryImage } from '@/utils/imageUtils';

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  onEditSuccess: (updatedHtml: string, autoSave?: boolean) => void;
}

export default function AIEditModal({ isOpen, onClose, storyId, onEditSuccess }: AIEditModalProps) {
  const {
    t,
    activeTab,
    setActiveTab,
    chapters,
    selectedChapter,
    setSelectedChapter,
    userRequest,
    setUserRequest,
  } = useAIEdit({ storyId });

  const [storyImages, setStoryImages] = useState<StoryImage[]>([]);

  const handleImageEditSuccess = (originalUrl: string, newUrl: string) => {
    setStoryImages((imgs) =>
      imgs.map((img) =>
        img.latestVersion.url === originalUrl
          ? { ...img, latestVersion: { ...img.latestVersion, url: newUrl } }
          : img
      )
    );
  };

  return (
    <AIEditModalLayout
      isOpen={isOpen}
      onClose={onClose}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      t={t}
      chapters={chapters}
      selectedChapter={selectedChapter}
      setSelectedChapter={setSelectedChapter}
      userRequest={userRequest}
      setUserRequest={setUserRequest}
      storyId={storyId}
      storyImages={storyImages}
      onEditSuccess={onEditSuccess}
      onImageEditSuccess={handleImageEditSuccess}
      onImageUpdated={setStoryImages}
    />
  );
}
