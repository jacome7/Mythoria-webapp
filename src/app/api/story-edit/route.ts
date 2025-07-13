import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnvironmentConfig } from '../../../../config/environment';
import { authorService, aiEditService, chapterService } from '@/db/services';

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
    const { storyId, chapterNumber, userRequest, scope } = body;

    // Validate required fields
    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
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

    // Validate scope if provided
    if (scope && !['chapter', 'story'].includes(scope)) {
      return NextResponse.json(
        { success: false, error: 'Scope must be "chapter" or "story"' },
        { status: 400 }
      );
    }

    // Get environment configuration
    const config = getEnvironmentConfig();
    const workflowUrl = config.storyGeneration.workflowUrl;    // Determine the appropriate endpoint based on scope
    let endpoint: string;
    const method = 'PATCH';
    
    if (scope === 'story' || (!chapterNumber && !scope)) {
      // Edit entire story
      endpoint = `${workflowUrl}/story-edit/stories/${storyId}/chapters`;
    } else {
      // Edit specific chapter
      endpoint = `${workflowUrl}/story-edit/stories/${storyId}/chapters/${chapterNumber}`;
    }

    // Prepare request body for the new RESTful API
    const workflowRequestBody = {
      userRequest: userRequest.trim()
    };

    // Make request to story generation workflow using new RESTful endpoint
    const workflowResponse = await fetch(endpoint, {
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
        await aiEditService.recordSuccessfulEdit(
          author.authorId,
          storyId,
          'textEdit',
          {
            chapterNumber: chapterNumber,
            userRequest: userRequest.trim(),
            timestamp: new Date().toISOString()
          }
        );
        console.log('Successfully recorded text edit for author:', author.authorId);
      } catch (creditError) {
        console.error('Error recording edit or deducting credits:', creditError);
        // Note: We don't fail the request here since the edit was successful
      }

      // Update database with new content
      try {
        if (scope === 'story' || (!chapterNumber && !scope)) {
          // Update all chapters
          if (workflowData.editedChapters && Array.isArray(workflowData.editedChapters)) {
            for (const chapter of workflowData.editedChapters) {
              if (chapter.editedContent && !chapter.error) {
                await chapterService.updateChapterContent(
                  storyId, 
                  chapter.chapterNumber, 
                  chapter.editedContent
                );
              }
            }
          }
        } else {
          // Update single chapter
          if (workflowData.editedContent) {
            await chapterService.updateChapterContent(
              storyId, 
              chapterNumber, 
              workflowData.editedContent
            );
          }
        }

        // Return success response with updated content information
        return NextResponse.json({
          success: true,
          updatedHtml: workflowData.editedContent || 'Content updated successfully',
          tokensUsed: workflowData.metadata?.tokensUsed || 0,
          chaptersUpdated: workflowData.editedChapters?.length || 1
        });

      } catch (dbError) {
        console.error('Error updating database:', dbError);
        return NextResponse.json(
          { success: false, error: 'Content generated but failed to save to database' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        workflowData,
        { status: workflowResponse.status }
      );
    }

  } catch (error) {
    console.error('Error in story edit API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
