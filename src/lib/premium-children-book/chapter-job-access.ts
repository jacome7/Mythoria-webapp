import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorService } from '@/db/services';
import { AccessDeniedError, ensureStoryIdAccess } from '@/lib/authorization';
import { hasPremiumBookMarker } from './contract';

export async function chapterJobAccessError(storyId: unknown) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const id = z.string().uuid().safeParse(storyId);
  if (!id.success)
    return NextResponse.json({ success: false, error: 'Invalid story ID' }, { status: 400 });
  const author = await authorService.getAuthorByClerkId(userId);
  try {
    if (!author) throw new AccessDeniedError();
    const story = await ensureStoryIdAccess(id.data, author.authorId);
    if (hasPremiumBookMarker(story.features)) {
      return NextResponse.json(
        { success: false, error: 'incompatible_book_features' },
        { status: 422 },
      );
    }
    return null;
  } catch (error) {
    if (!(error instanceof AccessDeniedError)) throw error;
    return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
  }
}
