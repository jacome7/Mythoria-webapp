import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { db } from '@/db';
import {
  biographerProjects as projects,
  biographerParticipants as participants,
  biographerTurns as turns,
  biographerSegments as segments,
  biographerSessions as sessions,
  biographerEvents as events,
  biographerAssets as assets,
} from '@/db/schema/biographer';
import { projectInput, projectPatch, turnInput, turnPatch } from '@/lib/biographer/validation';
export class BiographerError extends Error {
  constructor(
    message: string,
    public status = 400,
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
    .select()
    .from(projects)
    .where(eq(projects.authorId, authorId))
    .orderBy(desc(projects.updatedAt));
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
      .values({ projectId: project.id, name, role: 'owner' })
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
  const { participant } = await detail(authorId, projectId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [existing] = await tx.select().from(turns).where(eq(turns.id, value.id));
    if (existing) {
      if (
        existing.projectId !== projectId ||
        existing.participantId !== participant.id ||
        existing.originalText !== value.text
      )
        throw new BiographerError('Response conflict', 409);
      return existing;
    }
    const [turn] = await tx
      .insert(turns)
      .values({ ...value, projectId, participantId: participant.id, originalText: value.text })
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
  });
}
export async function editTurn(
  authorId: string,
  projectId: string,
  turnId: string,
  input: unknown,
) {
  await ownedProject(authorId, projectId);
  const value = turnPatch.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [turn] = await tx
      .update(turns)
      .set({ ...value, revision: sql`${turns.revision}+1`, updatedAt: new Date() })
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
}
export async function issueSession(authorId: string, projectId: string) {
  const { project, participant } = await detail(authorId, projectId);
  if (!project.liveEnabled) throw new BiographerError('Live interviews paused', 423);
  const liveUrl = process.env.BIOGRAPHER_LIVE_URL;
  if (!liveUrl || (!liveUrl.startsWith('wss://') && !liveUrl.startsWith('ws://localhost:')))
    throw new BiographerError('Live interviews unavailable', 503);
  const ticket = randomBytes(32).toString('base64url');
  const [session] = await db
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
    remainingSeconds: Math.max(0, project.allowanceSeconds - project.liveSeconds),
  };
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
      !project.liveEnabled ||
      !session ||
      session.consumedAt ||
      session.ticketExpiresAt.getTime() < Date.now()
    )
      throw new BiographerError('Invalid live admission', 401);
    const remaining = project.allowanceSeconds - project.liveSeconds;
    if (remaining < 1) throw new BiographerError('Live allowance reached', 429);
    const reserve = Math.min(60, remaining);
    const now = new Date();
    await tx
      .update(projects)
      .set({ liveSeconds: project.liveSeconds + reserve })
      .where(eq(projects.id, projectId));
    await tx
      .update(sessions)
      .set({
        consumedAt: now,
        accountedAt: now,
        leaseExpiresAt: new Date(Date.now() + reserve * 1000),
        reservedSeconds: reserve,
      })
      .where(eq(sessions.id, sessionId));
    const history = await tx
      .select({ role: turns.role, text: turns.text })
      .from(turns)
      .where(and(eq(turns.projectId, projectId), eq(turns.included, true)))
      .orderBy(asc(turns.createdAt));
    const projectPhotos = await tx
      .select({ caption: assets.caption })
      .from(assets)
      .where(and(eq(assets.projectId, projectId), eq(assets.included, true)))
      .limit(20);
    return {
      participantId: session.participantId,
      authorId: project.authorId,
      locale: project.locale,
      history: history.slice(-80),
      remainingSeconds: remaining,
      leaseId: session.leaseId,
      context: {
        projectTitle: project.title,
        subject: project.subject,
        purpose: project.purpose,
        photoCaptions: projectPhotos.map((photo) => photo.caption).filter(Boolean),
      },
    };
  });
}
export async function leaseSession(sessionId: string, leaseId: string, release = false) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.leaseId, leaseId)));
    if (!initial) throw new BiographerError('Session not found', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${initial.projectId}))`);
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    const [project] = await tx.select().from(projects).where(eq(projects.id, session.projectId));
    if (session.endedAt)
      return {
        allowed: false,
        remainingSeconds: Math.max(0, project.allowanceSeconds - project.liveSeconds),
      };
    if (!session.accountedAt || !session.leaseExpiresAt)
      throw new BiographerError('Session not admitted', 409);
    const elapsed = Math.min(
      session.reservedSeconds,
      Math.ceil((Date.now() - session.accountedAt.getTime()) / 1000),
    );
    const used = project.liveSeconds - session.reservedSeconds + elapsed;
    const available = Math.max(0, project.allowanceSeconds - used);
    const allowed =
      !release &&
      process.env.BIOGRAPHER_ENABLED === 'true' &&
      project.liveEnabled &&
      session.leaseExpiresAt.getTime() > Date.now() &&
      available > 0;
    const reserve = allowed ? Math.min(60, available) : 0;
    await tx
      .update(projects)
      .set({ liveSeconds: used + reserve })
      .where(eq(projects.id, project.id));
    await tx
      .update(sessions)
      .set({
        reservedSeconds: reserve,
        accountedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + reserve * 1000),
        endedAt: allowed ? null : new Date(),
      })
      .where(eq(sessions.id, sessionId));
    return { allowed, remainingSeconds: available };
  });
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
  return db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, input.sessionId));
    if (!session?.consumedAt || session.endedAt)
      throw new BiographerError('Session not found', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${session.projectId}))`);
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
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        updatedAt: new Date(),
        proposal: null,
        proposalRevision: null,
      })
      .where(eq(projects.id, session.projectId));
    return { saved: true };
  });
}
