import { NextResponse } from 'next/server';
import { z } from 'zod';
import { targetAudienceEnum } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { bookTypeSchema, PremiumBookContractError } from '@/lib/premium-children-book/contract';
import {
  PremiumBookSelectionError,
  savePremiumBookSelection,
} from '@/lib/premium-children-book/selection';

const bodySchema = z.strictObject({
  bookType: bookTypeSchema,
  targetAudience: z.enum(targetAudienceEnum.enumValues).nullable(),
});

export async function PUT(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storyId } = await context.params;
    const result = bodySchema.safeParse(await request.json().catch(() => null));
    if (!result.success || !z.string().uuid().safeParse(storyId).success) {
      return NextResponse.json({ error: 'Invalid book format selection' }, { status: 400 });
    }
    const { bookType, targetAudience } = result.data;
    const story = await savePremiumBookSelection(
      storyId,
      author.authorId,
      bookType,
      targetAudience,
    );
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ bookType });
  } catch (error) {
    if (error instanceof PremiumBookSelectionError) {
      return NextResponse.json({ error: error.code }, { status: 422 });
    }
    if (error instanceof PremiumBookContractError) {
      return NextResponse.json({ error: 'invalid_book_format' }, { status: 422 });
    }
    return NextResponse.json({ error: 'Failed to save book format' }, { status: 500 });
  }
}
