export type MediaKind = 'image' | 'audio';

// Unified server-side upload proxy
export async function uploadMedia(params: { storyId: string; kind: MediaKind; contentType: string; filename?: string; dataUrl: string }): Promise<{ success: boolean; storyId: string; kind: MediaKind; objectPath: string; publicUrl: string }> {
  const resp = await fetch('/api/media/signed-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!resp.ok) throw new Error(`Failed to upload media: ${resp.status}`);
  return resp.json() as Promise<{ success: boolean; storyId: string; kind: MediaKind; objectPath: string; publicUrl: string }>;
}
