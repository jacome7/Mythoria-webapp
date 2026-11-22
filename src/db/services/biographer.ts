import { and, asc, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { db } from '@/db';
import { modelHistory, modelOpening, questionOptions } from '@/lib/story-whisperer/seed';
import { storyWhispererInterviews } from '@/db/schema/story-whisperer';
import { lockVoiceAccount } from './whisperer-voice';
import { authorVoiceAccounts } from '@/db/schema/whisperer-voice';
import {
  biographerProjects as projects,
  biographerParticipants as participants,
  biographerTurns as turns,
  biographerSegments as segments,
  biographerSessions as sessions,
  biographerEvents as events,
  biographerAssets as assets,
  biographerInvitations as invitations,
} from '@/db/schema/biographer';
import { discardedTurnEventId, liveTurnDiscardingSession } from '@/lib/biographer/discarded-audio';
import { projectInput, projectPatch, turnInput, turnPatch } from '@/lib/biographer/validation';
export class BiographerError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}
export const hashTicket = (ticket: string) => createHash('sha256').update(ticket).digest('hex');
export async function ownedProject(authorId: string, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
  if (!project || project.status === 'deleting')
    throw new BiographerError('Project not found', 404);
  return project;
}
export async function detail(authorId: string, projectId: string) {
  const project = await ownedProject(authorId, projectId);
  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.projectId, projectId), eq(participants.role, 'owner')));
  const savedTurns = await db
    .select()
    .from(turns)
    .where(eq(turns.projectId, projectId))
    .orderBy(asc(turns.createdAt));
  const savedSegments = await db
    .select({
      id: segments.id,
      turnId: segments.turnId,
      sequence: segments.sequence,
      contentType: segments.contentType,
      durationMs: segments.durationMs,
      bytes: segments.bytes,
      sha256: segments.sha256,
    })
    .from(segments)
    .where(eq(segments.projectId, projectId))
    .orderBy(asc(segments.sequence));
  const savedAssets = await db
    .select({
      id: assets.id,
      caption: assets.caption,
      contentType: assets.contentType,
      included: assets.included,
    })
    .from(assets)
    .where(eq(assets.projectId, projectId));
  return { project, participant, turns: savedTurns, segments: savedSegments, assets: savedAssets };
}
export async function listProjects(authorId: string) {
  return db
    .select({ project: projects })
    .from(projects)
    .leftJoin(storyWhispererInterviews, eq(storyWhispererInterviews.projectId, projects.id))
    .where(and(eq(projects.authorId, authorId), isNull(storyWhispererInterviews.projectId)))
    .orderBy(desc(projects.updatedAt))
    .then((rows) => rows.map(({ project }) => project));
}
export async function createProject(authorId: string, name: string, input: unknown) {
  const { consent: _consent, ...values } = projectInput.parse(input);
  void _consent;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${authorId}))`);
    const existing = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.authorId, authorId));
    if (existing.length >= 20) throw new BiographerError('Project limit reached', 429);
    const [project] = await tx
      .insert(projects)
      .values({ ...values, authorId })
      .returning();
    const [participant] = await tx
      .insert(participants)
      .values({ projectId: project.id, name, role: 'owner', consentAt: new Date() })
      .returning();
    return { project, participant };
  });
}
export async function updateProject(authorId: string, id: string, input: unknown) {
  const changes = projectPatch.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
    const [project] = await tx
      .update(projects)
      .set({
        ...changes,
        updatedAt: new Date(),
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
      })
      .where(and(eq(projects.id, id), eq(projects.authorId, authorId)))
      .returning();
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    return { project };
  });
}
export async function saveTurn(authorId: string, projectId: string, input: unknown) {
  const value = turnInput.parse(input);
  return db.transaction((tx) => saveOwnerTurn(tx, authorId, projectId, value));
}

export async function saveOwnerTurn(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  authorId: string,
  projectId: string,
  value: ReturnType<typeof turnInput.parse>,
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
  const [owner] = await tx
    .select({ status: projects.status, participantId: participants.id })
    .from(projects)
    .innerJoin(
      participants,
      and(eq(participants.projectId, projects.id), eq(participants.role, 'owner')),
    )
    .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
  if (!owner || owner.status === 'deleting') throw new BiographerError('Project not found', 404);
  const [existing] = await tx.select().from(turns).where(eq(turns.id, value.id));
  if (existing) {
    if (
      existing.projectId !== projectId ||
      existing.participantId !== owner.participantId ||
      existing.role !== 'user' ||
      existing.originalText !== value.text
    )
      throw new BiographerError('Response conflict', 409);
    return existing;
  }
  const [turn] = await tx
    .insert(turns)
    .values({ ...value, projectId, participantId: owner.participantId, originalText: value.text })
    .returning();
  await tx
    .update(projects)
    .set({
      revision: sql`${projects.revision}+1`,
      updatedAt: new Date(),
      proposal: null,
      proposalRevision: null,
    })
    .where(eq(projects.id, projectId));
  return turn;
}

export async function editTurn(
  authorId: string,
  projectId: string,
  turnId: string,
  input: unknown,
) {
  await ownedProject(authorId, projectId);
  const value = turnPatch.parse(input);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const [turn] = await tx
      .update(turns)
      .set({
        ...value,
        ...(value.text !== undefined ? { final: true, interrupted: false } : {}),
        revision: sql`${turns.revision}+1`,
        updatedAt: new Date(),
      })
      .where(and(eq(turns.projectId, projectId), eq(turns.id, turnId), eq(turns.role, 'user')))
      .returning();
    if (!turn) throw new BiographerError('Response not found', 404);
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        updatedAt: new Date(),
        proposal: null,
        proposalRevision: null,
      })
      .where(eq(projects.id, projectId));
    return { turn };
  });
  if (result.turn.final && result.turn.text.trim()) {
    const { clearTranscribedAudio } = await import('@/lib/biographer/audio-retention');
    await clearTranscribedAudio(projectId, turnId);
  }
  return result;
}
export async function issueSession(
  authorId: string,
  projectId: string,
  guest?: { participantId: string; accessVersion: number },
) {
  const liveUrl = process.env.BIOGRAPHER_LIVE_URL;
  if (!liveUrl || (!liveUrl.startsWith('wss://') && !liveUrl.startsWith('ws://localhost:')))
    throw new BiographerError('Live interviews unavailable', 503);
  const ticket = randomBytes(32).toString('base64url');
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const account = await lockVoiceAccount(tx, project.authorId);
    if (account.liveSeconds >= account.allowanceSeconds)
      throw new BiographerError('Live allowance reached', 429);
    if (!account.liveEnabled || !project.liveEnabled)
      throw new BiographerError('Live interviews paused', 423);
    const [participant] = await tx
      .select()
      .from(participants)
      .where(
        guest
          ? and(
              eq(participants.id, guest.participantId),
              eq(participants.projectId, projectId),
              eq(participants.role, 'contributor'),
              eq(participants.accessVersion, guest.accessVersion),
            )
          : and(eq(participants.projectId, projectId), eq(participants.role, 'owner')),
      );
    if (!participant || participant.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    const [session] = await tx
      .insert(sessions)
      .values({
        projectId,
        participantId: participant.id,
        ticketHash: hashTicket(ticket),
        ticketExpiresAt: new Date(Date.now() + 60000),
        leaseId: randomUUID(),
      })
      .returning();
    return {
      sessionId: session.id,
      ticket,
      liveUrl,
      remainingSeconds: Math.max(0, account.allowanceSeconds - account.liveSeconds),
    };
  });
}
export async function admitSession(ticket: string, projectId: string, sessionId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx.select().from(projects).where(eq(projects.id, projectId));
    const [session] = await tx
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.projectId, projectId),
          eq(sessions.ticketHash, hashTicket(ticket)),
        ),
      );
    if (
      !project ||
      project.status === 'deleting' ||
      !project.liveEnabled ||
      !session ||
      session.consumedAt ||
      session.endedAt ||
      session.ticketExpiresAt.getTime() < Date.now()
    )
      throw new BiographerError('Invalid live admission', 401);
    const account = await lockVoiceAccount(tx, project.authorId);
    if (!account.liveEnabled) throw new BiographerError('Live interviews paused', 423);
    const remaining = account.allowanceSeconds - account.liveSeconds;
    if (remaining < 1) throw new BiographerError('Live allowance reached', 429);
    const reserve = Math.min(60, remaining);
    const now = new Date();
    await tx
      .update(authorVoiceAccounts)
      .set({ liveSeconds: account.liveSeconds + reserve })
      .where(eq(authorVoiceAccounts.authorId, project.authorId));
    await tx
      .update(sessions)
      .set({
        consumedAt: now,
        accountedAt: now,
        leaseExpiresAt: new Date(Date.now() + reserve * 1000),
        reservedSeconds: reserve,
      })
      .where(eq(sessions.id, sessionId));
    const [speaker] = await tx
      .select()
      .from(participants)
      .where(eq(participants.id, session.participantId));
    if (!speaker || speaker.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    const [whisperer] = await tx
      .select({
        context: storyWhispererInterviews.context,
        latestQuestion: storyWhispererInterviews.latestQuestion,
      })
      .from(storyWhispererInterviews)
      .where(eq(storyWhispererInterviews.projectId, projectId));
    const allHistory = await tx
      .select({
        id: turns.id,
        role: turns.role,
        text: turns.text,
        included: turns.included,
        final: turns.final,
        interrupted: turns.interrupted,
        originalText: turns.originalText,
        participantId: turns.participantId,
        contributorName: participants.name,
      })
      .from(turns)
      .innerJoin(participants, eq(participants.id, turns.participantId))
      .where(and(eq(turns.projectId, projectId), whisperer ? undefined : eq(turns.included, true)))
      .orderBy(asc(turns.createdAt), asc(turns.id));
    const speakerHistory = allHistory.filter((turn) => turn.participantId === speaker.id);
    const history = (whisperer ? modelHistory(speakerHistory) : speakerHistory)
      .slice(-80)
      .map((turn) => ({
        role: turn.role,
        text: turn.text.slice(0, 4000),
        ...questionOptions(turn, whisperer?.latestQuestion),
      }));
    const sharedMemories =
      speaker.role === 'contributor'
        ? allHistory
            .filter(
              (turn) =>
                turn.included &&
                turn.participantId !== speaker.id &&
                turn.role === 'user' &&
                turn.text.trim(),
            )
            .slice(-30)
            .map((turn) => ({
              sourceId: turn.id,
              contributorName: turn.contributorName,
              text: turn.text.slice(0, 2000),
            }))
        : [];
    const projectPhotos = await tx
      .select({ caption: assets.caption })
      .from(assets)
      .where(and(eq(assets.projectId, projectId), eq(assets.included, true)))
      .limit(20);
    return {
      ...(whisperer ? { mode: 'story-whisperer' as const } : {}),
      participantId: session.participantId,
      authorId: project.authorId,
      locale: project.locale,
      history,
      remainingSeconds: remaining,
      leaseId: session.leaseId,
      context: {
        ...(whisperer?.context
          ? {
              primaryIntent: whisperer.context.primaryIntent,
              opening: modelOpening(whisperer.context.opening, speakerHistory[0]),
              storyBrief: whisperer.context.brief,
              characterNames: whisperer.context.characterNames,
            }
          : {}),
        projectTitle: project.title,
        subject: project.subject,
        purpose: project.purpose,
        photoCaptions: projectPhotos.map((photo) => photo.caption.slice(0, 2000)).filter(Boolean),
        relationship: speaker.relationship,
        sharedMemories,
        followUps: speaker.followUp ? [speaker.followUp] : [],
      },
    };
  });
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function discardLiveTurns(
  tx: Transaction,
  session: typeof sessions.$inferSelect,
  turnIds: string[],
  userOnly = false,
) {
  const [whisperer] = await tx
    .select({ authorId: storyWhispererInterviews.authorId })
    .from(storyWhispererInterviews)
    .where(eq(storyWhispererInterviews.projectId, session.projectId));
  if (!whisperer) throw new BiographerError('Interview not found', 404);
  const cleanup: string[] = [];
  for (const turnId of new Set(turnIds)) {
    const [turn] = await tx.select().from(turns).where(eq(turns.id, turnId));
    if (
      turn &&
      (turn.projectId !== session.projectId ||
        turn.participantId !== session.participantId ||
        (userOnly &&
          (turn.role !== 'user' || !session.consumedAt || turn.createdAt < session.consumedAt)) ||
        (turn.final && !turn.interrupted && turn.text.trim()))
    ) {
      continue;
    }
    await tx
      .insert(events)
      .values({ eventId: discardedTurnEventId(session.projectId, turnId), sessionId: session.id })
      .onConflictDoNothing();
    // Keep the revision stable for assessments based on the completed transcript.
    if (turn) await tx.delete(turns).where(eq(turns.id, turnId));
    cleanup.push(turnId);
  }
  return cleanup;
}

async function clearDiscardedAudio(projectId: string, turnIds: string[]) {
  if (!turnIds.length) return;
  const { clearDiscardedLiveAudio } = await import('@/lib/biographer/audio-retention');
  await Promise.all(turnIds.map((turnId) => clearDiscardedLiveAudio(projectId, turnId)));
}

export async function cancelWhispererSession(
  authorId: string,
  projectId: string,
  sessionId: string,
  turnId?: string,
) {
  const cleanup = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [session] = await tx
      .select(getTableColumns(sessions))
      .from(sessions)
      .innerJoin(
        storyWhispererInterviews,
        eq(storyWhispererInterviews.projectId, sessions.projectId),
      )
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.projectId, projectId),
          eq(storyWhispererInterviews.authorId, authorId),
        ),
      );
    if (!session) throw new BiographerError('Session not found', 404);
    if (!session.consumedAt && !session.endedAt)
      await tx.update(sessions).set({ endedAt: new Date() }).where(eq(sessions.id, sessionId));
    // Once admitted, the gateway drains earlier completed checkpoints before releasing the lease.
    return turnId ? discardLiveTurns(tx, session, [turnId], true) : [];
  });
  await clearDiscardedAudio(projectId, cleanup);
  return { cancelled: true };
}

export async function leaseSession(
  sessionId: string,
  leaseId: string,
  release = false,
  discardTurnIds?: string[],
) {
  const result = await db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.leaseId, leaseId)));
    if (!initial) throw new BiographerError('Session not found', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${initial.projectId}))`);
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) throw new BiographerError('Session not found', 404);
    const [project] = await tx.select().from(projects).where(eq(projects.id, session.projectId));
    if (!project) throw new BiographerError('Project not found', 404);
    const cleanup = discardTurnIds ? await discardLiveTurns(tx, session, discardTurnIds) : [];
    const account = await lockVoiceAccount(tx, project.authorId);
    if (session.endedAt)
      return {
        allowed: false,
        remainingSeconds: Math.max(0, account.allowanceSeconds - account.liveSeconds),
        projectId: project.id,
        cleanup,
      };
    if (!session.accountedAt || !session.leaseExpiresAt)
      throw new BiographerError('Session not admitted', 409);
    const elapsed = Math.min(
      session.reservedSeconds,
      Math.max(0, Math.ceil((Date.now() - session.accountedAt.getTime()) / 1000)),
    );
    const used = Math.max(0, account.liveSeconds - session.reservedSeconds + elapsed);
    const available = Math.max(0, account.allowanceSeconds - used);
    const allowed =
      !release &&
      process.env.BIOGRAPHER_ENABLED === 'true' &&
      account.liveEnabled &&
      project.liveEnabled &&
      session.leaseExpiresAt.getTime() > Date.now() &&
      available > 0;
    const reserve = allowed ? Math.min(60, available) : 0;
    await tx
      .update(authorVoiceAccounts)
      .set({ liveSeconds: used + reserve })
      .where(eq(authorVoiceAccounts.authorId, project.authorId));
    await tx
      .update(sessions)
      .set({
        reservedSeconds: reserve,
        accountedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + reserve * 1000),
        endedAt: allowed ? null : new Date(),
      })
      .where(eq(sessions.id, sessionId));
    return { allowed, remainingSeconds: available, projectId: project.id, cleanup };
  });
  await clearDiscardedAudio(result.projectId, result.cleanup);
  return { allowed: result.allowed, remainingSeconds: result.remainingSeconds };
}
export async function checkpoint(input: {
  sessionId: string;
  eventId: string;
  turnId: string;
  role: 'user' | 'assistant';
  text: string;
  final?: boolean;
  interrupted?: boolean;
}) {
  const result = await db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, input.sessionId));
    if (!session?.consumedAt || session.endedAt)
      throw new BiographerError('Session not found', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${session.projectId}))`);
    const [currentSession] = await tx
      .select({
        ...getTableColumns(sessions),
        discardingSessionId: liveTurnDiscardingSession(session.projectId, input.turnId),
      })
      .from(sessions)
      .where(eq(sessions.id, input.sessionId));
    const [participant] = await tx
      .select()
      .from(participants)
      .where(eq(participants.id, session.participantId));
    if (
      !currentSession?.consumedAt ||
      currentSession.endedAt ||
      !participant ||
      participant.status === 'closed'
    )
      throw new BiographerError('Session not found', 404);
    if (participant.role === 'contributor') {
      const [invitation] = await tx
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            eq(invitations.projectId, session.projectId),
            eq(invitations.participantId, participant.id),
            sql`${invitations.claimedAt} IS NOT NULL`,
            sql`${invitations.revokedAt} IS NULL`,
          ),
        );
      if (!invitation || !participant.consentAt)
        throw new BiographerError('Session not found', 404);
    }
    // A browser cancellation can arrive before the gateway's already-queued
    // final checkpoint. Accept it only from the session that owns the marker.
    // The gateway releases the session after draining that ordered queue.
    if (
      currentSession.discardingSessionId &&
      (currentSession.discardingSessionId !== session.id ||
        !input.final ||
        input.interrupted ||
        !input.text.trim())
    )
      return { saved: true };

    const inserted = await tx
      .insert(events)
      .values({ eventId: input.eventId, sessionId: session.id })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) return { saved: true, duplicate: true };
    const [existing] = await tx.select().from(turns).where(eq(turns.id, input.turnId));
    if (
      existing &&
      (existing.projectId !== session.projectId ||
        existing.participantId !== session.participantId ||
        existing.role !== input.role)
    )
      throw new BiographerError('Response conflict', 409);
    if (existing?.final && !existing.interrupted && existing.text.trim() && !input.final)
      return { saved: true, final: true, projectId: session.projectId };
    if (existing?.revision) return { saved: true, corrected: true };
    await tx
      .insert(turns)
      .values({
        id: input.turnId,
        projectId: session.projectId,
        participantId: session.participantId,
        role: input.role,
        text: input.text,
        originalText: input.text,
        final: input.final ?? false,
        interrupted: input.interrupted ?? false,
      })
      .onConflictDoUpdate({
        target: turns.id,
        set: {
          text: input.text,
          originalText: input.text,
          final: input.final ?? false,
          interrupted: input.interrupted ?? false,
          updatedAt: new Date(),
        },
      });
    if (input.role === 'user')
      await tx
        .update(participants)
        .set({
          status: 'started',
          lastActivity: new Date(),
          contributionRevision: sql`${participants.contributionRevision}+1`,
        })
        .where(
          and(eq(participants.id, session.participantId), eq(participants.role, 'contributor')),
        );
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        updatedAt: new Date(),
        proposal: null,
        proposalRevision: null,
      })
      .where(eq(projects.id, session.projectId));
    return { saved: true, projectId: session.projectId };
  });
  if (
    input.role === 'user' &&
    input.final &&
    !input.interrupted &&
    input.text.trim() &&
    result.projectId
  ) {
    const { clearTranscribedAudio } = await import('@/lib/biographer/audio-retention');
    await clearTranscribedAudio(result.projectId, input.turnId);
  }
  return {
    saved: true,
    ...('duplicate' in result && result.duplicate ? { duplicate: true } : {}),
    ...('corrected' in result && result.corrected ? { corrected: true } : {}),
  };
}
