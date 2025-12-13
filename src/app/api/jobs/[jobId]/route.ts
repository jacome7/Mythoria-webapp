import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sgwFetch } from '@/lib/sgw-client';
import { aiEditService, authorService, chapterService } from '@/db/services';
import { db } from '@/db';
import { getPendingImageJob, deletePendingImageJob } from '../image-edit-store';
import { aiEdits } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    // Forward the request to the story-generation-workflow service
    const response = await sgwFetch(`/api/jobs/${jobId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to get job status' },
        { status: response.status },
      );
    }

    // Persist completed text edits (full-story or single-chapter) and then record credits
    if (data?.success && data?.job?.status === 'completed' && data?.job?.type === 'text_edit') {
      try {
        // Auth is optional for persistence; without it we still save content but skip credit recording
        const { userId } = await auth();
        const author = userId ? await authorService.getAuthorByClerkId(userId) : null;

        const jobResult = (data.job?.result || {}) as {
          scope?: 'chapter' | 'story';
          type?: string;
          storyId?: string;
          chapterNumber?: number;
          editedContent?: string;
          updatedHtml?: string;
          updatedChapters?: Array<{
            chapterNumber: number;
            editedContent?: string;
            updatedHtml?: string;
            originalLength?: number;
            editedLength?: number;
            error?: string;
          }>;
          editedChapters?: Array<{
            chapterNumber: number;
            editedContent?: string;
            updatedHtml?: string;
            originalLength?: number;
            editedLength?: number;
            error?: string;
          }>;
          userRequest?: string;
        };

        const storyId = jobResult.storyId || data.job?.metadata?.storyId;
        const userRequest =
          jobResult.userRequest || (data.job?.metadata as { userRequest?: string })?.userRequest;

        // Infer scope if missing
        const inferredScope: 'story' | 'chapter' | undefined =
          jobResult.scope ||
          (Array.isArray(jobResult.editedChapters || jobResult.updatedChapters)
            ? 'story'
            : jobResult.chapterNumber
              ? 'chapter'
              : undefined);

        // Normalize chapters array
        const chaptersArray = jobResult.editedChapters || jobResult.updatedChapters;

        console.info('[job-status] text_edit completed', {
          jobId,
          inferredScope,
          storyId,
          chapterNumber: jobResult.chapterNumber,
          chaptersCount: Array.isArray(chaptersArray) ? chaptersArray.length : 0,
        });

        if (inferredScope === 'story' && storyId && Array.isArray(chaptersArray)) {
          const updatedChapters: Array<{ chapterNumber: number; success: boolean }> = [];

          for (const chapter of chaptersArray) {
            try {
              const content = chapter.editedContent || chapter.updatedHtml;

              if (content && !chapter.error) {
                await chapterService.updateChapterContent(storyId, chapter.chapterNumber, content);

                if (author) {
                  await aiEditService.recordSuccessfulEdit(author.authorId, storyId, 'textEdit', {
                    chapterNumber: chapter.chapterNumber,
                    userRequest,
                    timestamp: new Date().toISOString(),
                    originalLength: chapter.originalLength,
                    editedLength: chapter.editedLength,
                  });
                }

                updatedChapters.push({ chapterNumber: chapter.chapterNumber, success: true });
              } else {
                updatedChapters.push({ chapterNumber: chapter.chapterNumber, success: false });
              }
            } catch (chapterErr) {
              console.error(
                `Failed to persist chapter ${chapter.chapterNumber} from text_edit job ${data.job.id}:`,
                chapterErr,
              );
              updatedChapters.push({ chapterNumber: chapter.chapterNumber, success: false });
            }
          }

          // Overwrite result with persisted status to keep client consistent with sync route
          data.job.result = {
            success: true,
            scope: 'story',
            updatedChapters,
            totalChapters: chaptersArray.length,
            successfulEdits: updatedChapters.filter((c) => c.success).length,
            failedEdits: updatedChapters.filter((c) => !c.success).length,
            tokensUsed: data.job?.metadata?.tokensUsed || 0,
            timestamp: new Date().toISOString(),
          };
        } else if (
          storyId &&
          jobResult.chapterNumber &&
          (jobResult.editedContent || jobResult.updatedHtml)
        ) {
          const editedContent = jobResult.editedContent || jobResult.updatedHtml || '';

          console.info('[job-status] text_edit persisting single chapter', {
            jobId,
            storyId,
            chapterNumber: jobResult.chapterNumber,
            contentLength: editedContent.length,
          });

          try {
            await chapterService.updateChapterContent(
              storyId,
              jobResult.chapterNumber,
              editedContent,
            );

            if (author) {
              await aiEditService.recordSuccessfulEdit(author.authorId, storyId, 'textEdit', {
                chapterNumber: jobResult.chapterNumber,
                userRequest,
                timestamp: new Date().toISOString(),
              });
            }

            data.job.result = {
              success: true,
              scope: 'chapter',
              updatedHtml: editedContent,
              tokensUsed: data.job?.metadata?.tokensUsed || 0,
              chapterNumber: jobResult.chapterNumber,
            };
          } catch (chapterErr) {
            console.error(
              `Failed to persist chapter ${jobResult.chapterNumber} from text_edit job ${data.job.id}:`,
              chapterErr,
            );
          }
        }
      } catch (textPersistErr) {
        console.error('Failed to persist completed text_edit job:', textPersistErr);
      }
    }

    // Only attempt credit recording for completed image_edit jobs
    if (data?.success && data?.job?.status === 'completed' && data?.job?.type === 'image_edit') {
      try {
        // Authenticate to associate with author. If unauthenticated we skip recording (cannot charge unknown user)
        const { userId } = await auth();
        if (userId) {
          const author = await authorService.getAuthorByClerkId(userId);
          if (author) {
            // Retrieve metadata we stashed at creation
            const pending = getPendingImageJob(jobId);
            const storyId = pending?.storyId || data.job.result?.storyId;
            if (storyId) {
              // Idempotency: check if we've already recorded this jobId in aiEdits metadata
              // We stored jobId inside metadata.jobId when recording; search by JSON extraction where supported.
              const alreadyRecorded = await db
                .select({ id: aiEdits.id })
                .from(aiEdits)
                .where(
                  and(
                    eq(aiEdits.authorId, author.authorId),
                    eq(aiEdits.storyId, storyId as string),
                    // Fallback simple LIKE match on serialized metadata (portable) since Drizzle JSON path may vary
                    sql`CAST(${aiEdits.metadata} AS TEXT) LIKE ${`%"jobId":"${jobId}"%`}`,
                  ),
                )
                .limit(1);

              if (alreadyRecorded.length === 0) {
                await aiEditService.recordSuccessfulEdit(
                  author.authorId,
                  storyId as string,
                  'imageEdit',
                  {
                    jobId,
                    imageType: pending?.imageType || data.job.result?.imageType,
                    chapterNumber: pending?.chapterNumber,
                    userRequest: pending?.userRequest,
                    // Provide new image URL if present in result
                    newImageUrl: data.job.result?.newImageUrl,
                    timestamp: new Date().toISOString(),
                  },
                );
              }

              // Cleanup in-memory cache (best-effort)
              deletePendingImageJob(jobId);
            }
          }
        }
      } catch (recordErr) {
        console.error('Failed to record/deduct credits for completed image job', recordErr);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying job status request:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
