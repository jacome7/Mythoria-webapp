import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { readEmailCampaignAttribution } from '@/lib/email-campaign-attribution';
import { notificationClient } from '@/lib/notifications/client';

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ linked: false }, { status: 401 });

  const recipientRecordId = readEmailCampaignAttribution(request);
  if (!recipientRecordId) return NextResponse.json({ linked: false, processed: true });

  const recipient = await notificationClient.resolveCampaignAttribution(recipientRecordId);
  if (!recipient?.clickedAt) return NextResponse.json({ linked: false }, { status: 503 });

  const clickedAt = new Date(recipient.clickedAt);
  const createdAt = new Date(author.createdAt);
  const eligible =
    recipient.recipientType === 'lead' &&
    recipient.email.trim().toLowerCase() === author.email.trim().toLowerCase() &&
    createdAt >= clickedAt &&
    createdAt.getTime() <= clickedAt.getTime() + ATTRIBUTION_WINDOW_MS;

  if (!eligible) return NextResponse.json({ linked: false, processed: true });

  const updated = await db
    .update(authors)
    .set({ acquisitionCampaignRecipientId: recipientRecordId })
    .where(
      and(eq(authors.authorId, author.authorId), isNull(authors.acquisitionCampaignRecipientId)),
    )
    .returning({ authorId: authors.authorId });

  return NextResponse.json({ linked: updated.length > 0, processed: true });
}
