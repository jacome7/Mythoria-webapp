import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  biographerSegments as segments,
  biographerTurns as turns,
  biographerProjects as projects,
  biographerParticipants as participants,
} from '@/db/schema/biographer';
import { BiographerError, ownedProject } from '@/db/services/biographer';
import { readSegment } from '@/lib/biographer/storage';
import { sgwFetch } from '@/lib/sgw-client';
import { clearTranscribedAudio, hasCompleteTranscript } from './audio-retention';
import { z } from 'zod';

export function validateRecoverySegments(
  items: Array<{ sequence: number; contentType: string; bytes: number }>,
) {
  if (
    !items.length ||
    items.some(
      (segment, index) =>
        segment.sequence !== index ||
        segment.contentType !== 'audio/pcm;rate=16000' ||
        segment.bytes < 1 ||
        segment.bytes % 2 !== 0,
    )
  )
    throw new BiographerError('Recording is incomplete or unsupported', 409);
  if (items.reduce((sum, segment) => sum + segment.bytes, 0) > 32 * 1024 * 1024)
    throw new BiographerError('Recording is too long to transcribe at once', 413);
}

/** Explicit recovery of saved PCM. Never sends archival audio into a live session. */
export async function recoverTranscription(
  authorId: string,
  projectId: string,
  turnId: string,
  guest?: { participantId: string; accessVersion: number },
) {
  const project = await ownedProject(authorId, projectId);
  if (guest) {
    const [participant] = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, guest.participantId),
          eq(participants.projectId, projectId),
          eq(participants.accessVersion, guest.accessVersion),
        ),
      );
    if (!participant || participant.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
  }
  const [turn] = await db
    .select()
    .from(turns)
    .where(and(eq(turns.id, turnId), eq(turns.projectId, projectId), eq(turns.role, 'user')));
  if (!turn || (guest && turn.participantId !== guest.participantId))
    throw new BiographerError('Response not found', 404);
  if (hasCompleteTranscript(turn))
    throw new BiographerError('This response already has a transcript', 409);
  const saved = await db
    .select()
    .from(segments)
    .where(and(eq(segments.projectId, projectId), eq(segments.turnId, turnId)))
    .orderBy(asc(segments.sequence));
  validateRecoverySegments(saved);
  const chunks: Buffer[] = [];
  for (const item of saved) {
    const result = await readSegment(authorId, projectId, item.id);
    chunks.push(result.bytes);
  }
  const pcm = Buffer.concat(chunks);
  if (pcm.length % 2) throw new BiographerError('Invalid recorded audio', 400);
  const transcripts: string[] = [];
  const maxBytes = 16000 * 2 * 60;
  for (let offset = 0; offset < pcm.length; offset += maxBytes) {
    const response = await sgwFetch('/api/biographer/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: project.locale,
        audioPcmBase64: pcm.subarray(offset, offset + maxBytes).toString('base64'),
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok)
      throw new BiographerError('Transcription unavailable. Your recording is saved.', 503);
    const parsed = z
      .object({ text: z.string().trim().max(40000) })
      .safeParse(await response.json());
    if (!parsed.success) throw new BiographerError('Invalid transcription response', 502);
    if (parsed.data.text) transcripts.push(parsed.data.text);
  }
  const text = transcripts.join(' ').trim();
  if (!text || text.length > 40000)
    throw new BiographerError(
      'Unable to transcribe this recording. You can add text manually.',
      422,
    );
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [currentProject] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    const [current] = await tx
      .select()
      .from(turns)
      .where(and(eq(turns.id, turnId), eq(turns.projectId, projectId)));
    const currentSegments = await tx
      .select({ id: segments.id, sequence: segments.sequence })
      .from(segments)
      .where(and(eq(segments.projectId, projectId), eq(segments.turnId, turnId)))
      .orderBy(asc(segments.sequence));
    const [currentParticipant] = guest
      ? await tx
          .select()
          .from(participants)
          .where(
            and(
              eq(participants.id, guest.participantId),
              eq(participants.projectId, projectId),
              eq(participants.accessVersion, guest.accessVersion),
            ),
          )
      : [];
    if (
      guest &&
      (!currentParticipant ||
        currentParticipant.status === 'closed' ||
        current?.participantId !== guest.participantId)
    )
      throw new BiographerError('Contributions closed', 423);
    if (
      !currentProject ||
      currentProject.status === 'deleting' ||
      !current ||
      hasCompleteTranscript(current) ||
      current.revision !== turn.revision ||
      currentSegments.length !== saved.length ||
      currentSegments.some(
        (segment, index) =>
          segment.id !== saved[index]?.id || segment.sequence !== saved[index]?.sequence,
      )
    )
      throw new BiographerError('Recording changed while transcribing. Please retry.', 409);
    const [updated] = await tx
      .update(turns)
      .set({
        text,
        originalText: text,
        final: true,
        interrupted: false,
        revision: sql`${turns.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(turns.id, turnId))
      .returning();
    if (guest)
      await tx
        .update(participants)
        .set({
          status: 'started',
          lastActivity: new Date(),
          contributionRevision: sql`${participants.contributionRevision}+1`,
        })
        .where(eq(participants.id, guest.participantId));
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    return { turn: updated };
  });
  await clearTranscribedAudio(projectId, turnId);
  return result;
}
