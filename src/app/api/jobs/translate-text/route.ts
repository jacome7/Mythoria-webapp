import { NextRequest, NextResponse } from 'next/server';
import { sgwFetch } from '@/lib/sgw-client';
import { chapterJobAccessError } from '@/lib/premium-children-book/chapter-job-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const error = await chapterJobAccessError(body?.storyId);
    if (error) return error;

    // Forward the request to the story-generation-workflow service
    const response = await sgwFetch('/api/jobs/translate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to create translation job' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying translation job request:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
