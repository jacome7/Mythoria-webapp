import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, shareLinks, storyCollaborators, authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const { userId } = await auth();

    // Find the share link
    const shareLink = await db
      .select({
        id: shareLinks.id,
        storyId: shareLinks.storyId,
        accessLevel: shareLinks.accessLevel,
        expiresAt: shareLinks.expiresAt,
        revoked: shareLinks.revoked,
        story: {
          storyId: stories.storyId,
          title: stories.title,
          synopsis: stories.synopsis,
          htmlUri: stories.htmlUri,
          pdfUri: stories.pdfUri,
          audiobookUri: stories.audiobookUri,
          targetAudience: stories.targetAudience,
          graphicalStyle: stories.graphicalStyle,
          createdAt: stories.createdAt,
          authorId: stories.authorId,
        },
        author: {
          displayName: authors.displayName,
        }
      })
      .from(shareLinks)
      .leftJoin(stories, eq(stories.storyId, shareLinks.storyId))
      .leftJoin(authors, eq(authors.authorId, stories.authorId))
      .where(eq(shareLinks.id, token))
      .limit(1);

    if (!shareLink.length) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const link = shareLink[0];    // Check if link is expired or revoked
    if (link.revoked || new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired or been revoked' }, { status: 410 });
    }

    // Since the route is now protected by Clerk middleware, userId should always be present
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get current user's author ID
    const currentUser = await db
      .select()
      .from(authors)
      .where(eq(authors.clerkUserId, userId))
      .limit(1);

    if (!currentUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentAuthorId = currentUser[0].authorId;

    // If this is an edit link, add user as collaborator
    if (link.accessLevel === 'edit') {
      // Check if user is already a collaborator
      const existingCollaborator = await db
        .select()
        .from(storyCollaborators)
        .where(
          and(
            eq(storyCollaborators.storyId, link.storyId),
            eq(storyCollaborators.userId, currentAuthorId)
          )
        )
        .limit(1);

      if (!existingCollaborator.length) {
        // Add as editor collaborator
        await db
          .insert(storyCollaborators)
          .values({
            storyId: link.storyId,
            userId: currentAuthorId,
            role: 'editor',
          });
      }
    } else if (link.accessLevel === 'view') {
      // For view links, add as viewer if not already a collaborator
      const existingCollaborator = await db
        .select()
        .from(storyCollaborators)
        .where(
          and(
            eq(storyCollaborators.storyId, link.storyId),
            eq(storyCollaborators.userId, currentAuthorId)
          )
        )
        .limit(1);

      if (!existingCollaborator.length) {
        // Add as viewer collaborator
        await db
          .insert(storyCollaborators)
          .values({
            storyId: link.storyId,
            userId: currentAuthorId,
            role: 'viewer',
          });
      }
    }

    return NextResponse.json({
      success: true,
      story: link.story,
      author: link.author,
      accessLevel: link.accessLevel,
      redirectUrl: `/stories/${link.storyId}${link.accessLevel === 'edit' ? '?mode=edit' : ''}`
    });

  } catch (error) {
    console.error('Error accessing shared story:', error);
    return NextResponse.json(
      { error: 'Failed to access shared story' },
      { status: 500 }
    );
  }
}
