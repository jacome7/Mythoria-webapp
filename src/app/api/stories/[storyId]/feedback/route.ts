import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

const SUBJECT_MIN = 3;
const SUBJECT_MAX = 80;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 800;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const author = await getCurrentAuthor();
  if (!author) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { storyId } = await params;
  if (!storyId) {
    return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
  }

  let body: { subject?: string; message?: string } = {};
  try {
    body = (await request.json()) as { subject?: string; message?: string };
  } catch {
    body = {};
  }

  const subject = (body.subject || '').trim();
  const message = (body.message || '').trim();

  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return NextResponse.json(
      { error: `Subject must be between ${SUBJECT_MIN} and ${SUBJECT_MAX} characters.` },
      { status: 400 },
    );
  }

  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.` },
      { status: 400 },
    );
  }

  if (!author.email) {
    return NextResponse.json(
      { error: 'We could not find your account email. Update your profile and try again.' },
      { status: 400 },
    );
  }

  const story = await storyService.getStoryById(storyId);
  if (!story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  if (!story.isPublic && story.authorId !== author.authorId) {
    return NextResponse.json({ error: 'You do not have access to this story.' }, { status: 403 });
  }

  try {
    const response = await sgwFetch('/api/story-feedback', {
      method: 'POST',
      body: JSON.stringify({
        storyId,
        subject,
        message,
        senderAuthorId: author.authorId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || 'Failed to send feedback.' },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send feedback.' },
      { status: 500 },
    );
  }
}