import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sgwFetch } from '@/lib/sgw-client';
import { authorService, aiEditService } from '@/db/services';
import { setPendingImageJob } from '../image-edit-store';

// (Store moved to ../image-edit-store to avoid exporting non-route values from route module.)

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

  const body = await request.json();
  const { storyId, imageType, chapterNumber, userRequest, imageUrl, userImageUri, convertToStyle } = body || {};

    if (!storyId) {
      return NextResponse.json({ success: false, error: 'Story ID is required' }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }
    // A userRequest (prompt) is normally required for standard edits. For style conversion
    // using a supplied user image (reference), we allow an empty prompt and inject a
    // lightweight default so downstream services still receive a non-empty string.
    let effectiveUserRequest = (typeof userRequest === 'string' ? userRequest : '').trim();
    const isStyleConversion = !!convertToStyle && !!userImageUri;
    if (!effectiveUserRequest && isStyleConversion) {
      effectiveUserRequest = 'Style conversion';
      body.userRequest = effectiveUserRequest; // mutate forwarded payload
    }
    if (!effectiveUserRequest) {
      return NextResponse.json({ success: false, error: 'User request is required' }, { status: 400 });
    }

    // Permission / credit pre-check (do NOT deduct here)
    const permission = await aiEditService.checkEditPermission(author.authorId, 'imageEdit');
    if (!permission.canEdit) {
      return NextResponse.json({
        success: false,
        error: permission.message || 'Insufficient credits',
        requiredCredits: permission.requiredCredits,
        currentBalance: permission.currentBalance
      }, { status: 402 }); // 402 Payment Required semantic
    }

    // Forward to workflow service
    const response = await sgwFetch('/api/jobs/image-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok || !data?.success || !data?.jobId) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to create image edit job' },
        { status: response.status }
      );
    }

    // Stash minimal metadata for completion handling in status route (Option A implementation)
    setPendingImageJob(data.jobId, {
      authorId: author.authorId,
      storyId,
      imageType,
      chapterNumber,
      userRequest: effectiveUserRequest,
      createdAt: Date.now()
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying image edit job request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// No additional exports – only the POST handler as required by Next.js.
