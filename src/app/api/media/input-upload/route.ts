import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { InvalidStoryInput, readStoryInput, saveStoryInput } from '@/lib/story-input-upload';
import { StoryInputTooLarge, storyInputMaxBytes } from '@/lib/story-input-size';
import { wizardMediaLogger, wizardMediaRequestId } from '@/lib/wizard-media-logging';

export async function POST(request: NextRequest) {
  const requestId = wizardMediaRequestId(request.headers);
  const assetId = wizardMediaRequestId(
    new Headers({ 'x-request-id': request.headers.get('x-media-id') || '' }),
  );
  const headers = { 'x-request-id': requestId };
  let stage = 'identity';
  const respond = (body: unknown, status: number) => {
    if (status >= 400) {
      wizardMediaLogger.warn('wizard_media_request_failed', {
        requestId,
        operation: 'upload',
        stage,
        status,
      });
    }
    return NextResponse.json(body, { status, headers });
  };
  try {
    const author = await getCurrentAuthor();
    if (!author) return respond({ error: 'Unauthorized' }, 401);
    stage = 'validation';
    const input = await readStoryInput(request);
    stage = 'storage';
    return respond(await saveStoryInput(author.authorId, assetId, input), 200);
  } catch (error) {
    if (error instanceof StoryInputTooLarge)
      return respond(
        { error: 'File too large', code: 'file_too_large', maxBytes: storyInputMaxBytes },
        413,
      );
    if (error instanceof InvalidStoryInput) return respond({ error: 'Invalid media upload' }, 400);
    return respond({ error: 'Story media upload failed' }, stage === 'storage' ? 502 : 500);
  }
}
