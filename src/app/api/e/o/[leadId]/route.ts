import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Open Tracking Pixel Route
 * GET /api/e/o/[leadId]
 *
 * Serves the Mythoria logo and tracks email opens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(leadId)) {
    console.warn('[OpenTracking] Invalid UUID format:', leadId);
    return new NextResponse('Invalid lead ID', { status: 400 });
  }

  // Record the open event (async, don't wait)
  leadService.recordOpen(leadId).catch((error) => {
    console.error('[OpenTracking] Failed to record open:', error);
  });

  try {
    // Serve the Mythoria logo from public directory
    const logoPath = path.join(process.cwd(), 'public', 'Mythoria-logo-white-512x336.jpg');
    const imageBuffer = await fs.readFile(logoPath);

    return new NextResponse(imageBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': imageBuffer.length.toString(),
        // Allow caching to reduce server load
        'Cache-Control': 'public, max-age=86400, immutable', // 24 hours
        // CORS headers for email clients
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('[OpenTracking] Error serving logo:', error);
    // Return 204 No Content as fallback
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
