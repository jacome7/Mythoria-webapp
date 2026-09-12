import { NextRequest, NextResponse } from 'next/server';
import { storyService } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { linkReferralFromRequest } from '@/lib/referrals/http';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'count') {
    try {
      const totalStories = await storyService.getTotalStoriesCount();
      return NextResponse.json({ count: totalStories });
    } catch (error) {
      console.error('Error fetching total stories count:', error);
      return NextResponse.json({ error: 'Failed to fetch total stories count' }, { status: 500 });
    }
  }

  // Original functionality to get published stories
  try {
    const stories = await storyService.getPublishedStories();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await linkReferralFromRequest(request, author.authorId);
    const {
      title,
      plotDescription,
      storyLanguage,
      synopsis,
      customAuthor,
      dedicationMessage,
      status,
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Force newly created stories without real content to start as 'temporary' unless explicitly overridden.
    const initialStatus =
      status === 'draft' || status === 'writing' || status === 'published' ? status : 'temporary';

    const story = await storyService.createStory({
      title,
      authorId: author.authorId,
      plotDescription,
      storyLanguage,
      synopsis,
      customAuthor,
      dedicationMessage,
      status: initialStatus,
    });
    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}
