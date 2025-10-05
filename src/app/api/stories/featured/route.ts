import { NextResponse } from 'next/server';
import { storyService } from '@/db/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetAudience = searchParams.get('targetAudience');
    const graphicalStyle = searchParams.get('graphicalStyle');
    const storyLanguage = searchParams.get('storyLanguage');

    const featuredStories = await storyService.getFeaturedPublicStories({
      targetAudience: targetAudience || undefined,
      graphicalStyle: graphicalStyle || undefined,
      storyLanguage: storyLanguage || undefined,
    });

    return NextResponse.json({ stories: featuredStories });
  } catch (error) {
    console.error('Error fetching featured stories:', error);
    return NextResponse.json({ error: 'Failed to fetch featured stories' }, { status: 500 });
  }
}
