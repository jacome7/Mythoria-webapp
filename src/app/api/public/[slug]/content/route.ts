import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  console.log('[Public Story Content API] GET request received');
  try {
    const { slug } = await context.params;
    console.log('[Public Story Content API] Slug:', slug);

    // Find the public story by slug
    const story = await db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        htmlUri: stories.htmlUri,
        isPublic: stories.isPublic,
      })
      .from(stories)
      .where(
        and(
          eq(stories.slug, slug),
          eq(stories.isPublic, true)
        )
      )
      .limit(1);

    if (!story.length) {
      console.log('[Public Story Content API] Public story not found');
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyData = story[0];
    console.log('[Public Story Content API] Story data:', { 
      storyId: storyData.storyId, 
      title: storyData.title, 
      hasHtmlUri: !!storyData.htmlUri,
      isPublic: storyData.isPublic 
    });

    if (!storyData.htmlUri) {
      console.log('[Public Story Content API] No HTML URI available');
      return NextResponse.json({ error: 'Story content not available' }, { status: 404 });
    }

    // Fetch the story content from Google Cloud Storage
    console.log('[Public Story Content API] Fetching content from:', storyData.htmlUri);
    const response = await fetch(storyData.htmlUri);
    
    if (!response.ok) {
      console.error('[Public Story Content API] Failed to fetch from GCS:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch story content' }, { status: 500 });
    }

    const htmlContent = await response.text();
    console.log('[Public Story Content API] Successfully fetched content, length:', htmlContent.length);

    // Return the HTML content with proper headers
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[Public Story Content API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story content' },
      { status: 500 }
    );
  }
}
