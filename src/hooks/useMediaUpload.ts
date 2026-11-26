'use client';

import { storyInputMaxBytes, StoryInputTooLarge } from '@/lib/story-input-size';
import { isMediaAnalysisCode, MediaAnalysisError } from '@/lib/media-analysis-errors';
import type { ImageMetadataSummary } from '@/hooks/useStep2Session';

interface UploadResult {
  objectPath: string;
  publicUrl: string;
}

export function useMediaUpload() {
  /** Upload an input image/audio to GCS (author-scoped). Returns its object path. */
  const uploadInput = async (
    kind: 'image' | 'audio',
    file: File,
    assetId = crypto.randomUUID(),
  ): Promise<UploadResult> => {
    const contentType = file.type || (kind === 'image' ? 'image/jpeg' : 'audio/wav');
    if (file.size > storyInputMaxBytes) throw new StoryInputTooLarge();
    const resp = await fetch('/api/media/input-upload', {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'x-media-kind': kind,
        'x-request-id': crypto.randomUUID(),
        'x-media-id': assetId,
      },
      body: file,
    });
    if (resp.status === 413) throw new StoryInputTooLarge();
    const data = await resp.json();
    if (!resp.ok || !data?.objectPath) {
      throw new Error(data?.error || `${kind} upload failed (${resp.status})`);
    }
    return { objectPath: data.objectPath, publicUrl: data.publicUrl };
  };

  /** Analyse a previously-uploaded image; returns its extracted metadata. */
  const analyzeImage = async (
    objectPath: string,
    locale?: string,
    assetId = crypto.randomUUID(),
  ): Promise<ImageMetadataSummary> => {
    const resp = await fetch('/api/media/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': crypto.randomUUID(),
        'x-media-id': assetId,
      },
      body: JSON.stringify({ objectPath, locale }),
    });
    if (resp.status === 413) throw new StoryInputTooLarge();
    const data = await resp.json();
    if (!resp.ok || !data?.metadata) {
      throw new MediaAnalysisError(isMediaAnalysisCode(data?.code) ? data.code : 'analysis_failed');
    }
    return data.metadata as ImageMetadataSummary;
  };

  return { uploadInput, analyzeImage };
}

export type { UploadResult };
