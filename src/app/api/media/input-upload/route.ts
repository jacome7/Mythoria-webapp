import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import { wizardMediaLogger, wizardMediaRequestId } from '@/lib/wizard-media-logging';

/**
 * POST /api/media/input-upload
 * Upload a story input image/audio immediately to GCS under the author's inputs
 * folder. Proxies to SGW POST /ai/media/upload, injecting the authenticated
 * author id. Images are normalised to JPEG (<=2048px, q95) server-side.
 * Body: { kind: 'image'|'audio', contentType: string, dataUrl: string }
 * Returns: { success, objectPath, publicUrl }
 */
export async function POST(request: NextRequest) {
  const requestId = wizardMediaRequestId(request.headers);
  const operation = 'upload';
  const assetId = wizardMediaRequestId(
    new Headers({ 'x-request-id': request.headers.get('x-media-id') || '' }),
  );
  const headers = { 'x-request-id': requestId };
  let stage = 'identity';
  const respond = (body: unknown, status: number) => {
    if (status >= 400) {
      wizardMediaLogger.warn('wizard_media_request_failed', {
        requestId,
        operation,
        stage,
        status,
      });
    }
    return NextResponse.json(body, { status, headers });
  };
  try {
    const author = await getCurrentAuthor();
    if (!author) return respond({ error: 'Unauthorized' }, 401);

    stage = 'validation';
    const body = await request.json().catch(() => null);
    const { kind, contentType, dataUrl } = body || {};
    if (
      (kind !== 'image' && kind !== 'audio') ||
      typeof contentType !== 'string' ||
      !contentType ||
      typeof dataUrl !== 'string' ||
      !dataUrl
    ) {
      return respond({ error: 'kind, contentType and dataUrl are required' }, 400);
    }

    stage = 'workflow_request';
    const resp = await sgwFetch('/ai/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers, 'x-media-id': assetId },
      body: JSON.stringify({ authorId: author.authorId, kind, contentType, dataUrl }),
    });
    if (!resp.ok) {
      stage = 'workflow_response';
      return respond({ error: 'Story media upload failed' }, resp.status);
    }
    stage = 'workflow_response';
    return respond(await resp.json(), resp.status);
  } catch {
    return respond({ error: 'Story media upload failed' }, 500);
  }
}
