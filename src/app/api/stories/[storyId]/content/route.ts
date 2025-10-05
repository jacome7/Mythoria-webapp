import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, storyCollaborators, chapters } from '@/db/schema';
import { eq, and, or, asc, max } from 'drizzle-orm';
import { authorService } from '@/db/services';

export async function GET(request: Request, context: { params: Promise<{ storyId: string }> }) {
  console.log('[Story Content API] GET request received');
  try {
    const { userId } = await auth();
    const { storyId } = await context.params;

    console.log('[Story Content API] Story ID:', storyId);
    console.log('[Story Content API] User ID:', userId); // Check if user has access to the story (owner or collaborator)
    let story;

    if (userId) {
      // If user is authenticated, check ownership, collaboration, or public access
      // Get the current user's author record
      const author = await authorService.getAuthorByClerkId(userId);
      if (!author) {
        console.log('[Story Content API] Author not found');
        return NextResponse.json({ error: 'Author not found' }, { status: 404 });
      }

      story = await db
        .select({
          storyId: stories.storyId,
          authorId: stories.authorId,
          title: stories.title,
          isPublic: stories.isPublic,
        })
        .from(stories)
        .leftJoin(storyCollaborators, eq(storyCollaborators.storyId, stories.storyId))
        .where(
          and(
            eq(stories.storyId, storyId),
            or(
              // User is the author
              eq(stories.authorId, author.authorId),
              // User is a collaborator
              and(
                eq(storyCollaborators.userId, author.authorId),
                or(eq(storyCollaborators.role, 'editor'), eq(storyCollaborators.role, 'viewer')),
              ),
              // Story is public
              eq(stories.isPublic, true),
            ),
          ),
        )
        .limit(1);
    } else {
      // If not authenticated, only allow public stories
      story = await db
        .select({
          storyId: stories.storyId,
          authorId: stories.authorId,
          title: stories.title,
          isPublic: stories.isPublic,
        })
        .from(stories)
        .where(and(eq(stories.storyId, storyId), eq(stories.isPublic, true)))
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
      isPublic: storyData.isPublic,
    });

    // Compose HTML content from the latest version of each chapter
    // Subquery to get latest version per chapter
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
          eq(chapters.version, latestVersionsSubquery.latestVersion),
        ),
      )
      .where(eq(chapters.storyId, storyData.storyId))
      .orderBy(asc(chapters.chapterNumber));

    if (!chapterRows.length) {
      return NextResponse.json({ error: 'No chapters found for this story' }, { status: 404 });
    }

    const body = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${storyData.title}</title></head><body>${chapterRows
      .map(
        (c) =>
          `<article data-chapter="${c.chapterNumber}"><h2>Chapter ${c.chapterNumber}: ${c.title}</h2>${c.htmlContent}</article>`,
      )
      .join('')}</body></html>`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[Story Content API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch story content' }, { status: 500 });
  }
}
