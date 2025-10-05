import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnvironmentConfig } from '@/config/environment';
import { authorService, aiEditService, storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { storyId, imageUrl, userRequest, imageType, chapterNumber } = body;

    // Validate required fields
    if (!storyId) {
      return NextResponse.json({ success: false, error: 'Story ID is required' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }

    if (!userRequest || typeof userRequest !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User request is required' },
        { status: 400 },
      );
    }

    if (userRequest.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Request must be 2000 characters or less' },
        { status: 400 },
      );
    }

    // Validate image type
    if (imageType && !['chapter', 'cover', 'backcover', 'frontcover'].includes(imageType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image type must be "chapter", "cover", "backcover", or "frontcover"',
        },
        { status: 400 },
      );
    }

    // Map frontend image types to backend image types
    let mappedImageType = imageType;
    if (imageType === 'frontcover') {
      mappedImageType = 'cover';
    }

    // Validate chapter number for chapter images
    if (mappedImageType === 'chapter' && (!chapterNumber || typeof chapterNumber !== 'number')) {
      return NextResponse.json(
        { success: false, error: 'Chapter number is required for chapter images' },
        { status: 400 },
      );
    }

    // Validate image URL format
    if (!imageUrl.startsWith('gs://') && !imageUrl.startsWith('https://storage.googleapis.com/')) {
      return NextResponse.json(
        { success: false, error: 'Image URL must be a Google Cloud Storage URL' },
        { status: 400 },
      );
    }

    // Get the story to retrieve graphical style
    const story = await storyService.getStoryById(storyId);
    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    // Get environment configuration
    const config = getEnvironmentConfig();
    const workflowUrl = config.storyGeneration.workflowUrl;

    // Determine the appropriate endpoint based on image type
    let endpoint: string;
    const method = 'PATCH';

    if (mappedImageType === 'cover') {
      endpoint = `${workflowUrl}/image-edit/stories/${storyId}/images/front-cover`;
    } else if (mappedImageType === 'backcover') {
      endpoint = `${workflowUrl}/image-edit/stories/${storyId}/images/back-cover`;
    } else if (mappedImageType === 'chapter' && chapterNumber) {
      endpoint = `${workflowUrl}/image-edit/stories/${storyId}/chapters/${chapterNumber}/image`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid image type or missing chapter number' },
        { status: 400 },
      );
    }

    // Prepare request body for the external API with required fields
    const workflowRequestBody = {
      userRequest: userRequest.trim(),
      originalImageUri: imageUrl,
      graphicalStyle: story.graphicalStyle || 'artistic',
    };

    console.log('Sending image edit request to external API:', {
      endpoint,
      userRequest: userRequest.trim(),
      originalImageUri: imageUrl,
      graphicalStyle: story.graphicalStyle || 'artistic',
    });

    // Make request to story generation workflow using new RESTful endpoint
    const workflowResponse = await sgwFetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowRequestBody),
    });

    const workflowData = await workflowResponse.json();

    // Handle successful response
    if (workflowResponse.ok && workflowData.success) {
      // Record the edit and deduct credits
      try {
        await aiEditService.recordSuccessfulEdit(author.authorId, storyId, 'imageEdit', {
          imageUrl,
          imageType: mappedImageType,
          chapterNumber: mappedImageType === 'chapter' ? chapterNumber : undefined,
          userRequest: userRequest.trim(),
          timestamp: new Date().toISOString(),
        });
        console.log('Successfully recorded image edit for author:', author.authorId);
      } catch (creditError) {
        console.error('Error recording edit or deducting credits:', creditError);
        // Note: We don't fail the request here since the edit was successful
      }

      // Return success response with new image URL for user approval
      // NOTE: Database is NOT updated here - that happens in /api/image-replace after user confirms
      return NextResponse.json({
        success: true,
        newImageUrl: workflowData.newImageUrl,
        imageType: workflowData.imageType,
        metadata: workflowData.metadata,
        storyId: workflowData.storyId,
      });
    } else {
      return NextResponse.json(workflowData, { status: workflowResponse.status });
    }
  } catch (error) {
    console.error('Error in image edit API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
