import { after, NextRequest, NextResponse } from 'next/server';
import { notificationClient } from '@/lib/notifications/client';

const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipientRecordId: string }> },
) {
  const { recipientRecordId } = await params;
  if (UUID_PATTERN.test(recipientRecordId)) {
    after(async () => {
      try {
        await notificationClient.recordCampaignOpen(recipientRecordId);
      } catch {
        // Pixel delivery must remain successful even when engagement persistence is unavailable.
      }
    });
  }

  return new NextResponse(TRANSPARENT_GIF as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
