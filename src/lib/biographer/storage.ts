import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { storyWhispererInterviews } from '@/db/schema/story-whisperer';
import {
  biographerSegments as segments,
  biographerProjects as projects,
  biographerTurns as turns,
} from '@/db/schema/biographer';
import { BiographerError, detail, ownedProject } from '@/db/services/biographer';
import { isDiscardedLiveTurn } from './discarded-audio';
import { audioRetentionMs, hasCompleteTranscript } from './audio-retention';
import { segmentInput } from './validation';
function bucket() {
  const name = process.env.BIOGRAPHER_STORAGE_BUCKET;
  if (!name) throw new BiographerError('Private media storage unavailable', 503);
  return new Storage().bucket(name);
}
export async function saveSegment(
  authorId: string,
  projectId: string,
  input: unknown,
  guest?: { participantId: string; accessVersion: number },
) {
  const value = segmentInput.parse(input);
  const capturedAt = value.capturedAt ? new Date(value.capturedAt) : new Date();
  if (capturedAt.getTime() > Date.now() + 60000) throw new BiographerError('Invalid capture time');
  const { biographerParticipants } = await import('@/db/schema/biographer');
  const bytes = Buffer.from(value.data, 'base64');
  if (
    !bytes.length ||
    bytes.length > 2097152 ||
    createHash('sha256').update(bytes).digest('hex') !== value.sha256
  )
    throw new BiographerError('Invalid audio checksum');
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const [participant] = await tx
      .select()
      .from(biographerParticipants)
      .where(
        and(
          eq(biographerParticipants.projectId, projectId),
          guest
            ? and(
                eq(biographerParticipants.id, guest.participantId),
                eq(biographerParticipants.accessVersion, guest.accessVersion),
              )
            : eq(biographerParticipants.role, 'owner'),
        ),
      );
    if (!participant || participant.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    const [whisperer] = await tx
      .select({ projectId: storyWhispererInterviews.projectId })
      .from(storyWhispererInterviews)
      .where(eq(storyWhispererInterviews.projectId, projectId));
    // Older clients clear queued segments on 410 and can keep streaming to the gateway.
    if (whisperer) throw new BiographerError('Live recordings are no longer stored', 410);
    const objectPath = `biographer/${projectId}/${participant.id}/${value.turnId}/${value.sequence}-${value.id}`;
    const row = {
      id: value.id,
      projectId,
      participantId: participant.id,
      turnId: value.turnId,
      sequence: value.sequence,
      objectPath,
      contentType: value.contentType,
      sha256: value.sha256,
      bytes: bytes.length,
      durationMs: value.durationMs,
      createdAt: new Date(Math.min(Date.now(), capturedAt.getTime())),
    };
    const [existingTurn] = await tx.select().from(turns).where(eq(turns.id, value.turnId));
    if (
      existingTurn &&
      (existingTurn.projectId !== projectId ||
        existingTurn.participantId !== participant.id ||
        existingTurn.role !== 'user')
    )
      throw new BiographerError('Response conflict', 409);
    const [existing] = await tx
      .select()
      .from(segments)
      .where(
        or(
          eq(segments.id, value.id),
          and(
            eq(segments.projectId, projectId),
            eq(segments.turnId, value.turnId),
            eq(segments.sequence, value.sequence),
          ),
        ),
      );
    if (existing) {
      if (
        existing.id !== row.id ||
        existing.objectPath !== row.objectPath ||
        existing.sha256 !== row.sha256
      )
        throw new BiographerError('Audio sequence conflict', 409);
      return existing;
    }
    const file = bucket().file(objectPath);
    try {
      await file.save(bytes, {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: value.contentType,
          cacheControl: 'private, no-store',
          metadata: { sha256: value.sha256 },
        },
      });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 412))
        throw error;
      const [meta] = await file.getMetadata();
      if (meta.metadata?.sha256 !== value.sha256) throw new BiographerError('Audio conflict', 409);
    }
    if (!existingTurn) {
      await tx.insert(turns).values({
        id: value.turnId,
        projectId,
        participantId: participant.id,
        role: 'user',
        text: '',
        originalText: '',
        final: false,
      });
    }
    const insertedSegments = await tx
      .insert(segments)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: segments.id });
    if (insertedSegments.length) {
      if (guest)
        await tx
          .update(biographerParticipants)
          .set({
            status: 'started',
            lastActivity: new Date(),
            contributionRevision: sql`${biographerParticipants.contributionRevision}+1`,
          })
          .where(eq(biographerParticipants.id, guest.participantId));
      await tx
        .update(projects)
        .set({
          revision: sql`${projects.revision}+1`,
          updatedAt: new Date(),
          proposal: null,
          proposalRevision: null,
        })
        .where(eq(projects.id, projectId));
    }
    const [saved] = await tx
      .select()
      .from(segments)
      .where(
        and(
          eq(segments.projectId, projectId),
          eq(segments.turnId, value.turnId),
          eq(segments.sequence, value.sequence),
        ),
      );
    if (!saved || saved.id !== value.id || saved.sha256 !== value.sha256)
      throw new BiographerError('Audio sequence conflict', 409);
    return saved;
  });
  return { saved: true, id: saved.id, sequence: saved.sequence, sha256: saved.sha256 };
}
export async function readSegment(authorId: string, projectId: string, id: string) {
  await ownedProject(authorId, projectId);
  const [segment] = await db
    .select()
    .from(segments)
    .where(and(eq(segments.id, id), eq(segments.projectId, projectId)));
  if (!segment) throw new BiographerError('Audio not found', 404);
  const [whisperer] = await db
    .select({ discarded: isDiscardedLiveTurn(projectId, segment.turnId) })
    .from(storyWhispererInterviews)
    .where(eq(storyWhispererInterviews.projectId, projectId));
  if (whisperer) {
    if (whisperer.discarded) throw new BiographerError('Recording discarded', 410);
    if (segment.createdAt.getTime() <= Date.now() - audioRetentionMs)
      throw new BiographerError('Recording expired', 410);
    const [turn] = await db
      .select({ final: turns.final, text: turns.text, interrupted: turns.interrupted })
      .from(turns)
      .where(eq(turns.id, segment.turnId));
    if (turn && hasCompleteTranscript(turn))
      throw new BiographerError('Recording transcribed', 410);
  }
  const [bytes] = await bucket().file(segment.objectPath).download();
  return { segment, bytes };
}

export async function savePhoto(
  authorId: string,
  projectId: string,
  file: File,
  caption: string,
  guest?: { participantId: string; accessVersion: number },
) {
  const { participant: ownerParticipant } = await detail(authorId, projectId);
  const { biographerParticipants } = await import('@/db/schema/biographer');
  const [guestParticipant] = guest
    ? await db
        .select()
        .from(biographerParticipants)
        .where(
          and(
            eq(biographerParticipants.id, guest.participantId),
            eq(biographerParticipants.projectId, projectId),
            eq(biographerParticipants.accessVersion, guest.accessVersion),
          ),
        )
    : [];
  const participant = guest ? guestParticipant : ownerParticipant;
  if (!participant || participant.status === 'closed')
    throw new BiographerError('Contributions closed', 423);
  const { biographerAssets, biographerProjects } = await import('@/db/schema/biographer');
  if (file.size > 10485760 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new BiographerError('Use a JPEG, PNG or WebP photograph under 10 MB');
  const bytes = Buffer.from(await file.arrayBuffer());
  const imageSize = (await import('image-size')).imageSize;
  let dimensions;
  try {
    dimensions = imageSize(bytes);
  } catch {
    throw new BiographerError('Invalid photograph');
  }
  if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 40000000)
    throw new BiographerError('Photograph dimensions are too large');
  const id = (await import('node:crypto')).randomUUID();
  const objectPath = `biographer/${projectId}/${participant.id}/photos/${id}`;
  return db.transaction(async (tx) => {
    const { sql } = await import('drizzle-orm');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    if (guest) {
      const [current] = await tx
        .select()
        .from(biographerParticipants)
        .where(
          and(
            eq(biographerParticipants.id, guest.participantId),
            eq(biographerParticipants.projectId, projectId),
            eq(biographerParticipants.accessVersion, guest.accessVersion),
          ),
        );
      if (!current || current.status === 'closed')
        throw new BiographerError('Contributions closed', 423);
    }
    const existing = await tx
      .select({ id: biographerAssets.id })
      .from(biographerAssets)
      .where(eq(biographerAssets.projectId, projectId))
      .limit(100);
    if (existing.length >= 100) throw new BiographerError('Photograph limit reached', 429);
    await bucket()
      .file(objectPath)
      .save(bytes, {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: { contentType: file.type, cacheControl: 'private, no-store' },
      });
    const [asset] = await tx
      .insert(biographerAssets)
      .values({
        id,
        projectId,
        participantId: participant.id,
        objectPath,
        contentType: file.type,
        caption: caption.slice(0, 4000),
      })
      .returning();
    if (guest)
      await tx
        .update(biographerParticipants)
        .set({
          status: 'started',
          lastActivity: new Date(),
          contributionRevision: sql`${biographerParticipants.contributionRevision}+1`,
        })
        .where(eq(biographerParticipants.id, guest.participantId));
    await tx
      .update(biographerProjects)
      .set({
        revision: sql`${biographerProjects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(biographerProjects.id, projectId));
    return { asset: { id: asset.id, caption: asset.caption, contentType: asset.contentType } };
  });
}
export async function readPhoto(authorId: string, projectId: string, id: string) {
  await detail(authorId, projectId);
  const { biographerAssets } = await import('@/db/schema/biographer');
  const [asset] = await db
    .select()
    .from(biographerAssets)
    .where(and(eq(biographerAssets.id, id), eq(biographerAssets.projectId, projectId)));
  if (!asset) throw new BiographerError('Photo not found', 404);
  const [bytes] = await bucket().file(asset.objectPath).download();
  return { bytes, contentType: asset.contentType };
}

export async function editPhoto(authorId: string, projectId: string, id: string, input: unknown) {
  const { z } = await import('zod');
  const value = z
    .object({ caption: z.string().trim().max(4000).optional(), included: z.boolean().optional() })
    .strict()
    .refine((value) => value.caption !== undefined || value.included !== undefined)
    .parse(input);
  const { biographerAssets } = await import('@/db/schema/biographer');
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const [asset] = await tx
      .update(biographerAssets)
      .set(value)
      .where(and(eq(biographerAssets.id, id), eq(biographerAssets.projectId, projectId)))
      .returning();
    if (!asset) throw new BiographerError('Photo not found', 404);
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    return {
      asset: {
        id: asset.id,
        caption: asset.caption,
        included: asset.included,
        contentType: asset.contentType,
      },
    };
  });
}

/** Deletion is retryable: access is closed before private objects are purged. */
export async function deleteProject(authorId: string, projectId: string) {
  const { biographerProjects, biographerSessions, biographerBookVersions } =
    await import('@/db/schema/biographer');
  const { stories, storyGenerationRequests } = await import('@/db/schema');
  const { sql, inArray } = await import('drizzle-orm');
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [p] = await tx
      .select()
      .from(biographerProjects)
      .where(and(eq(biographerProjects.id, projectId), eq(biographerProjects.authorId, authorId)));
    if (!p) throw new BiographerError('Project not found', 404);
    const versions = await tx
      .select({ storyId: biographerBookVersions.storyId })
      .from(biographerBookVersions)
      .where(eq(biographerBookVersions.projectId, projectId));
    const storyIds = [
      ...new Set([...versions.map((v) => v.storyId), ...(p.storyId ? [p.storyId] : [])]),
    ];
    if (storyIds.length) {
      const requests = await tx
        .select({ id: storyGenerationRequests.runId })
        .from(storyGenerationRequests)
        .where(inArray(storyGenerationRequests.storyId, storyIds));
      if (requests.length)
        throw new BiographerError(
          'Contact support to cancel or remove a purchased book before deleting its source memories.',
          409,
        );
      const linked = await tx
        .select({ id: stories.storyId, status: stories.status })
        .from(stories)
        .where(inArray(stories.storyId, storyIds));
      if (linked.some((story) => !['draft', 'temporary'].includes(story.status ?? '')))
        throw new BiographerError(
          'A book is being generated. Contact support before deleting its source memories.',
          409,
        );
      await tx.delete(stories).where(inArray(stories.storyId, storyIds));
    }
    await tx
      .update(biographerProjects)
      .set({
        status: 'deleting',
        liveEnabled: false,
        generationSnapshot: null,
        proposal: null,
        storyId: null,
      })
      .where(eq(biographerProjects.id, projectId));
    await tx
      .update(biographerSessions)
      .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
      .where(eq(biographerSessions.projectId, projectId));
  });
  await bucket().deleteFiles({ prefix: `biographer/${projectId}/`, force: true });
  await db
    .delete(biographerProjects)
    .where(and(eq(biographerProjects.id, projectId), eq(biographerProjects.authorId, authorId)));
  return { deleted: true };
}
