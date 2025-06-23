import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnvironmentConfig } from '../../../../config/environment';
import { authorService, aiEditService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user
    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storyId, imageUrl, userRequest } = body;

    // Validate required fields
    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (!userRequest || typeof userRequest !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User request is required' },
        { status: 400 }
      );
    }

    if (userRequest.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Request must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Validate image URL format
    if (!imageUrl.startsWith('gs://') && !imageUrl.startsWith('https://storage.googleapis.com/')) {
      return NextResponse.json(
        { success: false, error: 'Image URL must be a Google Cloud Storage URL' },
        { status: 400 }
      );
    }

    // Get environment configuration
    const config = getEnvironmentConfig();
    const workflowUrl = config.storyGeneration.workflowUrl;

    // Prepare request body for story generation workflow
    const workflowRequestBody = {
      storyId,
      imageUrl,
      userRequest: userRequest.trim()
    };

    // Make request to story generation workflow image-edit endpoint
    const workflowResponse = await fetch(`${workflowUrl}/image-edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowRequestBody),
    });

    const workflowData = await workflowResponse.json();    // Return the response from the workflow service
    if (workflowResponse.ok) {
      // Only record the edit and deduct credits if the workflow was successful
      try {
        await aiEditService.recordSuccessfulEdit(
          author.authorId,
          storyId,
          'imageEdit',
          {
            imageUrl,
            userRequest: workflowRequestBody.userRequest,
            timestamp: new Date().toISOString()
          }
        );
        console.log('Successfully recorded image edit for author:', author.authorId);
      } catch (creditError) {
        console.error('Error recording edit or deducting credits:', creditError);
        // Note: We don't fail the request here since the edit was successful
        // This ensures the user gets their edit even if credit recording fails
      }
      
      return NextResponse.json(workflowData);
    } else {
      return NextResponse.json(
        workflowData,
        { status: workflowResponse.status }
      );
    }

  } catch (error) {
    console.error('Error in image edit API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
