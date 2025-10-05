import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sgwFetch } from '@/lib/sgw-client';
import { aiEditService, authorService } from '@/db/services';
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
