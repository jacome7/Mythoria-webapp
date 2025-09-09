'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StoryImage, ImageVersion } from '@/utils/imageUtils';

interface UseImageEditingTabProps {
  storyId: string;
  storyImages: StoryImage[];
  onImageEditSuccess: (originalUrl: string, newUrl: string) => void;
  onImageUpdated: (updatedImages: StoryImage[]) => void;
}

export function useImageEditingTab({
  storyId,
  storyImages,
  onImageEditSuccess,
  onImageUpdated,
}: UseImageEditingTabProps) {
  const t = useTranslations('ImageEditingTab');
  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ImageVersion | null>(null);
  const [userRequest, setUserRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newImageGenerated, setNewImageGenerated] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const handleImageSelect = (image: StoryImage) => {
    setSelectedImage(image);
    setSelectedVersion(image.latestVersion);
    setPreviewImage(image.latestVersion.url);
    setError(null);
  };

  const handleVersionSelect = (version: ImageVersion) => {
    setSelectedVersion(version);
    setPreviewImage(version.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !selectedVersion) {
      setError(t('errors.selectImage'));
      return;
    }
    if (!userRequest.trim()) {
      setError(t('errors.enterChanges'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/image-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageUrl: selectedVersion.url,
          userRequest: userRequest.trim(),
          imageType: selectedImage.type,
          chapterNumber: selectedImage.chapterNumber,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNewImageGenerated(data.newImageUrl);
        setUserRequest('');
      } else {
        setError(data.error || t('errors.editFailed'));
      }
    } catch {
      setError(t('errors.editFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplaceImage = async () => {
    if (!newImageGenerated || !selectedImage || !selectedVersion) return;
    setIsReplacing(true);
    try {
      onImageEditSuccess(selectedVersion.url, newImageGenerated);
      const updatedImage: StoryImage = {
        ...selectedImage,
        latestVersion: { ...selectedVersion, url: newImageGenerated },
      };
      const updatedImages = storyImages.map((img) =>
        img === selectedImage ? updatedImage : img
      );
      onImageUpdated(updatedImages);
      setNewImageGenerated(null);
    } finally {
      setIsReplacing(false);
    }
  };

  return {
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
  };
}
