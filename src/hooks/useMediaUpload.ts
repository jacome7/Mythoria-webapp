'use client';

interface UploadResult {
  objectPath: string;
  dataUrl: string;
}

export function useMediaUpload() {
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

  const uploadMedia = async (
    storyId: string,
    kind: 'image' | 'audio',
    file: File,
  ): Promise<UploadResult> => {
    const contentType = file.type || (kind === 'image' ? 'image/jpeg' : 'audio/wav');
    const dataUrl = await fileToDataUrl(file);
    const resp = await fetch('/api/media/signed-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, kind, contentType, filename: file.name, dataUrl }),
    });
    const uploaded = await resp.json();
    if (!resp.ok || !uploaded?.objectPath) {
      throw new Error(`${kind} upload failed: ${resp.status}`);
    }
    return { objectPath: uploaded.objectPath, dataUrl };
  };

  return { uploadMedia };
}

export type { UploadResult };
