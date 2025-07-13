import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { authorService, storyService, chapterService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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
    const { storyId, newImageUrl, imageType, chapterNumber } = body;

    // Validate required fields
    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    if (!newImageUrl) {
      return NextResponse.json(
        { success: false, error: 'New image URL is required' },
        { status: 400 }
      );
    }

    if (!imageType) {
      return NextResponse.json(
        { success: false, error: 'Image type is required' },
        { status: 400 }
      );
    }

    // Validate image type
    if (!['chapter', 'cover', 'backcover', 'frontcover'].includes(imageType)) {
      return NextResponse.json(
        { success: false, error: 'Image type must be "chapter", "cover", "backcover", or "frontcover"' },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Validate image URL format
    if (!newImageUrl.startsWith('gs://') && !newImageUrl.startsWith('https://storage.googleapis.com/')) {
      return NextResponse.json(
        { success: false, error: 'Image URL must be a Google Cloud Storage URL' },
        { status: 400 }
      );
    }

    // Update the appropriate database table
    try {
      if (mappedImageType === 'chapter' && chapterNumber) {
        // Update chapter image in chapters table
        await chapterService.updateChapterImage(storyId, chapterNumber, newImageUrl);
        
        return NextResponse.json({
          success: true,
          message: `Chapter ${chapterNumber} image updated successfully`,
          storyId,
          chapterNumber,
          imageType: mappedImageType,
          newImageUrl
        });
        
      } else if (mappedImageType === 'cover') {
        // Update front cover in stories table
        await storyService.updateStory(storyId, { coverUri: newImageUrl });
        
        return NextResponse.json({
          success: true,
          message: 'Front cover image updated successfully',
          storyId,
          imageType: mappedImageType,
          newImageUrl
        });
        
      } else if (mappedImageType === 'backcover') {
        // Update back cover in stories table
        await storyService.updateStory(storyId, { backcoverUri: newImageUrl });
        
        return NextResponse.json({
          success: true,
          message: 'Back cover image updated successfully',
          storyId,
          imageType: mappedImageType,
          newImageUrl
        });
        
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid image type or missing chapter number' },
          { status: 400 }
        );
      }
      
    } catch (dbError) {
      console.error('Database update error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to update database' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in image replace API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
