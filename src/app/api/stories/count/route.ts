import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { db } from '@/db';
import { stories } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use COUNT(*) for author's stories (excluding maybe soft-deleted if implemented later)
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(stories)
      .where(eq(stories.authorId, author.authorId));
    const count = result[0]?.count || 0;
    return NextResponse.json({ count });
  } catch (e) {
    console.error('Error counting stories', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
