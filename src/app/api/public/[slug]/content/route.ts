import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stories, chapters } from '@/db/schema';
import { eq, and, asc, max } from 'drizzle-orm';

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
      isPublic: storyData.isPublic 
    });

    // Build HTML from chapters
    const latestVersionsSubquery = db
      .select({
        storyId: chapters.storyId,
        chapterNumber: chapters.chapterNumber,
        latestVersion: max(chapters.version).as('latest_version'),
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyData.storyId))
      .groupBy(chapters.storyId, chapters.chapterNumber)
      .as('latest_versions');

    const chapterRows = await db
      .select({
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        htmlContent: chapters.htmlContent,
      })
      .from(chapters)
      .innerJoin(
        latestVersionsSubquery,
        and(
          eq(chapters.storyId, latestVersionsSubquery.storyId),
          eq(chapters.chapterNumber, latestVersionsSubquery.chapterNumber),
          eq(chapters.version, latestVersionsSubquery.latestVersion)
        )
      )
      .where(eq(chapters.storyId, storyData.storyId))
      .orderBy(asc(chapters.chapterNumber));

    if (!chapterRows.length) {
      return NextResponse.json({ error: 'No chapters found for this story' }, { status: 404 });
    }

    const body = `<!DOCTYPE html><html lang="en"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>${storyData.title}</title></head><body>${chapterRows
      .map((c) => `<article data-chapter=\"${c.chapterNumber}\"><h2>Chapter ${c.chapterNumber}: ${c.title}</h2>${c.htmlContent}</article>`)
      .join('')}</body></html>`;

    return new NextResponse(body, {
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
