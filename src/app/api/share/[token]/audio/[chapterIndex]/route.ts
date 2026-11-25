import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { shareLinks, stories } from '@/db/schema';
import { premiumAudioResponse } from '@/lib/premium-children-book/audio-response';

const headers = { 'Cache-Control': 'private, no-store' };
const tokenSchema = z.uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; chapterIndex: string }> },
) {
  const { token, chapterIndex } = await params;
  const index = Number(chapterIndex);
  const missing = () => new Response(null, { status: 404, headers });
  if (
    !tokenSchema.safeParse(token).success ||
    !/^\d+$/.test(chapterIndex) ||
    !Number.isSafeInteger(index)
  ) {
    return missing();
  }

  try {
    if (!(await auth()).userId) return missing();
    const [link] = await db
      .select({
        status: stories.status,
        storyId: stories.storyId,
        features: stories.features,
        audiobookUri: stories.audiobookUri,
        expiresAt: shareLinks.expiresAt,
        revoked: shareLinks.revoked,
      })
      .from(shareLinks)
      .innerJoin(stories, eq(stories.storyId, shareLinks.storyId))
      .where(eq(shareLinks.id, token))
      .limit(1);
    if (!link || link.revoked || link.expiresAt <= new Date()) return missing();
    return await premiumAudioResponse(request, link, index);
  } catch (error) {
    console.error('Failed to load shared premium audiobook', error);
    return new Response(null, { status: 503, headers });
  }
}
