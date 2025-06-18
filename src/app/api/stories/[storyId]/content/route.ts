import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, authors, storyCollaborators } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ storyId: string }> }
) {
  console.log('[Story Content API] GET request received');
  try {
    const { userId } = await auth();
    const { storyId } = await context.params;
    
    console.log('[Story Content API] Story ID:', storyId);
    console.log('[Story Content API] User ID:', userId);    // Check if user has access to the story (owner or collaborator)
    let story;
    
    if (userId) {
      // If user is authenticated, check ownership, collaboration, or public access
      story = await db
        .select({
          storyId: stories.storyId,
          authorId: stories.authorId,
          title: stories.title,
          htmlUri: stories.htmlUri,
          isPublic: stories.isPublic,
        })
        .from(stories)
        .leftJoin(authors, eq(authors.authorId, stories.authorId))
        .leftJoin(storyCollaborators, eq(storyCollaborators.storyId, stories.storyId))
        .where(
          and(
            eq(stories.storyId, storyId),
            or(
              // User is the author
              eq(authors.clerkUserId, userId),
              // User is a collaborator
              and(
                eq(storyCollaborators.userId, stories.authorId),
                or(
                  eq(storyCollaborators.role, 'editor'),
                  eq(storyCollaborators.role, 'viewer')
                )
              ),
              // Story is public
              eq(stories.isPublic, true)
            )
          )
        )
        .limit(1);
    } else {
      // If not authenticated, only allow public stories
      story = await db
        .select({
          storyId: stories.storyId,
          authorId: stories.authorId,
          title: stories.title,
          htmlUri: stories.htmlUri,
          isPublic: stories.isPublic,
        })
        .from(stories)
        .where(
          and(
            eq(stories.storyId, storyId),
            eq(stories.isPublic, true)
          )
        )
        .limit(1);
    }

    if (!story.length) {
      console.log('[Story Content API] Story not found or access denied');
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    const storyData = story[0];
    console.log('[Story Content API] Story data:', { 
      storyId: storyData.storyId, 
      title: storyData.title, 
      hasHtmlUri: !!storyData.htmlUri,
      isPublic: storyData.isPublic 
    });

    if (!storyData.htmlUri) {
      console.log('[Story Content API] No HTML URI available');
      return NextResponse.json({ error: 'Story content not available' }, { status: 404 });
    }

    // Fetch the story content from Google Cloud Storage
    console.log('[Story Content API] Fetching content from:', storyData.htmlUri);
    const response = await fetch(storyData.htmlUri);
    
    if (!response.ok) {
      console.error('[Story Content API] Failed to fetch from GCS:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch story content' }, { status: 500 });
    }

    const htmlContent = await response.text();
    console.log('[Story Content API] Successfully fetched content, length:', htmlContent.length);

    // Return the HTML content with proper headers
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[Story Content API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story content' },
      { status: 500 }
    );
  }
}
