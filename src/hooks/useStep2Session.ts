'use client';

import type { MediaAnalysisCode } from '@/lib/media-analysis-errors';
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
  attempts: number; // analysis attempts used during this session
  objectPath?: string;
  publicUrl?: string;
  metadata?: ImageMetadataSummary;
  error?: string;
  errorCode?: MediaAnalysisCode;
}

export interface UploadedAudio {
  durationSeconds?: number;
  file?: File;
  preview: string;
  status: AnalysisStatus; // audio is only uploaded (not analysed): 'uploading' | 'done' | 'error'
  objectPath?: string;
  error?: string;
}

export type DocumentProvenance = { retained: boolean; alsoTyped: boolean };
export const emptyDocumentProvenance: DocumentProvenance = { retained: false, alsoTyped: false };

interface PersistedImage {
  id: string;
  status: AnalysisStatus;
  objectPath?: string;
  publicUrl?: string;
  metadata?: ImageMetadataSummary;
  errorCode?: MediaAnalysisCode;
}

interface SessionData {
  text: string;
  images: PersistedImage[];
  audio: { objectPath?: string; status: AnalysisStatus; durationSeconds?: number } | null;
  lastSaved: number;
  selectedCharacterIds?: string[];
  documentSource?: DocumentProvenance;
}

function readSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem('step2Data');
    if (!saved) return null;
    const data = JSON.parse(saved) as SessionData;
    if (typeof data.text !== 'string' || !Array.isArray(data.images)) return null;
    return data;
  } catch {
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
  const [documentSource, setDocumentSource] = useState<DocumentProvenance>(
    initial?.documentSource ?? emptyDocumentProvenance,
  );
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    initial?.selectedCharacterIds ?? [],
  );
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() =>
    (initial?.images || []).map((img) => {
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
        errorCode: img.errorCode,
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
        durationSeconds: a.durationSeconds,
        objectPath,
      };
    }
    return null;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        errorCode: img.errorCode,
      })),
      audio: uploadedAudio
        ? {
            objectPath: uploadedAudio.objectPath,
            status: uploadedAudio.status,
            durationSeconds: uploadedAudio.durationSeconds,
          }
        : null,
      lastSaved: Date.now(),
      selectedCharacterIds,
      documentSource,
    };
    try {
      sessionStorage.setItem('step2Data', JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    savedIndicatorRef.current = setTimeout(() => setIsSaving(false), 500);
  }, [storyText, uploadedImages, uploadedAudio, selectedCharacterIds, documentSource]);

  // Persist every committed edit, including media completion and character choices.
  // A navigation or refresh within the old ten-second window must not discard inputs.
  useEffect(() => {
    saveToSession();
  }, [saveToSession]);
  useEffect(
    () => () => {
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    },
    [],
  );

  const resetInputs = useCallback(() => {
    setStoryText('');
    setDocumentSource(emptyDocumentProvenance);
    setUploadedImages([]);
    setUploadedAudio(null);
    setSelectedCharacterIds([]);
    try {
      sessionStorage.setItem(
        'step2Data',
        JSON.stringify({
          text: '',
          images: [],
          audio: null,
          selectedCharacterIds: [],
          lastSaved: Date.now(),
        }),
      );
    } catch {
      /* In-memory reset remains usable. */
    }
  }, []);

  return {
    resetInputs,
    storyText,
    setStoryText,
    documentSource,
    setDocumentSource,
    uploadedImages,
    setUploadedImages,
    uploadedAudio,
    setUploadedAudio,
    isSaving,
    saveError,
    saveToSession,
    selectedCharacterIds,
    setSelectedCharacterIds,
  };
}
