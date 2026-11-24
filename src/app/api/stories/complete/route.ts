import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import { startStoryGeneration } from '@/lib/story-generation';
import { resolveAdContextSafely } from '@/lib/openai-ads/context';
import { adEventId } from '@/lib/openai-ads/events';
import { bookTypeSchema, PremiumBookContractError } from '@/lib/premium-children-book/contract';
import { PremiumBookSelectionError } from '@/lib/premium-children-book/selection';

const completeStorySchema = z.object({
  storyId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  expectedBookType: bookTypeSchema.optional(),
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

    const body = await request.json().catch(() => null);
    const parsed = completeStorySchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.flatMap((issue) => {
        const [field, feature] = issue.path;
        if (field === 'dedicationMessage' || field === 'customAuthor') {
          return [{ field, code: issue.code === 'too_big' ? 'too_long' : 'invalid' }];
        }
        if (
          field === 'storyId' ||
          field === 'idempotencyKey' ||
          field === 'deliveryAddress' ||
          field === 'expectedBookType'
        ) {
          return [{ field, code: 'invalid' }];
        }
        if (field === 'features') {
          const knownFeature =
            feature === 'ebook' || feature === 'printed' || feature === 'audiobook';
          return [{ field: knownFeature ? `features.${feature}` : field, code: 'invalid' }];
        }
        return [];
      });
      return NextResponse.json({ error: 'Invalid request data', details }, { status: 400 });
    }
    const input = parsed.data;
    const {
      context: analyticsContext,
      consent: analyticsConsent,
      attributionId,
      primaryIntent,
    } = await resolveServerAnalyticsContext({
      browserContext: input.analyticsContext,
      attributionId: request.cookies.get('mythoria_attribution')?.value,
      authorId: author.authorId,
      storedConsentValue: request.cookies.get('mythoria_consent')?.value,
    });
    if (!analyticsContext) {
      console.warn('[Analytics] Story completion has no consented GA4 context');
    }

    const adContext = await resolveAdContextSafely({
      headers: request.headers,
      cookies: request.cookies,
      authorId: author.authorId,
    });

    const result = await startStoryGeneration({
      authorId: author.authorId,
      clerkUserId: author.clerkUserId,
      storyId: input.storyId,
      idempotencyKey: input.idempotencyKey,
      features: input.features,
      expectedBookType: input.expectedBookType,
      deliveryAddress: input.deliveryAddress,
      dedicationMessage: input.dedicationMessage,
      customAuthor: input.customAuthor,
      attributionId,
      primaryIntent,
      analyticsContext,
      analyticsConsent,
      adContext,
    });

    return NextResponse.json(
      {
        message: 'Story generation queued successfully',
        ...result,
        adEventId: adEventId.storyLead(result.runId),
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof PremiumBookSelectionError) {
      return NextResponse.json({ error: error.code }, { status: 422 });
    }
    if (error instanceof PremiumBookContractError) {
      return NextResponse.json({ error: 'invalid_book_format' }, { status: 422 });
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
