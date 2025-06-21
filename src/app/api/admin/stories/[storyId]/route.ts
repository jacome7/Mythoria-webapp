import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { storyService } from '@/db/services';
import { db } from '@/db';
import { stories, authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get story details
    const storyResult = await db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        authorName: authors.displayName,
        status: stories.status,
        isPublic: stories.isPublic,
        isFeatured: stories.isFeatured,
        featureImageUri: stories.featureImageUri,
        synopsis: stories.synopsis,
        novelStyle: stories.novelStyle,
        graphicalStyle: stories.graphicalStyle,
        htmlUri: stories.htmlUri,
        pdfUri: stories.pdfUri,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .innerJoin(authors, eq(stories.authorId, authors.authorId))
      .where(eq(stories.storyId, storyId));

    if (storyResult.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      story: storyResult[0] 
    });

  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    // Parse request body
    const body = await request.json();
    const { isFeatured, featureImageUri, isPublic } = body;

    // Validate that featured stories have a feature image
    if (isFeatured === true && (!featureImageUri || featureImageUri.trim() === '')) {
      return NextResponse.json(
        { error: 'Featured stories must have a feature image URI' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (typeof isFeatured === 'boolean') {
      updates.isFeatured = isFeatured;
      // If unfeaturing a story, clear the feature image
      if (!isFeatured) {
        updates.featureImageUri = null;
      }
    }
    if (typeof featureImageUri === 'string' || featureImageUri === null) {
      updates.featureImageUri = featureImageUri;
    }
    if (typeof isPublic === 'boolean') {
      updates.isPublic = isPublic;
    }

    // Update the story
    const updatedStory = await storyService.updateStory(storyId, updates);

    if (!updatedStory) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      story: updatedStory 
    });

  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    );
  }
}
