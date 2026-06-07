'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AnalysisStatus = 'uploading' | 'analyzing' | 'done' | 'error';

export interface DetectedCharacterSummary {
  label?: string;
  type?: string;
  age?: string;
  physicalDescription?: string;
}

export interface ImageMetadataSummary {
  overallImageContent?: 'photo' | 'drawing' | 'text';
  description?: string;
  text?: string;
  characters?: DetectedCharacterSummary[];
}

export interface UploadedImage {
  id: string;
  file?: File; // present for freshly added images; absent for session-restored ones
  preview: string; // data URL (fresh) or public URL (restored)
  status: AnalysisStatus;
  attempts: number; // analysis attempts used (capped at 3)
  objectPath?: string;
  publicUrl?: string;
  metadata?: ImageMetadataSummary;
  error?: string;
}

export interface UploadedAudio {
  file?: File;
  preview: string;
  status: AnalysisStatus; // audio is only uploaded (not analysed): 'uploading' | 'done' | 'error'
  objectPath?: string;
  error?: string;
}

interface PersistedImage {
  id: string;
  status: AnalysisStatus;
  objectPath?: string;
  publicUrl?: string;
  metadata?: ImageMetadataSummary;
}

interface SessionData {
  text: string;
  images: PersistedImage[];
  audio: { objectPath?: string; status: AnalysisStatus } | null;
  lastSaved: number;
}

function readSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  const saved = sessionStorage.getItem('step2Data');
  if (!saved) return null;
  try {
    return JSON.parse(saved) as SessionData;
  } catch (error) {
    console.error('Error loading saved step-2 data:', error);
    return null;
  }
}

interface RelocatedInputs {
  storyId: string;
  paths: string[]; // submitted object paths that the structure job relocated
  audioPath?: string | null;
}

function readRelocatedInputs(): RelocatedInputs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('step2RelocatedInputs');
    return raw ? (JSON.parse(raw) as RelocatedInputs) : null;
  } catch {
    return null;
  }
}

/**
 * Guard for returning to Step 2 after structuring ran: the staged inputs were
 * moved into `{storyId}/inputs/`, so any restored object path that was relocated
 * is re-pointed to its new story-scoped location (filename is preserved). This
 * keeps the gallery valid and ensures a re-submit sends live paths.
 */
function remapRelocated(
  objectPath: string | undefined,
  publicUrl: string | undefined,
  reloc: RelocatedInputs | null,
): { objectPath?: string; publicUrl?: string } {
  const relocatedThis =
    !!objectPath && !!reloc && (reloc.paths.includes(objectPath) || reloc.audioPath === objectPath);
  if (!relocatedThis) {
    return { objectPath, publicUrl };
  }
  const file = objectPath.slice(objectPath.lastIndexOf('/') + 1);
  const newPath = `${reloc.storyId}/inputs/${file}`;
  return {
    objectPath: newPath,
    publicUrl: publicUrl ? publicUrl.replace(objectPath, newPath) : publicUrl,
  };
}

export function useStep2Session() {
  const initial = readSession();
  const relocated = readRelocatedInputs();

  const [storyText, setStoryText] = useState<string>(initial?.text || '');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() =>
    (initial?.images || [])
      .filter((img) => !!img.objectPath) // only restore images that finished uploading
      .map((img) => {
        const { objectPath, publicUrl } = remapRelocated(img.objectPath, img.publicUrl, relocated);
        return {
          id: img.id,
          preview: publicUrl || '',
          // In-flight states couldn't survive a reload; surface them as retryable errors.
          status: img.status === 'done' ? 'done' : ('error' as AnalysisStatus),
          attempts: 0,
          objectPath,
          publicUrl,
          metadata: img.metadata,
        };
      }),
  );
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(() => {
    const a = initial?.audio;
    if (a && a.objectPath) {
      const { objectPath } = remapRelocated(a.objectPath, undefined, relocated);
      return {
        preview: '',
        status: a.status === 'done' ? 'done' : 'error',
        objectPath,
      };
    }
    return null;
  });
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToSession = useCallback(() => {
    setIsSaving(true);
    const data: SessionData = {
      text: storyText,
      images: uploadedImages.map((img) => ({
        id: img.id,
        status: img.status,
        objectPath: img.objectPath,
        publicUrl: img.publicUrl,
        metadata: img.metadata,
      })),
      audio: uploadedAudio
        ? { objectPath: uploadedAudio.objectPath, status: uploadedAudio.status }
        : null,
      lastSaved: Date.now(),
    };
    try {
      sessionStorage.setItem('step2Data', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist step-2 session', e);
    }
    setTimeout(() => setIsSaving(false), 500);
  }, [storyText, uploadedImages, uploadedAudio]);

  // Debounced save on text change
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToSession(), 10000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
