import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/media/analyze-image
 * Analyse a previously-uploaded input image and persist its metadata in GCS.
 * Proxies to SGW POST /ai/media/analyze-image. Verifies the object path belongs
 * to the authenticated author to prevent cross-author access.
 * Body: { objectPath: string, locale?: string }
 * Returns: { success, objectPath, metadata }
 */
export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { objectPath, locale } = body || {};
    if (!objectPath || typeof objectPath !== 'string') {
      return NextResponse.json({ error: 'objectPath is required' }, { status: 400 });
    }

    // Inputs live under `{authorId}/inputs/...`; ensure the caller owns this path.
    if (!objectPath.startsWith(`${author.authorId}/`)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const resp = await sgwFetch('/ai/media/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectPath, locale, authorId: author.authorId }),
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
