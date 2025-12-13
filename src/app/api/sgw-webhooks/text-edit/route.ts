import { NextRequest, NextResponse } from 'next/server';
import { chapterService, aiEditService } from '@/db/services';

interface WebhookPayload {
  jobId: string;
  scope: 'chapter' | 'story';
  storyId: string;
  chapterNumber?: number;
  result: any;
}

const SECRET = process.env.SGW_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!SECRET) {
      return NextResponse.json(
        { success: false, error: 'Webhook not configured' },
        { status: 500 },
      );
    }

    const signature = request.headers.get('x-sgw-signature');
    if (!signature || signature !== SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as WebhookPayload;
    const { scope, storyId, chapterNumber, result } = body;

    console.info('[webhook:text-edit] received', {
      scope,
      storyId,
      chapterNumber,
      hasResult: !!result,
      updatedChapters: Array.isArray(result?.updatedChapters) ? result.updatedChapters.length : 0,
    });

    if (!storyId || !result) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    if (scope === 'story' && Array.isArray(result.updatedChapters)) {
      const updatedChapters: Array<{ chapterNumber: number; success: boolean; error?: string }> =
        [];

      for (const chapter of result.updatedChapters) {
        try {
          if (chapter.updatedHtml && !chapter.error) {
            await chapterService.updateChapterContent(
              storyId,
              chapter.chapterNumber,
              chapter.updatedHtml,
            );

            if (result.authorId) {
              await aiEditService.recordSuccessfulEdit(result.authorId, storyId, 'textEdit', {
                chapterNumber: chapter.chapterNumber,
                userRequest: result.userRequest,
                timestamp: new Date().toISOString(),
                originalLength: chapter.originalLength,
                editedLength: chapter.editedLength,
              });
            }

            updatedChapters.push({ chapterNumber: chapter.chapterNumber, success: true });
          } else {
            updatedChapters.push({
              chapterNumber: chapter.chapterNumber,
              success: false,
              error: chapter.error || 'Missing updatedHtml',
            });
          }
        } catch (error) {
          console.error(`Error persisting chapter ${chapter.chapterNumber} from webhook:`, error);
          updatedChapters.push({
            chapterNumber: chapter.chapterNumber,
            success: false,
            error: 'Failed to save chapter',
          });
        }
      }

      return NextResponse.json({
        success: true,
        scope: 'story',
        updatedChapters,
        totalChapters: result.totalChapters || updatedChapters.length,
        successfulEdits: updatedChapters.filter((ch) => ch.success).length,
        failedEdits: updatedChapters.filter((ch) => !ch.success).length,
        tokensUsed: result.tokensUsed || 0,
        timestamp: new Date().toISOString(),
      });
    }

    if (scope === 'chapter' && result.updatedHtml && chapterNumber) {
      try {
        await chapterService.updateChapterContent(storyId, chapterNumber, result.updatedHtml);

        if (result.authorId) {
          await aiEditService.recordSuccessfulEdit(result.authorId, storyId, 'textEdit', {
            chapterNumber,
            userRequest: result.userRequest,
            timestamp: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          success: true,
          scope: 'chapter',
          updatedHtml: result.updatedHtml,
          chapterNumber,
          tokensUsed: result.tokensUsed || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error persisting chapter from webhook:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to save chapter content' },
          { status: 500 },
        );
      }
    }

    console.warn('[webhook:text-edit] unsupported payload', { scope, storyId, chapterNumber });
    return NextResponse.json({ success: false, error: 'Unsupported payload' }, { status: 400 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
