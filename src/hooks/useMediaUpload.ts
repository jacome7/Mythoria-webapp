'use client';

import type { ImageMetadataSummary } from '@/hooks/useStep2Session';

interface UploadResult {
  objectPath: string;
  publicUrl: string;
}

export function useMediaUpload() {
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

  /** Upload an input image/audio to GCS (author-scoped). Returns its object path. */
  const uploadInput = async (kind: 'image' | 'audio', file: File): Promise<UploadResult> => {
    const contentType = file.type || (kind === 'image' ? 'image/jpeg' : 'audio/wav');
    const dataUrl = await fileToDataUrl(file);
    const resp = await fetch('/api/media/input-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, contentType, dataUrl }),
    });
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
  ): Promise<ImageMetadataSummary> => {
    const resp = await fetch('/api/media/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectPath, locale }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.metadata) {
      throw new Error(data?.error || `Image analysis failed (${resp.status})`);
    }
    return data.metadata as ImageMetadataSummary;
  };

  return { uploadInput, analyzeImage };
}

export type { UploadResult };
