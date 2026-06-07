import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/media/signed-upload
 * Author-scoped media upload proxy (back-compat shim — prefer
 * /api/media/input-upload). Proxies to SGW POST /ai/media/upload, injecting the
 * authenticated author id. Body: { kind: 'image'|'audio', contentType, dataUrl }.
 */
export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { contentType, kind, dataUrl } = body || {};
    if (!contentType || !kind || !dataUrl) {
      return NextResponse.json(
        { error: 'contentType, kind and dataUrl are required' },
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
