import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import {
  isMediaAnalysisCode,
  mediaRecovery,
  type MediaAnalysisCode,
} from '@/lib/media-analysis-errors';
import { wizardMediaLogger, wizardMediaRequestId } from '@/lib/wizard-media-logging';

/**
 * POST /api/media/analyze-image
 * Analyse a previously-uploaded input image and persist its metadata in GCS.
 * Proxies to SGW POST /ai/media/analyze-image. Verifies the object path belongs
 * to the authenticated author to prevent cross-author access.
 * Body: { objectPath: string, locale?: string }
 * Returns: { success, objectPath, metadata }
 */
export async function POST(request: NextRequest) {
  const requestId = wizardMediaRequestId(request.headers);
  const operation = 'analysis';
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
    if (!author)
      return respond({ error: 'Unauthorized', code: 'unauthorized', recovery: 'sign_in' }, 401);

    stage = 'validation';
    const body = await request.json().catch(() => null);
    const { objectPath, locale } = body || {};
    if (!objectPath || typeof objectPath !== 'string') {
      return respond({ error: 'objectPath is required' }, 400);
    }

    // Inputs live under `{authorId}/inputs/...`; ensure the caller owns this path.
    if (!objectPath.startsWith(`${author.authorId}/`)) {
      return respond({ error: 'Access denied' }, 403);
    }

    stage = 'workflow_request';
    const resp = await sgwFetch('/ai/media/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers, 'x-media-id': assetId },
      body: JSON.stringify({ objectPath, locale, authorId: author.authorId }),
    });
    if (!resp.ok) {
      stage = 'workflow_response';
      const data = await resp.json().catch(() => null);
      const code: MediaAnalysisCode = isMediaAnalysisCode(data?.code)
        ? data.code
        : resp.status === 401
          ? 'unauthorized'
          : resp.status === 504
            ? 'timeout'
            : resp.status === 429 || resp.status === 503
              ? 'provider_busy'
              : 'analysis_failed';
      return respond(
        { error: 'Story media analysis failed', code, recovery: mediaRecovery(code) },
        resp.status,
      );
    }
    stage = 'workflow_response';
    return respond(await resp.json(), resp.status);
  } catch {
    return respond(
      { error: 'Story media analysis failed', code: 'analysis_failed', recovery: 'retry' },
      500,
    );
  }
}
