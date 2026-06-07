import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/media/input-upload
 * Upload a story input image/audio immediately to GCS under the author's inputs
 * folder. Proxies to SGW POST /ai/media/upload, injecting the authenticated
 * author id. Images are normalised to JPEG (<=2048px, q95) server-side.
 * Body: { kind: 'image'|'audio', contentType: string, dataUrl: string }
 * Returns: { success, objectPath, publicUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { kind, contentType, dataUrl } = body || {};
    if (!kind || !contentType || !dataUrl) {
      return NextResponse.json(
        { error: 'kind, contentType and dataUrl are required' },
        { status: 400 },
      );
    }

    const resp = await sgwFetch('/ai/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId: author.authorId, kind, contentType, dataUrl }),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
