import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { literaryPersonaEnum } from '@/db/schema/enums';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import {
  biographerParticipants as participants,
  biographerProjects as projects,
  biographerTurns as turns,
  biographerBookVersions as versions,
  stories,
} from '@/db/schema';
import { detail, BiographerError, saveTurn } from '@/db/services/biographer';
import { sgwFetch } from '@/lib/sgw-client';
async function call(path: string, payload: unknown) {
  const response = await sgwFetch(path, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok)
    throw new BiographerError('Biographer is unavailable. Your saved memories are safe.', 503);
  return response.json();
}
export async function interview(authorId: string, projectId: string, input: unknown) {
  const { turn } = { turn: await saveTurn(authorId, projectId, input) };
  const data = await detail(authorId, projectId);
  const { biographerAssets } = await import('@/db/schema/biographer');
  const photos = await db
    .select({ objectPath: biographerAssets.objectPath, contentType: biographerAssets.contentType })
    .from(biographerAssets)
    .where(
      and(
        eq(biographerAssets.projectId, projectId),
        eq(biographerAssets.participantId, data.participant.id),
        eq(biographerAssets.included, true),
      ),
    )
    .orderBy(desc(biographerAssets.createdAt))
    .limit(3);
  const result = await call('/api/biographer/interview', {
    participantId: data.participant.id,
    photoReferences: photos.map((photo) => ({ ...photo, participantId: data.participant.id })),

    authorId,
    projectId,
    locale: data.project.locale,
    history: data.turns
      .filter((t) => t.included)
      .slice(-80)
      .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) })),
    context: {
      projectTitle: data.project.title,
      subject: data.project.subject,
      purpose: data.project.purpose,
      photoCaptions: data.assets
        .filter((a) => a.included)
        .map((a) => a.caption.slice(0, 2000))
        .filter(Boolean)
        .slice(-20),
    },
    userText: turn.text,
  });
  if (typeof result.question !== 'string' || result.question.length > 40000)
    throw new BiographerError('Invalid interview response', 502);
  await db.insert(turns).values({
    id: randomUUID(),
    projectId,
    participantId: data.participant.id,
    role: 'assistant',
    text: result.question,
    originalText: result.question,
    final: true,
  });
  return { turn, question: result.question };
}
export async function proposal(authorId: string, projectId: string, input: unknown = {}) {
  const settings = z
    .object({
      literaryPersona: z.enum(literaryPersonaEnum.enumValues).default('contextual-storyteller'),
      researchPlaces: z
        .array(
          z.object({
            place: z.string().trim().min(1).max(200),
            period: z.string().trim().max(200).default(''),
          }),
        )
        .max(20)
        .default([]),
    })
    .parse(input);
  const data = await detail(authorId, projectId);
  const included = data.turns.filter((t) => t.included);
  const people = await db
    .select({ id: participants.id, name: participants.name })
    .from(participants)
    .where(eq(participants.projectId, projectId));
  const names = new Map(people.map((person) => [person.id, person.name]));
  if (!included.some((t) => t.role === 'user'))
    throw new BiographerError('Share a memory before creating your book proposal');
  if (included.some((t) => t.role === 'user' && (!t.final || !t.text.trim())))
    throw new BiographerError(
      'Finish transcribing or exclude pending recordings before creating a proposal',
      409,
    );
  const result = await call('/api/biographer/proposal', {
    authorId,
    projectId,
    history: included.slice(-8).map(({ role, text }) => ({ role, text })),
    context: {
      projectTitle: data.project.title,
      subject: data.project.subject,
      purpose: data.project.purpose,
      places: settings.researchPlaces.map((p) => p.place),
      period: settings.researchPlaces
        .map((p) => p.period)
        .filter(Boolean)
        .join('; ')
        .slice(0, 200),
    },
    locale: data.project.locale,
    title: data.project.title,
    subject: data.project.subject,
    purpose: data.project.purpose,
    turns: included.map(({ id, role, text, participantId }) => ({
      id,
      role,
      text,
      participantId,
      contributorName: names.get(participantId) || 'Contributor',
    })),
    persona: settings.literaryPersona,
    targetWords: 20000,
  });
  if (
    !Array.isArray(result.chapters) ||
    !result.chapters.length ||
    result.chapters.length > 20 ||
    typeof result.title !== 'string'
  )
    throw new BiographerError('Invalid book proposal', 502);
  const [project] = await db
    .update(projects)
    .set({
      proposal: result,
      revision: sql`${projects.revision}+1`,
      proposalRevision: sql`${projects.revision}+1`,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.revision, data.project.revision)))
    .returning();
  if (!project)
    throw new BiographerError(
      'Memories changed while preparing the proposal. Please try again.',
      409,
    );
  return { proposal: result, revision: project.revision };
}
export async function approve(authorId: string, projectId: string, revision: number) {
  return db.transaction(async (tx) => {
    await tx.execute(
      (await import('drizzle-orm')).sql`select pg_advisory_xact_lock(hashtext(${projectId}))`,
    );
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project) throw new BiographerError('Project not found', 404);
    if (!project.proposal || project.proposalRevision !== revision || project.revision !== revision)
      throw new BiographerError('Review the latest proposal before continuing', 409);
    const [existingVersion] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.projectId, projectId), eq(versions.revision, revision)));
    if (existingVersion) return { storyId: existingVersion.storyId };
    const source = await tx
      .select({
        id: turns.id,
        role: turns.role,
        text: turns.text,
        participantId: turns.participantId,
        contributorName: participants.name,
      })
      .from(turns)
      .innerJoin(participants, eq(participants.id, turns.participantId))
      .where(and(eq(turns.projectId, projectId), eq(turns.included, true)));
    const p = project.proposal;
    const [story] = await tx
      .insert(stories)
      .values({
        authorId,
        title: String(p.title).slice(0, 255),
        synopsis: String(p.synopsis ?? ''),
        plotDescription: String(p.synopsis ?? ''),
        storyLanguage: project.locale,
        additionalRequests: '[MYTHORIA_BIOGRAPHER_V1]',
        status: 'draft',
        targetAudience: 'adult_18+',
        novelStyle: 'biography',
        literaryPersona: z.enum(literaryPersonaEnum.enumValues).parse(p.persona),
        chapterCount: (p.chapters as unknown[]).length,
        isPublic: false,
      })
      .returning();
    const { biographerAssets } = await import('@/db/schema/biographer');
    const photos = await tx
      .select()
      .from(biographerAssets)
      .where(and(eq(biographerAssets.projectId, projectId), eq(biographerAssets.included, true)));
    const snapshot = {
      ...p,
      schemaVersion: 1,
      personaVersion: 1,
      projectId,
      revision,
      turns: source,
      referenceImages: photos.map((photo) => ({
        participantId: photo.participantId,
        objectPath: photo.objectPath,
        mimeType: photo.contentType,
        caption: photo.caption,
      })),
    };
    await tx.insert(versions).values({ storyId: story.storyId, projectId, revision, snapshot });
    await tx
      .update(projects)
      .set({
        storyId: story.storyId,
        generationSnapshot: snapshot,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    return { storyId: story.storyId };
  });
}

/** Preserve research, persona and source links while allowing editorial adjustments. */
export async function editProposal(authorId: string, projectId: string, input: unknown) {
  const chapterSchema = z
    .object({
      number: z.number().int().positive().max(20),
      title: z.string().trim().min(1).max(300),
      synopsis: z.string().trim().min(1).max(4000),
      sourceTurnIds: z.array(z.uuid()).min(1).max(1000),
    })
    .strict();
  const value = z
    .object({
      revision: z.number().int().nonnegative(),
      title: z.string().trim().min(1).max(500),
      synopsis: z.string().trim().min(1).max(8000),
      chapters: z.array(chapterSchema).min(1).max(20),
    })
    .strict()
    .parse(input);
  return db.transaction(async (tx) => {
    const { sql } = await import('drizzle-orm');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
    if (!project || project.status === 'deleting')
      throw new BiographerError('Project not found', 404);
    if (
      !project.proposal ||
      project.revision !== value.revision ||
      project.proposalRevision !== value.revision
    )
      throw new BiographerError('Proposal is out of date', 409);
    const previous = z.array(chapterSchema).safeParse(project.proposal.chapters);
    if (
      !previous.success ||
      previous.data.length !== value.chapters.length ||
      value.chapters.some(
        (chapter, index) =>
          chapter.number !== previous.data[index]?.number ||
          JSON.stringify(chapter.sourceTurnIds) !==
            JSON.stringify(previous.data[index]?.sourceTurnIds),
      )
    )
      throw new BiographerError('Chapter source assignments cannot be changed here', 400);
    const next = {
      ...project.proposal,
      title: value.title,
      synopsis: value.synopsis,
      chapters: value.chapters,
    };
    const revision = project.revision + 1;
    await tx
      .update(projects)
      .set({ proposal: next, revision, proposalRevision: revision, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    return { proposal: next, revision };
  });
}
