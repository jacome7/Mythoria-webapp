import { and, eq, gt, or, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { analyticsAttributions, analyticsOutbox } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const attributionId = request.cookies.get('mythoria_attribution')?.value;
  if (!attributionId) return NextResponse.json({ linked: false });

  try {
    const [attribution] = await db
      .select()
      .from(analyticsAttributions)
      .where(
        and(
          eq(analyticsAttributions.attributionId, attributionId),
          gt(analyticsAttributions.expiresAt, new Date()),
          or(
            isNull(analyticsAttributions.authorId),
            eq(analyticsAttributions.authorId, author.authorId),
          ),
        ),
      );
    if (!attribution) return NextResponse.json({ linked: false });

    await db.transaction(async (tx) => {
      await tx
        .update(analyticsAttributions)
        .set({ authorId: author.authorId, linkedAt: new Date() })
        .where(eq(analyticsAttributions.attributionId, attributionId));

      await tx
        .update(analyticsOutbox)
        .set({
          clientId: attribution.clientId,
          sessionId: attribution.sessionId,
          consent: attribution.consent,
          availableAt: new Date(),
          params: {
            method: 'unknown',
            ...(attribution.landingSlug ? { landing_slug: attribution.landingSlug } : {}),
            ...(attribution.primaryIntent ? { primary_intent: attribution.primaryIntent } : {}),
          },
        })
        .where(eq(analyticsOutbox.dedupeKey, `sign_up:${author.clerkUserId}`));
    });

    const response = NextResponse.json({ linked: true });
    response.cookies.delete('mythoria_attribution');
    return response;
  } catch (error) {
    console.error('Failed to link analytics attribution:', error);
    return NextResponse.json({ error: 'Attribution link failed' }, { status: 500 });
  }
}
