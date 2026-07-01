import { NextRequest, NextResponse } from 'next/server';

import { fiscalDocumentService } from '@/db/services';

export const runtime = 'nodejs';

interface RetryRequestBody {
  adminEmail?: string | null;
  source?: string | null;
}

function documentPayload(document: NonNullable<Awaited<ReturnType<typeof fiscalDocumentService.retryByFiscalDocumentId>>['document']>) {
  return {
    id: document.id,
    orderId: document.orderId,
    status: document.status,
    docType: document.docType,
    docSeries: document.docSeries,
    docNum: document.docNum,
    fullDocNumber: document.fullDocNumber,
    pdfStoragePath: document.pdfStoragePath,
    lastError: document.lastError,
    nextRetryAt: document.nextRetryAt?.toISOString() || null,
    issuedAt: document.issuedAt?.toISOString() || null,
    updatedAt: document.updatedAt.toISOString(),
  };
}

async function parseBody(request: NextRequest): Promise<RetryRequestBody> {
  const rawBody = await request.text();
  if (!rawBody.trim()) return {};

  const parsed = JSON.parse(rawBody) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object');
  }

  const body = parsed as Record<string, unknown>;
  return {
    adminEmail: typeof body.adminEmail === 'string' ? body.adminEmail : null,
    source: typeof body.source === 'string' ? body.source : null,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const expectedApiKey = process.env.ADMIN_API_KEY;
  if (!expectedApiKey) {
    return NextResponse.json({ error: 'ADMIN_API_KEY is not configured' }, { status: 500 });
  }

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RetryRequestBody;
  try {
    body = await parseBody(request);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Fiscal document id is required' }, { status: 400 });
    }

    const result = await fiscalDocumentService.retryByFiscalDocumentId(id, {
      adminEmail: body.adminEmail || null,
      source: body.source || null,
    });

    if (result.outcome === 'not_found') {
      return NextResponse.json({ error: 'Fiscal document not found' }, { status: 404 });
    }

    if (result.outcome === 'not_retryable') {
      return NextResponse.json(
        {
          error: 'Fiscal document is not retryable',
          reason: result.reason,
          orderStatus: result.orderStatus,
          document: result.document ? documentPayload(result.document) : null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: result.document?.status === 'issued',
      outcome: result.outcome,
      orderStatus: result.orderStatus,
      document: result.document ? documentPayload(result.document) : null,
    });
  } catch (error) {
    console.error('Admin fiscal document retry failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry fiscal document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
