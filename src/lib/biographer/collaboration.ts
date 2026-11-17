import { randomBytes, createHash } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import {
  biographerProjects as projects,
  biographerParticipants as participants,
  biographerInvitations as invitations,
  biographerTurns as turns,
  biographerSegments as segments,
  biographerAssets as assets,
  biographerSessions as sessions,
} from '@/db/schema/biographer';
import { BiographerError, ownedProject } from '@/db/services/biographer';

const COOKIE = 'mythoria_biographer_contributor';
const makeToken = () => randomBytes(32).toString('base64url');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const parseToken = (token: string) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .parse(token);
export function collaborationEnabled() {
  if (
    process.env.BIOGRAPHER_ENABLED !== 'true' ||
    process.env.BIOGRAPHER_COLLABORATION_ENABLED !== 'true'
  )
    throw new BiographerError('Not found', 404);
}
function publicBase() {
  const value = process.env.BIOGRAPHER_PUBLIC_URL;
  if (!value) throw new BiographerError('Invitation sharing is not configured', 503);
  const url = new URL(value);
  if (
    url.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')
  )
    throw new BiographerError('Invitation sharing is not configured', 503);
  return url.origin;
}
function link(kind: 'invite' | 'resume', token: string, locale: string) {
  return `${publicBase()}/${encodeURIComponent(locale)}/biographer/${kind}#${token}`;
}
async function setSession(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}
export async function createInvitation(authorId: string, projectId: string, input: unknown) {
  collaborationEnabled();
  const value = z
    .object({
      name: z.string().trim().min(1).max(120),
      relationship: z.string().trim().max(200).default(''),
    })
    .strict()
    .parse(input);
  const inviteToken = makeToken();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const existing = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.projectId, projectId), eq(participants.role, 'contributor')));
    if (existing.length >= 10) throw new BiographerError('Contributor limit reached', 429);
    const [participant] = await tx
      .insert(participants)
      .values({
        projectId,
        name: value.name,
        relationship: value.relationship,
        role: 'contributor',
        status: 'invited',
      })
      .returning();
    await tx.insert(invitations).values({
      projectId,
      participantId: participant.id,
      inviteHash: hash(inviteToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return {
      participant: {
        id: participant.id,
        name: participant.name,
        relationship: participant.relationship,
        status: 'invited',
      },
      inviteUrl: link('invite', inviteToken, project.locale),
    };
  });
}
export async function invitationLanding(token: string) {
  collaborationEnabled();
  const [item] = await db
    .select({ invitation: invitations, participant: participants, project: projects })
    .from(invitations)
    .innerJoin(participants, eq(participants.id, invitations.participantId))
    .innerJoin(projects, eq(projects.id, invitations.projectId))
    .where(eq(invitations.inviteHash, hash(parseToken(token))));
  if (
    !item ||
    item.invitation.claimedAt ||
    item.invitation.revokedAt ||
    item.invitation.expiresAt.getTime() < Date.now() ||
    item.project.status === 'deleting'
  )
    throw new BiographerError('Invitation unavailable', 404);
  const [inviter] = await db
    .select({ name: participants.name })
    .from(participants)
    .where(and(eq(participants.projectId, item.project.id), eq(participants.role, 'owner')));
  return {
    inviterName: inviter?.name || '',
    project: {
      id: item.project.id,
      title: item.project.title,
      subject: item.project.subject,
      purpose: item.project.purpose,
      locale: item.project.locale,
    },
    participant: {
      id: item.participant.id,
      name: item.participant.name,
      relationship: item.participant.relationship,
    },
  };
}
export async function claimInvitation(token: string, input: unknown) {
  collaborationEnabled();
  const value = z
    .object({
      consent: z.literal(true),
      name: z.string().trim().min(1).max(120).optional(),
      relationship: z.string().trim().max(200).optional(),
    })
    .strict()
    .parse(input);
  const tokenHash = hash(parseToken(token));
  const resumeToken = makeToken();
  const sessionToken = makeToken();
  const result = await db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.inviteHash, tokenHash));
    if (!candidate) throw new BiographerError('Invitation unavailable', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${candidate.projectId}))`);
    const [invitation] = await tx
      .update(invitations)
      .set({
        claimedAt: new Date(),
        resumeHash: hash(resumeToken),
        sessionHash: hash(sessionToken),
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .where(
        and(
          eq(invitations.id, candidate.id),
          sql`${invitations.claimedAt} IS NULL`,
          sql`${invitations.revokedAt} IS NULL`,
          sql`${invitations.expiresAt} > now()`,
        ),
      )
      .returning();
    if (!invitation) throw new BiographerError('Invitation unavailable', 404);
    const [project] = await tx.select().from(projects).where(eq(projects.id, invitation.projectId));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Invitation unavailable', 404);
    const [participant] = await tx
      .update(participants)
      .set({
        status: 'joined',
        consentAt: new Date(),
        ...(value.name ? { name: value.name } : {}),
        ...(value.relationship !== undefined ? { relationship: value.relationship } : {}),
      })
      .where(eq(participants.id, invitation.participantId))
      .returning();
    return {
      project: {
        id: project.id,
        title: project.title,
        subject: project.subject,
        purpose: project.purpose,
        locale: project.locale,
      },
      participant: {
        id: participant.id,
        name: participant.name,
        relationship: participant.relationship,
        status: participant.status,
      },
      resumeUrl: link('resume', resumeToken, project.locale),
    };
  });
  await setSession(sessionToken);
  return result;
}
export async function resumeInvitation(token: string) {
  collaborationEnabled();
  const resumeHash = hash(parseToken(token));
  const sessionToken = makeToken();
  const binding = await db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.resumeHash, resumeHash));
    if (!candidate) throw new BiographerError('Return link unavailable', 404);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${candidate.projectId}))`);
    const [invitation] = await tx
      .update(invitations)
      .set({
        sessionHash: hash(sessionToken),
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .where(
        and(
          eq(invitations.resumeHash, resumeHash),
          sql`${invitations.claimedAt} IS NOT NULL`,
          sql`${invitations.revokedAt} IS NULL`,
        ),
      )
      .returning();
    if (!invitation) throw new BiographerError('Return link unavailable', 404);
    await tx
      .update(participants)
      .set({ accessVersion: sql`${participants.accessVersion}+1` })
      .where(eq(participants.id, invitation.participantId));
    await tx
      .update(sessions)
      .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
      .where(
        and(
          eq(sessions.projectId, invitation.projectId),
          eq(sessions.participantId, invitation.participantId),
        ),
      );
    return { project: { id: invitation.projectId }, participant: { id: invitation.participantId } };
  });
  await setSession(sessionToken);
  return binding;
}
export async function guestSession() {
  collaborationEnabled();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new BiographerError('Authentication required', 401);
  const [item] = await db
    .select({ invitation: invitations, participant: participants, project: projects })
    .from(invitations)
    .innerJoin(participants, eq(participants.id, invitations.participantId))
    .innerJoin(projects, eq(projects.id, invitations.projectId))
    .where(
      and(
        eq(invitations.sessionHash, hash(token)),
        sql`${invitations.sessionExpiresAt} > now()`,
        sql`${invitations.revokedAt} IS NULL`,
        sql`${invitations.claimedAt} IS NOT NULL`,
      ),
    );
  if (!item || item.project.status === 'deleting')
    throw new BiographerError('Authentication required', 401);
  const requestHeaders = await headers();
  if (
    requestHeaders.get('x-biographer-project') !== item.project.id ||
    requestHeaders.get('x-biographer-participant') !== item.participant.id
  )
    throw new BiographerError(
      'This contribution session changed. Reopen your personal return link.',
      409,
    );
  return item;
}
export async function contributionDetail() {
  const { participant, project } = await guestSession();
  const savedTurns = await db
    .select()
    .from(turns)
    .where(and(eq(turns.projectId, project.id), eq(turns.participantId, participant.id)))
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
    .where(and(eq(segments.projectId, project.id), eq(segments.participantId, participant.id)))
    .orderBy(asc(segments.sequence));
  const savedAssets = await db
    .select({
      id: assets.id,
      caption: assets.caption,
      contentType: assets.contentType,
      included: assets.included,
    })
    .from(assets)
    .where(and(eq(assets.projectId, project.id), eq(assets.participantId, participant.id)));
  return {
    project: {
      id: project.id,
      title: project.title,
      subject: project.subject,
      purpose: project.purpose,
      locale: project.locale,
    },
    participant: {
      id: participant.id,
      name: participant.name,
      relationship: participant.relationship,
      status: participant.status,
      followUp: participant.followUp,
    },
    turns: savedTurns,
    segments: savedSegments,
    assets: savedAssets,
  };
}
export async function guestSaveTurn(input: unknown) {
  const { participant, project } = await guestSession();
  if (participant.status === 'closed') throw new BiographerError('Contributions closed', 423);
  const value = z
    .object({
      id: z.uuid(),
      text: z.string().trim().min(1).max(40000),
      role: z.literal('user').optional(),
      final: z.literal(true).optional(),
    })
    .strict()
    .parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const [current] = await tx
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, participant.id),
          eq(participants.accessVersion, participant.accessVersion),
        ),
      );
    if (!current || current.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    const [existing] = await tx.select().from(turns).where(eq(turns.id, value.id));
    if (existing) {
      if (
        existing.projectId !== project.id ||
        existing.participantId !== participant.id ||
        existing.originalText !== value.text
      )
        throw new BiographerError('Response conflict', 409);
      return { turn: existing };
    }
    const [turn] = await tx
      .insert(turns)
      .values({
        id: value.id,
        projectId: project.id,
        participantId: participant.id,
        role: 'user',
        text: value.text,
        originalText: value.text,
        final: true,
      })
      .returning();
    await tx
      .update(participants)
      .set({
        status: 'started',
        lastActivity: new Date(),
        contributionRevision: sql`${participants.contributionRevision}+1`,
      })
      .where(eq(participants.id, participant.id));
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
    return { turn };
  });
}

export async function listContributors(authorId: string, projectId: string) {
  collaborationEnabled();
  await ownedProject(authorId, projectId);
  const people = await db
    .select()
    .from(participants)
    .where(and(eq(participants.projectId, projectId), eq(participants.role, 'contributor')))
    .orderBy(asc(participants.name));
  const allTurns = await db.select().from(turns).where(eq(turns.projectId, projectId));
  const allSegments = await db.select().from(segments).where(eq(segments.projectId, projectId));
  const allAssets = await db.select().from(assets).where(eq(assets.projectId, projectId));
  const access = await db
    .select({
      participantId: invitations.participantId,
      claimedAt: invitations.claimedAt,
      revokedAt: invitations.revokedAt,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.projectId, projectId));
  return {
    contributors: people.map((person) => {
      const answers = allTurns.filter(
        (item) => item.participantId === person.id && item.role === 'user',
      );
      const invitation = access.find((item) => item.participantId === person.id);
      const accessStatus =
        !invitation || invitation.revokedAt
          ? 'revoked'
          : !invitation.claimedAt && invitation.expiresAt.getTime() < Date.now()
            ? 'expired'
            : 'active';
      return {
        accessStatus,
        id: person.id,
        name: person.name,
        relationship: person.relationship,
        status: person.status,
        lastActivity: person.lastActivity,
        responseCount: answers.filter((item) => item.final).length,
        recordedSeconds: Math.floor(
          allSegments
            .filter((item) => item.participantId === person.id)
            .reduce((sum, item) => sum + item.durationMs, 0) / 1000,
        ),
        wordCount: answers.reduce(
          (sum, item) => sum + (item.text.trim() ? item.text.trim().split(/\s+/u).length : 0),
          0,
        ),
        photoCount: allAssets.filter((item) => item.participantId === person.id).length,
        reviewed:
          person.reviewedRevision === person.contributionRevision &&
          person.contributionRevision > 0,
        newMaterial: person.contributionRevision > person.reviewedRevision,
      };
    }),
  };
}
export async function contributorDetail(
  authorId: string,
  projectId: string,
  participantId: string,
) {
  collaborationEnabled();
  await ownedProject(authorId, projectId);
  const [participant] = await db
    .select({
      id: participants.id,
      name: participants.name,
      relationship: participants.relationship,
      status: participants.status,
      lastActivity: participants.lastActivity,
      followUp: participants.followUp,
      reviewedRevision: participants.reviewedRevision,
      contributionRevision: participants.contributionRevision,
    })
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.projectId, projectId),
        eq(participants.role, 'contributor'),
      ),
    );
  if (!participant) throw new BiographerError('Contributor not found', 404);
  const savedTurns = await db
    .select()
    .from(turns)
    .where(and(eq(turns.projectId, projectId), eq(turns.participantId, participantId)))
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
    .where(and(eq(segments.projectId, projectId), eq(segments.participantId, participantId)))
    .orderBy(asc(segments.sequence));
  const savedAssets = await db
    .select({
      id: assets.id,
      caption: assets.caption,
      contentType: assets.contentType,
      included: assets.included,
    })
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.participantId, participantId)));
  return { participant, turns: savedTurns, segments: savedSegments, assets: savedAssets };
}
export async function manageContributor(
  authorId: string,
  projectId: string,
  participantId: string,
  input: unknown,
) {
  collaborationEnabled();
  const value = z
    .discriminatedUnion('action', [
      z.object({ action: z.literal('review'), revision: z.number().int().nonnegative() }),
      z.object({ action: z.literal('close') }),
      z.object({ action: z.literal('reopen') }),
      z.object({ action: z.literal('rotate') }),
      z.object({ action: z.literal('renew') }),
      z.object({ action: z.literal('revoke') }),
      z.object({ action: z.literal('followUp'), text: z.string().trim().max(1000) }),
    ])
    .parse(input);
  const token = value.action === 'rotate' || value.action === 'renew' ? makeToken() : undefined;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    const [person] = await tx
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.projectId, projectId),
          eq(participants.role, 'contributor'),
        ),
      );
    if (!project || project.status === 'deleting' || !person)
      throw new BiographerError('Contributor not found', 404);
    if (value.action === 'review') {
      if (value.revision !== person.contributionRevision)
        throw new BiographerError('Contribution changed; review it again', 409);
      await tx
        .update(participants)
        .set({ reviewedRevision: value.revision })
        .where(eq(participants.id, participantId));
    } else if (value.action === 'followUp')
      await tx
        .update(participants)
        .set({ followUp: value.text })
        .where(eq(participants.id, participantId));
    else if (value.action === 'renew') {
      const [invite] = await tx
        .update(invitations)
        .set({
          inviteHash: hash(token!),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          revokedAt: null,
        })
        .where(
          and(eq(invitations.participantId, participantId), sql`${invitations.claimedAt} IS NULL`),
        )
        .returning();
      if (!invite) throw new BiographerError('Invitation has already been accepted', 409);
      return { inviteUrl: link('invite', token!, project.locale) };
    } else if (value.action === 'revoke') {
      await tx
        .update(invitations)
        .set({ revokedAt: new Date(), sessionHash: null, sessionExpiresAt: null })
        .where(eq(invitations.participantId, participantId));
      await tx
        .update(participants)
        .set({ accessVersion: sql`${participants.accessVersion}+1` })
        .where(eq(participants.id, participantId));
      await tx
        .update(sessions)
        .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
        .where(and(eq(sessions.projectId, projectId), eq(sessions.participantId, participantId)));
      return { ok: true };
    } else if (value.action === 'rotate') {
      const [invitation] = await tx
        .update(invitations)
        .set({
          resumeHash: hash(token!),
          sessionHash: null,
          sessionExpiresAt: null,
          revokedAt: null,
        })
        .where(
          and(
            eq(invitations.participantId, participantId),
            sql`${invitations.claimedAt} IS NOT NULL`,
          ),
        )
        .returning();
      if (!invitation) throw new BiographerError('Invitation has not been accepted', 409);
      await tx
        .update(participants)
        .set({ accessVersion: sql`${participants.accessVersion}+1` })
        .where(eq(participants.id, participantId));
      await tx
        .update(sessions)
        .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
        .where(and(eq(sessions.projectId, projectId), eq(sessions.participantId, participantId)));
      return { resumeUrl: link('resume', token!, project.locale) };
    } else {
      await tx
        .update(participants)
        .set({
          status:
            value.action === 'close'
              ? 'closed'
              : person.contributionRevision
                ? 'started'
                : 'joined',
          accessVersion: sql`${participants.accessVersion}+1`,
        })
        .where(eq(participants.id, participantId));
      if (value.action === 'close')
        await tx
          .update(sessions)
          .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
          .where(and(eq(sessions.projectId, projectId), eq(sessions.participantId, participantId)));
    }
    return { ok: true };
  });
}
export async function finishContribution() {
  const { participant, project } = await guestSession();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const [saved] = await tx
      .update(participants)
      .set({ status: 'finished', lastActivity: new Date() })
      .where(
        and(
          eq(participants.id, participant.id),
          eq(participants.accessVersion, participant.accessVersion),
          sql`${participants.status} <> 'closed'`,
        ),
      )
      .returning();
    if (!saved) throw new BiographerError('Contributions closed', 423);
    return { ok: true };
  });
}

export async function ownerEditContribution(
  authorId: string,
  projectId: string,
  participantId: string,
  turnId: string,
  input: unknown,
) {
  collaborationEnabled();
  const value = z.object({ included: z.boolean() }).strict().parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    const [turn] = await tx
      .update(turns)
      .set({ included: value.included, updatedAt: new Date() })
      .where(
        and(
          eq(turns.projectId, projectId),
          eq(turns.participantId, participantId),
          eq(turns.id, turnId),
          eq(turns.role, 'user'),
        ),
      )
      .returning();
    if (!turn) throw new BiographerError('Response not found', 404);
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    return { turn };
  });
}
export async function ownerReadContributorAsset(
  authorId: string,
  projectId: string,
  participantId: string,
  id: string,
  type: 'segment' | 'photo',
) {
  await contributorDetail(authorId, projectId, participantId);
  const storage = await import('@/lib/biographer/storage');
  if (type === 'segment') {
    const [item] = await db
      .select({ id: segments.id })
      .from(segments)
      .where(
        and(
          eq(segments.id, id),
          eq(segments.projectId, projectId),
          eq(segments.participantId, participantId),
        ),
      );
    if (!item) throw new BiographerError('Audio not found', 404);
    const result = await storage.readSegment(authorId, projectId, id);
    return { bytes: result.bytes, contentType: result.segment.contentType };
  }
  const [item] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.id, id),
        eq(assets.projectId, projectId),
        eq(assets.participantId, participantId),
      ),
    );
  if (!item) throw new BiographerError('Photo not found', 404);
  return storage.readPhoto(authorId, projectId, id);
}

export async function guestIssueSession() {
  const { participant, project } = await guestSession();
  if (participant.status === 'closed') throw new BiographerError('Contributions closed', 423);
  const { issueSession } = await import('@/db/services/biographer');
  return issueSession(project.authorId, project.id, {
    participantId: participant.id,
    accessVersion: participant.accessVersion,
  });
}
export async function guestSaveSegment(input: unknown) {
  const { participant, project } = await guestSession();
  const { saveSegment } = await import('@/lib/biographer/storage');
  return saveSegment(project.authorId, project.id, input, {
    participantId: participant.id,
    accessVersion: participant.accessVersion,
  });
}
export async function guestSavePhoto(file: File, caption: string) {
  const { participant, project } = await guestSession();
  const { savePhoto } = await import('@/lib/biographer/storage');
  return savePhoto(project.authorId, project.id, file, caption, {
    participantId: participant.id,
    accessVersion: participant.accessVersion,
  });
}
export async function guestReadAsset(id: string, type: 'segment' | 'photo') {
  const { participant, project } = await guestSession();
  return ownerReadContributorAsset(project.authorId, project.id, participant.id, id, type);
}
export async function guestEditTurn(turnId: string, input: unknown) {
  const { participant, project } = await guestSession();
  const value = z
    .object({ text: z.string().trim().min(1).max(40000) })
    .strict()
    .parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const [current] = await tx
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, participant.id),
          eq(participants.accessVersion, participant.accessVersion),
        ),
      );
    if (!current || current.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    const [turn] = await tx
      .update(turns)
      .set({ text: value.text, revision: sql`${turns.revision}+1`, updatedAt: new Date() })
      .where(
        and(
          eq(turns.id, turnId),
          eq(turns.projectId, project.id),
          eq(turns.participantId, participant.id),
          eq(turns.role, 'user'),
        ),
      )
      .returning();
    if (!turn) throw new BiographerError('Response not found', 404);
    await tx
      .update(participants)
      .set({
        status: 'started',
        lastActivity: new Date(),
        contributionRevision: sql`${participants.contributionRevision}+1`,
      })
      .where(eq(participants.id, participant.id));
    await tx
      .update(projects)
      .set({
        revision: sql`${projects.revision}+1`,
        proposal: null,
        proposalRevision: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
    return { turn };
  });
}
export async function guestStopSession(sessionId: string) {
  const { participant, project } = await guestSession();
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.projectId, project.id),
        eq(sessions.participantId, participant.id),
      ),
    );
  if (!session) throw new BiographerError('Session not found', 404);
  const { leaseSession } = await import('@/db/services/biographer');
  if (session.consumedAt && !session.endedAt)
    return leaseSession(session.id, session.leaseId, true);
  return {
    allowed: false,
    remainingSeconds: Math.max(0, project.allowanceSeconds - project.liveSeconds),
  };
}
export async function guestSetStatus(input: unknown) {
  const value = z
    .object({ status: z.enum(['finished', 'in_progress']) })
    .strict()
    .parse(input);
  if (value.status === 'finished') return finishContribution();
  const { participant, project } = await guestSession();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const [saved] = await tx
      .update(participants)
      .set({ status: 'started', lastActivity: new Date() })
      .where(
        and(
          eq(participants.id, participant.id),
          eq(participants.accessVersion, participant.accessVersion),
          sql`${participants.status} <> 'closed'`,
        ),
      )
      .returning();
    if (!saved) throw new BiographerError('Contributions closed', 423);
    return { ok: true };
  });
}

export function requireGuestOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== publicBase()) throw new BiographerError('Forbidden', 403);
}

export async function resumeLanding(token: string) {
  collaborationEnabled();
  const [item] = await db
    .select({ invitation: invitations, participant: participants, project: projects })
    .from(invitations)
    .innerJoin(participants, eq(participants.id, invitations.participantId))
    .innerJoin(projects, eq(projects.id, invitations.projectId))
    .where(
      and(
        eq(invitations.resumeHash, hash(parseToken(token))),
        sql`${invitations.revokedAt} IS NULL`,
        sql`${invitations.claimedAt} IS NOT NULL`,
      ),
    );
  if (!item || item.project.status === 'deleting')
    throw new BiographerError('Return link unavailable', 404);
  return {
    project: {
      id: item.project.id,
      title: item.project.title,
      subject: item.project.subject,
      purpose: item.project.purpose,
      locale: item.project.locale,
    },
    participant: {
      id: item.participant.id,
      name: item.participant.name,
      relationship: item.participant.relationship,
      status: item.participant.status,
    },
  };
}
export async function guestInterview(input: unknown) {
  const { participant, project } = await guestSession();
  const saved = await guestSaveTurn(input);
  const digest = hash(`biographer-answer:${saved.turn.id}`);
  const assistantId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const [existingReply] = await db
    .select()
    .from(turns)
    .where(
      and(
        eq(turns.id, assistantId),
        eq(turns.projectId, project.id),
        eq(turns.participantId, participant.id),
        eq(turns.role, 'assistant'),
      ),
    );
  if (existingReply) return { turn: saved.turn, question: existingReply.text };
  const all = await db
    .select({
      id: turns.id,
      role: turns.role,
      text: turns.text,
      participantId: turns.participantId,
      contributorName: participants.name,
    })
    .from(turns)
    .innerJoin(participants, eq(participants.id, turns.participantId))
    .where(and(eq(turns.projectId, project.id), eq(turns.included, true)))
    .orderBy(asc(turns.createdAt));
  const own = all.filter((turn) => turn.participantId === participant.id);
  const shared = all
    .filter(
      (turn) => turn.participantId !== participant.id && turn.role === 'user' && turn.text.trim(),
    )
    .slice(-30)
    .map((turn) => ({
      sourceId: turn.id,
      contributorName: turn.contributorName,
      text: turn.text.slice(0, 2000),
    }));
  const photos = await db
    .select({ objectPath: assets.objectPath, contentType: assets.contentType })
    .from(assets)
    .where(
      and(
        eq(assets.projectId, project.id),
        eq(assets.participantId, participant.id),
        eq(assets.included, true),
      ),
    )
    .orderBy(desc(assets.createdAt))
    .limit(3);
  const { sgwFetch } = await import('@/lib/sgw-client');
  const response = await sgwFetch('/api/biographer/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorId: project.authorId,
      projectId: project.id,
      participantId: participant.id,
      photoReferences: photos.map((photo) => ({ ...photo, participantId: participant.id })),
      locale: project.locale,
      history: own.slice(-80).map(({ role, text }) => ({ role, text: text.slice(0, 4000) })),
      context: {
        projectTitle: project.title,
        subject: project.subject,
        purpose: project.purpose,
        sharedMemories: shared,
        followUps: participant.followUp ? [participant.followUp] : [],
      },
      userText: saved.turn.text,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new BiographerError('Interview unavailable. Your memory is saved.', 503);
  const output = z
    .object({ question: z.string().trim().min(1).max(1200) })
    .parse(await response.json());
  const answer = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const [current] = await tx
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, participant.id),
          eq(participants.accessVersion, participant.accessVersion),
        ),
      );
    if (!current || current.status === 'closed')
      throw new BiographerError('Contributions closed', 423);
    await tx
      .insert(turns)
      .values({
        id: assistantId,
        projectId: project.id,
        participantId: participant.id,
        role: 'assistant',
        text: output.question,
        originalText: output.question,
        final: true,
      })
      .onConflictDoNothing();
    const [stored] = await tx
      .select()
      .from(turns)
      .where(
        and(
          eq(turns.id, assistantId),
          eq(turns.projectId, project.id),
          eq(turns.participantId, participant.id),
          eq(turns.role, 'assistant'),
        ),
      );
    if (!stored) throw new BiographerError('Response conflict', 409);
    return stored.text;
  });
  return { turn: saved.turn, question: answer };
}
