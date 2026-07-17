import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { sanitizeClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import { startStoryGeneration } from '@/lib/story-generation';
import { and, eq, gt } from 'drizzle-orm';

const completeStorySchema = z.object({
  storyId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  features: z.object({
    ebook: z.boolean(),
    printed: z.boolean(),
    audiobook: z.boolean(),
  }),
  deliveryAddress: z.record(z.string(), z.unknown()).nullable().optional(),
  dedicationMessage: z.string().max(2000).nullable().optional(),
  customAuthor: z.string().max(255).nullable().optional(),
  analyticsContext: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const input = completeStorySchema.parse(await request.json());
    const analyticsContext = sanitizeClientAnalyticsContext(input.analyticsContext);
    const attributionCookie = request.cookies.get('mythoria_attribution')?.value;
    let attributionId: string | undefined;
    if (attributionCookie) {
      const [attribution] = await db
        .select({ attributionId: analyticsAttributions.attributionId })
        .from(analyticsAttributions)
        .where(
          and(
            eq(analyticsAttributions.attributionId, attributionCookie),
            gt(analyticsAttributions.expiresAt, new Date()),
          ),
        );
      attributionId = attribution?.attributionId;
    }

    const result = await startStoryGeneration({
      authorId: author.authorId,
      clerkUserId: author.clerkUserId,
      storyId: input.storyId,
      idempotencyKey: input.idempotencyKey,
      features: input.features,
      deliveryAddress: input.deliveryAddress,
      dedicationMessage: input.dedicationMessage,
      customAuthor: input.customAuthor,
      attributionId,
      analyticsContext,
    });

    return NextResponse.json(
      { message: 'Story generation queued successfully', ...result },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'Story not found') {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 409 });
    }
    console.error('Error completing story:', error);
    return NextResponse.json({ error: 'Failed to complete story' }, { status: 500 });
  }
}
