import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stories, authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  console.log('[Public API] GET request received');
  try {
    const { slug } = await context.params;
    console.log('[Public API] Looking for slug:', slug);

    // Find the public story by slug
    const story = await db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        synopsis: stories.synopsis,
        audiobookUri: stories.audiobookUri,
        targetAudience: stories.targetAudience,
        graphicalStyle: stories.graphicalStyle,
        novelStyle: stories.novelStyle,
        plotDescription: stories.plotDescription,
        createdAt: stories.createdAt,
        isPublic: stories.isPublic,
        author: {
          displayName: authors.displayName,
        }
      })
      .from(stories)
      .leftJoin(authors, eq(authors.authorId, stories.authorId))
      .where(
        and(
          eq(stories.slug, slug),
          eq(stories.isPublic, true)
        )
      )
      .limit(1);

    console.log('[Public API] Query result:', story);
    if (!story.length) {
      console.log('[Public API] No story found for slug:', slug);
      return NextResponse.json({ error: 'Public story not found' }, { status: 404 });
    }

    const storyData = story[0];
    console.log('[Public API] Returning story data:', storyData);

    return NextResponse.json({
      success: true,
      story: storyData,
      accessLevel: 'public'
    });

  } catch (error) {
    console.error('Error accessing public story:', error);
    return NextResponse.json(
      { error: 'Failed to access public story' },
      { status: 500 }
    );
  }
}
