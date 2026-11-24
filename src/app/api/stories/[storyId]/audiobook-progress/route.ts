import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { db } from '@/db';
import { productGenerationRequests } from '@/db/schema/analytics';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import {
  getCurrentPremiumAudiobook,
  getPendingPremiumAudiobook,
  getPublishedPremiumRevision,
} from '@/lib/premium-children-book/audiobook';

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
    const [latest] = await db
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
    const premium = hasPremiumBookMarker(story.features);
    const revision = premium ? getPublishedPremiumRevision(story.features) : undefined;
    const pending = premium ? getPendingPremiumAudiobook(revision, story.audiobookUri) : undefined;
    const currentAudio = premium
      ? getCurrentPremiumAudiobook(storyId, story.features, story.audiobookUri)
      : undefined;
    const job =
      latest &&
      (!premium ||
        (revision && latest.idempotencyKey?.startsWith(`premium-audiobook:${revision}:`)))
        ? latest
        : undefined;
    const storyStatus = premium
      ? pending
        ? 'generating'
        : story.audiobookStatus === 'failed' && job?.status === 'running'
          ? 'failed'
          : currentAudio
            ? 'completed'
            : null
      : story.audiobookStatus;
    const active = job && ['pending', 'queued', 'running'].includes(job.status);
    // Story status is updated before request reconciliation on workflow termination.
    const legacyActive = !active && storyStatus === 'generating';
    const status = active
      ? storyStatus === 'failed' && job.status === 'running'
        ? 'failed'
        : storyStatus === 'completed' &&
            job.status === 'running' &&
            (!premium || currentAudio?.runId === job.runId)
          ? 'completed'
          : 'generating'
      : legacyActive
        ? 'generating'
        : job?.status === 'failed'
          ? 'failed'
          : job?.status === 'completed'
            ? 'completed'
            : storyStatus || 'not_started';
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
