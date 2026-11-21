import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { after } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { createLogger, format, transports } from 'winston';
import { storyWhispererInterviews } from '@/db/schema/story-whisperer';
import { db } from '@/db';
import { biographerSegments as segments, biographerTurns as turns } from '@/db/schema/biographer';

export const audioRetentionMs = 7 * 24 * 60 * 60 * 1000;
const removable = or(
  sql`${segments.createdAt} <= now() - interval '7 days'`,
  and(eq(turns.final, true), eq(turns.interrupted, false), sql`length(trim(${turns.text})) > 0`),
);

export function hasCompleteTranscript(turn: {
  text: string;
  final: boolean;
  interrupted?: boolean;
}) {
  return turn.final && !turn.interrupted && Boolean(turn.text.trim());
}

// Recheck under the same project lock used for uploads, transcript commits and reset.
// Metadata stays in Postgres until storage confirms deletion, so a failure is retryable.
async function purgeRecoveryAudio(projectId: string, turnId: string) {
  return db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtext(${projectId})) as locked`,
    );
    if (!rows[0]?.locked) return { removed: 0, failed: 0, more: true };
    const files = await tx
      .select({ id: segments.id, path: segments.objectPath })
      .from(segments)
      .innerJoin(
        storyWhispererInterviews,
        eq(storyWhispererInterviews.projectId, segments.projectId),
      )
      .leftJoin(turns, eq(turns.id, segments.turnId))
      .where(and(eq(segments.projectId, projectId), eq(segments.turnId, turnId), removable))
      .orderBy(segments.createdAt, segments.id)
      .limit(20);
    if (!files.length) return { removed: 0, failed: 0, more: false };
    const name = process.env.BIOGRAPHER_STORAGE_BUCKET;
    if (!name) throw new Error('Private recovery storage unavailable');
    const storage = new Storage({ timeout: 5000, retryOptions: { autoRetry: false } }).bucket(name);
    const results = await Promise.allSettled(
      files.map((file) => storage.file(file.path).delete({ ignoreNotFound: true })),
    );
    const deleted = files.filter((_, index) => results[index].status === 'fulfilled');
    if (deleted.length)
      await tx.delete(segments).where(
        inArray(
          segments.id,
          deleted.map(({ id }) => id),
        ),
      );
    return {
      removed: deleted.length,
      failed: files.length - deleted.length,
      more: files.length === 20,
    };
  });
}

const retentionLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'story-whisperer-retention' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Keep audio cleanup outside the transcript acknowledgement. The sweep retries failures.
export async function clearTranscribedAudio(projectId: string, turnId: string) {
  const cleanup = async () => {
    try {
      if (!(await purgeRecoveryAudio(projectId, turnId)).failed) return;
    } catch {
      // The audio metadata stays available for the sweep.
    }
    retentionLogger.error('Audio deletion queued for the recovery sweep');
  };
  try {
    after(cleanup);
  } catch {
    // Service callers such as local rehearsals can run without a Next.js request.
    await cleanup();
  }
}

export async function sweepRecoveryAudio() {
  const rows = await db
    .selectDistinct({ projectId: segments.projectId, turnId: segments.turnId })
    .from(segments)
    .innerJoin(storyWhispererInterviews, eq(storyWhispererInterviews.projectId, segments.projectId))
    .leftJoin(turns, eq(turns.id, segments.turnId))
    .where(removable)
    .orderBy(segments.projectId, segments.turnId)
    .limit(100);
  let removed = 0;
  let failed = 0;
  let more = rows.length === 100;
  for (const row of rows) {
    try {
      const result = await purgeRecoveryAudio(row.projectId, row.turnId);
      removed += result.removed;
      failed += result.failed;
      more ||= result.more;
    } catch {
      failed += 1;
    }
  }
  if (failed) retentionLogger.error('Recovery audio deletion failed', { failed });
  return { removed, failed, more: more || failed > 0 };
}
