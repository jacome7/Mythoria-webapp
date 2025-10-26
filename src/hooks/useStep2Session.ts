'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UploadedImage {
  file: File;
  preview: string;
}

interface UploadedAudio {
  file: File;
  preview: string;
}

interface SessionData {
  text: string;
  images: string[];
  audio: string | null;
  lastSaved: number;
}

export function useStep2Session() {
  // Load from sessionStorage during initialization
  const getInitialStoryText = (): string => {
    if (typeof window === 'undefined') return '';

    const savedData = sessionStorage.getItem('step2Data');
    if (savedData) {
      try {
        const data: SessionData = JSON.parse(savedData);
        return data.text || '';
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    return '';
  };

  const [storyText, setStoryText] = useState(getInitialStoryText);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToSession = useCallback(() => {
    setIsSaving(true);
    const data: SessionData = {
      text: storyText,
      images: uploadedImages.map((img) => img.preview),
      audio: uploadedAudio?.preview || null,
      lastSaved: Date.now(),
    };
    sessionStorage.setItem('step2Data', JSON.stringify(data));
    setTimeout(() => setIsSaving(false), 500);
  }, [storyText, uploadedImages, uploadedAudio]);

  // Debounced save on text change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToSession();
    }, 10000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storyText, saveToSession]);

  return {
    storyText,
    setStoryText,
    uploadedImages,
    setUploadedImages,
    uploadedAudio,
    setUploadedAudio,
    isSaving,
    saveToSession,
  };
}

export type { UploadedImage, UploadedAudio };
