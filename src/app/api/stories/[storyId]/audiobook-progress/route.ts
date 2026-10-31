import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { db } from '@/db';
import { productGenerationRequests } from '@/db/schema/analytics';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ storyId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { storyId } = await context.params;
    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    const [job] = await db
      .select()
      .from(productGenerationRequests)
      .where(
        and(
          eq(productGenerationRequests.storyId, storyId),
          eq(productGenerationRequests.authorId, author.authorId),
          eq(productGenerationRequests.actionType, 'audiobook_generation'),
        ),
      )
      .orderBy(desc(productGenerationRequests.createdAt))
      .limit(1);
    const active = job && ['pending', 'queued', 'running'].includes(job.status);
    // Story status is updated before request reconciliation on workflow termination.
    const legacyActive = !active && story.audiobookStatus === 'generating';
    const status = active
      ? story.audiobookStatus === 'failed' && job.status === 'running'
        ? 'failed'
        : story.audiobookStatus === 'completed' && job.status === 'running'
          ? 'completed'
          : 'generating'
      : legacyActive
        ? 'generating'
        : job?.status === 'failed'
          ? 'failed'
          : job?.status === 'completed'
            ? 'completed'
            : story.audiobookStatus || 'not_started';
    const started = legacyActive ? null : (job?.queuedAt ?? job?.createdAt);
    const elapsed = started ? Math.max(0, (Date.now() - new Date(started).getTime()) / 1000) : null;
    const reliableElapsed = elapsed !== null && Number.isFinite(elapsed) ? elapsed : null;
    const percent =
      status === 'completed'
        ? 100
        : status === 'generating' && reliableElapsed !== null
          ? Math.min(95, Math.floor((reliableElapsed / 300) * 100))
          : null;
    return NextResponse.json(
      {
        audiobookGenerationStatus: status,
        audiobookGenerationCompletedPercentage: percent,
        runId: legacyActive ? null : (job?.runId ?? null),
        estimatedRemainingSeconds:
          status === 'generating' && reliableElapsed !== null && reliableElapsed < 300
            ? Math.ceil(300 - reliableElapsed)
            : null,
        estimateExceeded:
          status === 'generating' && reliableElapsed !== null && reliableElapsed >= 300,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error fetching audiobook progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audiobook progress' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
