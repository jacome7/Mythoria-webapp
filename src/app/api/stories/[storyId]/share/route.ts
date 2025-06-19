import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, shareLinks, storyCollaborators, authors } from '@/db/schema';
import { eq, and, or, gt } from 'drizzle-orm';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';

export async function POST(
  request: Request,
  context: { params: Promise<{ storyId: string }> }
) {
  console.log('[Share API] POST request received');
  try {
    const { userId } = await auth();
    console.log('[Share API] User ID:', userId);
    if (!userId) {
      console.log('[Share API] No user ID, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await context.params;
    console.log('[Share API] Story ID:', storyId);
    
    const body = await request.json();
    console.log('[Share API] Request body:', body);
    const { allowEdit, makePublic, expiresInDays = 30 } = body;    // Check if user owns the story or is a collaborator with edit permissions
    console.log('[Share API] Checking story ownership...');
    const story = await db
      .select({
        storyId: stories.storyId,
        authorId: stories.authorId,
        title: stories.title,
        isPublic: stories.isPublic,
        slug: stories.slug,
      })
      .from(stories)
      .leftJoin(authors, eq(authors.authorId, stories.authorId))
      .leftJoin(storyCollaborators, eq(storyCollaborators.storyId, stories.storyId))
      .where(
        and(
          eq(stories.storyId, storyId),
          or(
            eq(authors.clerkUserId, userId),
            and(
              eq(storyCollaborators.userId, stories.authorId),
              eq(storyCollaborators.role, 'editor')
            )
          )
        )
      )
      .limit(1);

    console.log('[Share API] Story query result:', story);
    if (!story.length) {
      console.log('[Share API] Story not found or access denied');
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    const storyData = story[0];
    console.log('[Share API] Story data:', storyData);

    // Handle public sharing
    if (makePublic) {
      let slug = storyData.slug;
        // Generate slug if it doesn't exist
      if (!slug) {
        const baseSlug = generateSlug(storyData.title);
        
        // Ensure slug is unique
        slug = await ensureUniqueSlug(baseSlug, async (testSlug) => {
          const existingSlug = await db
            .select()
            .from(stories)
            .where(eq(stories.slug, testSlug))
            .limit(1);
          return existingSlug.length > 0;
        });
      }

      // Update story to be public
      await db
        .update(stories)        .set({ 
          isPublic: true, 
          slug,
          updatedAt: new Date()
        })
        .where(eq(stories.storyId, storyId));

      return NextResponse.json({
        success: true,
        linkType: 'public',
        url: `/p/${slug}`,
        message: 'Story is now publicly accessible'
      });
    }    // Handle private sharing
    const accessLevel = allowEdit ? 'edit' : 'view';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);    const shareLink = await db
      .insert(shareLinks)
      .values({
        storyId,
        accessLevel,
        expiresAt: expiresAt,
        revoked: false,
      })
      .returning();

    const shareToken = shareLink[0].id;
    const shareUrl = allowEdit ? `/s/${shareToken}/edit` : `/s/${shareToken}`;    return NextResponse.json({
      success: true,
      linkType: 'private',
      url: shareUrl,
      token: shareToken,
      accessLevel,
      expiresAt: expiresAt.toISOString(),
      message: `Private ${accessLevel} link created`
    });

  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ storyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await context.params;

    // Get all active share links for this story
    const links = await db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.storyId, storyId),
          eq(shareLinks.revoked, false),
          gt(shareLinks.expiresAt, new Date())
        )
      )
      .orderBy(shareLinks.createdAt);

    return NextResponse.json({
      success: true,
      shareLinks: links
    });

  } catch (error) {
    console.error('Error fetching share links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ storyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const revokeAll = searchParams.get('revokeAll') === 'true';

    if (revokeAll) {      // Revoke all share links for this story
      await db
        .update(shareLinks)
        .set({ 
          revoked: true,
          updatedAt: new Date()
        })
        .where(eq(shareLinks.storyId, storyId));

      return NextResponse.json({
        success: true,
        message: 'All share links revoked'
      });
    }

    if (linkId) {      // Revoke specific share link
      await db
        .update(shareLinks)
        .set({ 
          revoked: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(shareLinks.id, linkId),
            eq(shareLinks.storyId, storyId)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'Share link revoked'
      });
    }

    return NextResponse.json(
      { error: 'Missing linkId or revokeAll parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error revoking share link:', error);    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
