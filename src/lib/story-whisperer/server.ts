import { and, asc, eq, exists, getTableColumns, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createLogger, format, transports } from 'winston';
import { db } from '@/db';
import { STORY_INTENTS } from '@/constants/intents';
import {
  biographerAssets as assets,
  biographerParticipants as participants,
  biographerProjects as projects,
  biographerTurns as turns,
  biographerSegments as segments,
  biographerSessions as sessions,
  characters,
  stories,
  storyWhispererDeletedDrafts as deletedDrafts,
  storyWhispererHandoffs as handoffs,
  storyWhispererInterviews as interviews,
} from '@/db/schema';
import { BiographerError, saveOwnerTurn } from '@/db/services/biographer';
import { settleResetVoiceSessions } from '@/db/services/whisperer-voice';
import { audioRetentionMs } from '@/lib/biographer/audio-retention';
import { projectInput, turnInput } from '@/lib/biographer/validation';
import { sgwFetch } from '@/lib/sgw-client';
import { characterReferenceSchema, storyPreferencesSchema } from '@/lib/story-templates/journey';
import { STORY_BRIEF_MAX_LENGTH } from '@/lib/story-templates/story-input-limit';
import {
  deleteWhispererDraftMedia,
  privateWhispererBucket,
  whispererDraftMediaPrefix,
} from './private-media';
import { getWhispererOpening } from './opening.server';
import {
  answeredQuestions,
  chunkEvidence,
  questionOptions,
  saveQuestionOptions,
  joinEvidence,
  modelHistory,
  modelOpening,
  whispererUuid,
  type EvidenceEntry,
} from './seed';
import {
  essentials,
  readinessRevisionChanged,
  readinessStates,
  whispererRubricVersion,
  type WhispererContext,
  type WhispererReadiness,
} from './types';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const emptyReadiness: WhispererReadiness = {
  rubricVersion: whispererRubricVersion,
  ready: false,
  missing: [...essentials],
  areas: { characters: 'missing', setting: 'missing', plot: 'missing' },
  hint: '',
};
const storyPath = z.string().min(1).max(1024);
const startInput = projectInput
  .pick({ locale: true, consent: true })
  .partial({ consent: true })
  .extend({
    primaryIntent: z.enum(STORY_INTENTS).optional(),
    brief: z.string().max(STORY_BRIEF_MAX_LENGTH).optional(),
    imageObjectPaths: z.array(storyPath).max(3).optional(),
    audioObjectPath: storyPath.nullable().optional(),
    characterIds: z.array(z.uuid()).max(50).optional(),
  });
const handoffInput = z
  .object({
    revision: z.number().int().nonnegative(),
    retryOf: z.uuid().optional(),
    brief: z.string().max(STORY_BRIEF_MAX_LENGTH),
    imageObjectPaths: z.array(z.string().min(1).max(1024)).max(3),
    audioObjectPath: z.string().min(1).max(1024).optional(),
    characterIds: z.array(z.uuid()).max(50).optional(),
    storyPreferences: storyPreferencesSchema.optional(),
    factuality: z.literal('memory').optional(),
    characterReferences: z.array(characterReferenceSchema).max(1).optional(),
  })
  .strict();

const sgwResult = z.object({
  readiness: z.object({
    rubricVersion: z.literal(whispererRubricVersion),
    areas: z.object({
      characters: z.enum(readinessStates),
      setting: z.enum(readinessStates),
      plot: z.enum(readinessStates),
    }),
    hint: z.string().trim().max(500),
  }),
  question: z.string().trim().min(1).max(4000).optional(),
  choices: z.array(z.string().trim().min(1).max(250)).max(6).optional(),
  choicesMode: z.enum(['button', 'single', 'multiple']).optional(),
});

const maxDictationBytes = 1_920_000;
const dictationInput = z
  .object({
    data: z
      .base64()
      .min(4)
      .max(Math.ceil(maxDictationBytes / 3) * 4),
    contentType: z.literal('audio/pcm;rate=16000'),
    capturedAt: z.iso.datetime(),
  })
  .strict();

function bindingKey(authorId: string, draftId: string) {
  return and(eq(interviews.authorId, authorId), eq(interviews.draftId, draftId));
}

function deletedDraftKey(authorId: string, draftId: string) {
  return and(eq(deletedDrafts.authorId, authorId), eq(deletedDrafts.draftId, draftId));
}

async function requireUndeletedDraft(tx: Transaction, authorId: string, draftId: string) {
  const [deleted] = await tx
    .select({ draftId: deletedDrafts.draftId })
    .from(deletedDrafts)
    .where(deletedDraftKey(authorId, draftId));
  if (deleted) throw new BiographerError('Story was deleted', 410);
}

async function findDraft(
  tx: Transaction,
  authorId: string,
  draftId: string,
  requireStory = false,
  requireEditable = true,
) {
  await requireUndeletedDraft(tx, authorId, draftId);
  const [story] = await tx
    .select({
      authorId: stories.authorId,
      status: stories.status,
      generationStatus: stories.storyGenerationStatus,
    })
    .from(stories)
    .where(eq(stories.storyId, draftId));
  if ((!story && requireStory) || (story && story.authorId !== authorId))
    throw new BiographerError('Story not found', 404);
  if (
    requireEditable &&
    story &&
    (!['temporary', 'draft'].includes(story.status ?? '') ||
      ['queued', 'running', 'completed'].includes(story.generationStatus ?? ''))
  )
    throw new BiographerError('Story is no longer an editable draft', 409);
}

async function withBinding<T>(
  authorId: string,
  draftId: string,
  action: (tx: Transaction) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`story-whisperer:${authorId.toLowerCase()}:${draftId.toLowerCase()}`}))`,
    );
    return action(tx);
  });
}

async function readInterview(tx: Transaction, authorId: string, draftId: string) {
  const [binding] = await tx.select().from(interviews).where(bindingKey(authorId, draftId));
  if (!binding) return null;

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${binding.projectId}))`);
  const [project] = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, binding.projectId), eq(projects.authorId, authorId)));
  if (!project || project.status === 'deleting') return null;
  const [participant] = await tx
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.projectId, project.id), eq(participants.role, 'owner')));
  if (!participant) return null;

  const savedTurns = await tx
    .select({
      ...getTableColumns(turns),
      recoverableAudio: exists(
        tx
          .select({ id: segments.id })
          .from(segments)
          .where(
            and(
              eq(segments.projectId, project.id),
              eq(segments.turnId, turns.id),
              sql`${segments.createdAt} > now() - interval '7 days'`,
            ),
          ),
      ),
    })
    .from(turns)
    .where(and(eq(turns.projectId, project.id), eq(turns.participantId, participant.id)))
    .orderBy(asc(turns.createdAt), asc(turns.id));
  const savedPhotos = await tx
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, project.id), eq(assets.participantId, participant.id)))
    .orderBy(asc(assets.createdAt), asc(assets.id));

  return { binding, project, participant, savedTurns, savedPhotos };
}

type Interview = NonNullable<Awaited<ReturnType<typeof readInterview>>>;

function hasCurrentReadiness({ binding, project }: Interview) {
  return (
    binding.readinessRevision === project.revision &&
    binding.readiness?.rubricVersion === whispererRubricVersion
  );
}

function publicInterview(data: Interview | null) {
  if (!data) return null;
  const { binding, project, savedTurns, savedPhotos } = data;
  const { brief, characterIds, imageObjectPaths, audioObjectPath } = binding.context ?? {};
  const readinessIsCurrent = hasCurrentReadiness(data);
  const hasEvidence = hasReadinessEvidence(data);
  const previousReadiness = binding.readiness;
  const readiness =
    previousReadiness && previousReadiness.rubricVersion === whispererRubricVersion
      ? readinessIsCurrent
        ? previousReadiness
        : {
            ...emptyReadiness,
            ...(hasEvidence && {
              areas: previousReadiness.areas,
              missing: previousReadiness.missing,
            }),
            firstReadyTurnId: previousReadiness.firstReadyTurnId,
          }
      : emptyReadiness;
  return {
    projectId: project.id,
    revision: project.revision,
    locale: project.locale,
    primaryIntent: binding.context?.primaryIntent,
    opening: binding.context?.opening,
    savedInputs: { brief, characterIds, imageObjectPaths, audioObjectPath },
    readiness,
    readinessNeedsRefresh: !readinessIsCurrent && hasEvidence,
    turns: savedTurns.map((turn) => ({
      ...turn,
      ...questionOptions(turn, binding.latestQuestion),
    })),
    assets: savedPhotos.map(({ id, contentType, caption, included }) => ({
      id,
      contentType,
      caption,
      included,
    })),
  };
}

export async function getWhisperer(authorId: string, draftId: string) {
  return withBinding(authorId, draftId, async (tx) => {
    await findDraft(tx, authorId, draftId, false, false);
    return { interview: publicInterview(await readInterview(tx, authorId, draftId)) };
  });
}

const uploadPathPattern = /^([0-9a-f-]{36})\/inputs\/([\w.-]+)$/i;

async function authorizeInputPaths(
  tx: Transaction,
  authorId: string,
  draftId: string,
  paths: string[],
) {
  const otherStories = new Set<string>();
  for (const path of paths) {
    const match = uploadPathPattern.exec(path);
    if (!match || match[2] === '..' || match[2] === '.')
      throw new BiographerError('Invalid story input path', 400);
    if (match[1] !== authorId && match[1] !== draftId) otherStories.add(z.uuid().parse(match[1]));
  }
  if (otherStories.size) {
    const owned = await tx
      .select({ id: stories.storyId })
      .from(stories)
      .where(and(eq(stories.authorId, authorId), inArray(stories.storyId, [...otherStories])));
    if (owned.length !== otherStories.size) throw new BiographerError('Story input not found', 404);
  }
}

async function resolveContext(
  tx: Transaction,
  authorId: string,
  draftId: string,
  input: z.infer<typeof startInput>,
  previous: WhispererContext,
): Promise<WhispererContext> {
  await authorizeInputPaths(tx, authorId, draftId, [
    ...(input.imageObjectPaths ?? []),
    ...(input.audioObjectPath ? [input.audioObjectPath] : []),
  ]);
  let characterNames = previous.characterNames;
  if (input.characterIds) {
    const ids = [...new Set(input.characterIds)];
    const owned = ids.length
      ? await tx
          .select({ name: characters.name })
          .from(characters)
          .where(and(eq(characters.authorId, authorId), inArray(characters.characterId, ids)))
          .orderBy(asc(characters.characterId))
      : [];
    if (owned.length !== ids.length) throw new BiographerError('Character not found', 404);
    characterNames = owned.map(({ name }) => name);
  }
  return {
    ...previous,
    brief: input.brief ?? previous.brief,
    characterNames,
    characterIds: input.characterIds ? [...new Set(input.characterIds)] : previous.characterIds,
    imageObjectPaths: input.imageObjectPaths ?? previous.imageObjectPaths,
    audioObjectPath:
      input.audioObjectPath === null
        ? undefined
        : (input.audioObjectPath ?? previous.audioObjectPath),
  };
}

function contextKey(context: WhispererContext) {
  return JSON.stringify([
    context.brief,
    context.characterNames,
    context.characterIds,
    context.imageObjectPaths,
    context.audioObjectPath,
  ]);
}

export async function startWhisperer(
  authorId: string,
  name: string,
  draftId: string,
  raw: unknown,
  expectedProjectId?: string,
) {
  const input = startInput.parse(raw);
  const start = () =>
    withBinding(authorId, draftId, async (tx) => {
      await findDraft(tx, authorId, draftId);
      const previous = await readInterview(tx, authorId, draftId);
      if (expectedProjectId && previous?.project.id !== expectedProjectId)
        throw new BiographerError('Interview changed. Please reload.', 409);
      let context = await resolveContext(
        tx,
        authorId,
        draftId,
        input,
        previous?.binding.context ?? {},
      );
      if (previous) {
        const initializeOpening =
          !!expectedProjectId && !context.opening && previous.savedTurns.length === 0;
        if (initializeOpening) {
          const primaryIntent = context.primaryIntent ?? input.primaryIntent;
          context = {
            ...context,
            primaryIntent,
            opening: getWhispererOpening(previous.project.locale, primaryIntent),
          };
        }
        if (
          initializeOpening ||
          contextKey(previous.binding.context ?? {}) !== contextKey(context)
        ) {
          if (!expectedProjectId)
            throw new BiographerError('Interview changed. Please reload.', 409);
          await tx
            .update(interviews)
            .set({ context })
            .where(eq(interviews.projectId, previous.project.id));
          await tx
            .update(projects)
            .set({ revision: sql`${projects.revision}+1`, updatedAt: new Date() })
            .where(eq(projects.id, previous.project.id));
          return { interview: publicInterview(await readInterview(tx, authorId, draftId)) };
        }
        return { interview: publicInterview(previous) };
      }

      const key = bindingKey(authorId, draftId);
      const [deleting] = await tx
        .select({ projectId: interviews.projectId })
        .from(interviews)
        .where(key);
      if (deleting) return { deletingProjectId: deleting.projectId } as const;

      const [project] = await tx
        .insert(projects)
        .values({ authorId, locale: input.locale })
        .returning();
      await tx.insert(participants).values({
        projectId: project.id,
        name,
        role: 'owner',
        // Older clients can still report an explicit checkbox acceptance.
        consentAt: input.consent ? new Date() : null,
      });
      await tx.insert(interviews).values({
        authorId,
        draftId,
        projectId: project.id,
        context: {
          ...context,
          primaryIntent: input.primaryIntent,
          opening: getWhispererOpening(input.locale, input.primaryIntent),
        },
      });
      return { interview: publicInterview(await readInterview(tx, authorId, draftId)) };
    });
  const initial = await start();
  if (!initial.deletingProjectId) return { interview: initial.interview };

  // A reset may have closed access before a storage failure. Reloading Step 2
  // can finish that reset without needing the previous tab's in-memory ID.
  await resetWhisperer(authorId, draftId, initial.deletingProjectId);
  const resumed = await start();
  if (resumed.deletingProjectId)
    throw new BiographerError('Finish deleting the previous interview first', 409);
  return { interview: resumed.interview };
}

async function closeWhispererProject(tx: Transaction, authorId: string, projectId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
  await settleResetVoiceSessions(tx, authorId, projectId);
  await tx
    .update(projects)
    .set({ status: 'deleting', liveEnabled: false })
    .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
  await tx
    .update(sessions)
    .set({ endedAt: new Date(), ticketExpiresAt: new Date(0) })
    .where(and(eq(sessions.projectId, projectId), sql`${sessions.endedAt} is null`));
}

const whispererLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'story-whisperer' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

async function deleteResetFiles(bucket: ReturnType<typeof privateWhispererBucket>, prefix: string) {
  try {
    await bucket.deleteFiles({ prefix, force: true });
  } catch (error) {
    // The SDK aggregates object deletion failures after a successful listing.
    // A concurrent cleanup may have already removed those objects.
    if (!Array.isArray(error) || !error.length || !error.every((item) => item?.code === 404))
      throw error;
  }
}

type ResetStage = 'closeProject' | 'findCopies' | 'deleteFiles' | 'deleteRecords';

export async function resetWhisperer(authorId: string, draftId: string, expectedProjectId: string) {
  const started = performance.now();
  const stageMs: Partial<Record<ResetStage, number>> = {};
  let failedStage: ResetStage | undefined;
  let outcome: 'deleted' | 'alreadyRemoved' | 'failed' = 'failed';
  const time = async <T>(stage: ResetStage, action: () => Promise<T>) => {
    const stageStart = performance.now();
    try {
      return await action();
    } catch (error) {
      failedStage = stage;
      throw error;
    } finally {
      stageMs[stage] = Math.round(performance.now() - stageStart);
    }
  };
  try {
    const projectId = await time('closeProject', () =>
      withBinding(authorId, draftId, async (tx) => {
        const [binding] = await tx.select().from(interviews).where(bindingKey(authorId, draftId));
        if (!binding) return null;
        if (binding.projectId !== expectedProjectId)
          throw new BiographerError('Interview changed. Please reload.', 409);
        await requireUndeletedDraft(tx, authorId, draftId);
        await closeWhispererProject(tx, authorId, binding.projectId);
        return binding.projectId;
      }),
    );
    if (!projectId) {
      outcome = 'alreadyRemoved';
      return { interview: null };
    }
    const unsubmittedKey = and(
      eq(handoffs.projectId, projectId),
      eq(handoffs.dispatchReserved, false),
    );
    const unsubmitted = await time('findCopies', async () =>
      db.select({ requestId: handoffs.requestId }).from(handoffs).where(unsubmittedKey),
    );
    await time('deleteFiles', async () => {
      const bucket = privateWhispererBucket();
      await deleteResetFiles(bucket, `biographer/${projectId}/`);
      for (const { requestId } of unsubmitted) {
        await deleteResetFiles(bucket, `${whispererDraftMediaPrefix(draftId)}${requestId}-`);
      }
    });
    await time('deleteRecords', () =>
      db.transaction(async (tx) => {
        await tx.delete(handoffs).where(unsubmittedKey);
        await tx
          .delete(projects)
          .where(and(eq(projects.id, projectId), eq(projects.authorId, authorId)));
      }),
    );
    outcome = 'deleted';
    return { interview: null };
  } finally {
    const timings = {
      outcome,
      failedStage,
      stageMs,
      totalMs: Math.round(performance.now() - started),
    };
    if (outcome === 'failed') whispererLogger.warn('Story Whisperer reset timings', timings);
    else whispererLogger.info('Story Whisperer reset timings', timings);
  }
}

export async function requireStandaloneBiography(projectId: string) {
  const [binding] = await db
    .select({ projectId: interviews.projectId })
    .from(interviews)
    .where(eq(interviews.projectId, projectId));
  if (binding) throw new BiographerError('Project not found', 404);
}

function requireInterview(data: Interview | null) {
  if (!data) throw new BiographerError('Interview not found', 404);
  return data;
}

async function getInterview(authorId: string, draftId: string, expectedProjectId: string) {
  return withBinding(authorId, draftId, async (tx) => {
    await findDraft(tx, authorId, draftId);
    const data = requireInterview(await readInterview(tx, authorId, draftId));
    if (data.project.id !== expectedProjectId)
      throw new BiographerError('Interview changed. Please reload.', 409);
    return data;
  });
}

async function whispererRequest(path: string, payload: unknown) {
  const response = await sgwFetch(path, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new BiographerError('Story Whisperer is unavailable', 503);
  return response.json() as Promise<unknown>;
}

function finalizedTurns(data: Interview) {
  return data.savedTurns.filter(({ final, included, text }) => final && included && text.trim());
}

function withFirstReadyTurn(data: Interview, readiness: WhispererReadiness): WhispererReadiness {
  const previousReadiness = data.binding.readiness;
  const previousAnchor =
    previousReadiness?.rubricVersion === whispererRubricVersion
      ? previousReadiness.firstReadyTurnId
      : undefined;
  const firstReadyTurnId =
    previousAnchor ??
    (readiness.ready
      ? finalizedTurns(data).findLast(({ role }) => role === 'user')?.id
      : undefined);
  return firstReadyTurnId ? { ...readiness, firstReadyTurnId } : readiness;
}

function hasReadinessEvidence(data: Interview) {
  return (
    finalizedTurns(data).some((turn) => turn.role === 'user') ||
    data.savedPhotos.some(({ included, caption }) => included && !!caption.trim()) ||
    !!data.binding.context?.brief?.trim() ||
    !!data.binding.context?.characterNames?.length
  );
}

async function condense(data: Interview, entries: EvidenceEntry[], maxLength: number) {
  const result = z.object({ text: z.string().trim().min(1).max(maxLength) }).safeParse(
    await whispererRequest('/api/biographer/whisperer/condense', {
      authorId: data.project.authorId,
      projectId: data.project.id,
      locale: data.project.locale,
      entries,
      maxLength,
    }),
  );
  if (!result.success) throw new BiographerError('Unable to compile interview material', 502);
  return result.data.text;
}

async function fitEvidence(data: Interview, entries: EvidenceEntry[]) {
  let current = entries;
  while (joinEvidence(current).length > STORY_BRIEF_MAX_LENGTH) {
    const chunks = chunkEvidence(current);
    if (chunks.length === 1) return condense(data, chunks[0], STORY_BRIEF_MAX_LENGTH);
    const condensed: string[] = [];
    for (const chunk of chunks) condensed.push(await condense(data, chunk, 15_000));
    current = condensed;
  }
  return joinEvidence(current);
}

async function assessmentTurns(data: Interview) {
  const source = data.savedTurns.map((turn) => ({
    ...turn,
    ...questionOptions(turn, data.binding.latestQuestion),
  }));
  const valid = modelHistory(source);
  const turns = valid.map(({ role, text, choices }) => ({
    role,
    text,
    ...(choices?.length ? { choices } : {}),
  }));
  if (
    turns.length <= 300 &&
    turns.reduce(
      (size, turn) => size + turn.text.length + (turn.choices?.join('').length ?? 0),
      0,
    ) <= 400_000
  )
    return turns;
  // Keep the pending question with the first recent answer across the cut.
  let cut = turns.length - 6;
  if (cut > 0 && turns[cut].role === 'user' && turns[cut - 1].role === 'assistant') cut--;
  const recent = turns.slice(cut);
  const priorEvidence = answeredQuestions(
    source.slice(0, source.indexOf(valid[cut])),
    data.binding.context?.opening,
  );
  const historical = await fitEvidence(data, priorEvidence);
  return [...(historical ? [{ role: 'user', text: historical }] : []), ...recent];
}

async function assess(data: Interview, requestQuestion: boolean) {
  const output = sgwResult.safeParse(
    await whispererRequest('/api/biographer/whisperer', {
      authorId: data.project.authorId,
      projectId: data.project.id,
      locale: data.project.locale,
      turns: await assessmentTurns(data),
      context: {
        primaryIntent: data.binding.context?.primaryIntent,
        opening: modelOpening(data.binding.context?.opening, data.savedTurns[0]),
        brief: data.binding.context?.brief,
        characterNames: data.binding.context?.characterNames,
        imageCount: data.binding.context?.imageObjectPaths?.length,
        hasAudio: Boolean(data.binding.context?.audioObjectPath),
      },
      photos: data.savedPhotos
        .filter(({ included }) => included)
        .slice(-20)
        .map(({ caption }) => ({ caption })),
      requestQuestion,
    }),
  );
  if (!output.success) throw new BiographerError('Invalid Story Whisperer response', 502);
  const missing = essentials.filter((key) => output.data.readiness.areas[key] !== 'ready');
  return {
    ...output.data,
    readiness: {
      ...output.data.readiness,
      ready: !missing.length,
      missing,
    },
  };
}

export async function refreshWhispererReadiness(
  authorId: string,
  draftId: string,
  expectedProjectId: string,
) {
  const snapshot = await getInterview(authorId, draftId, expectedProjectId);
  if (snapshot.binding.readiness && hasCurrentReadiness(snapshot))
    return { readiness: snapshot.binding.readiness, revision: snapshot.project.revision };

  const { readiness: assessed } = hasReadinessEvidence(snapshot)
    ? await assess(snapshot, false)
    : { readiness: emptyReadiness };
  return withBinding(authorId, draftId, async (tx) => {
    const current = requireInterview(await readInterview(tx, authorId, draftId));
    if (current.project.id !== snapshot.project.id)
      throw new BiographerError('Interview changed. Please reload.', 409);
    if (current.project.revision !== snapshot.project.revision)
      throw new BiographerError('Interview changed. Please retry.', 409, readinessRevisionChanged);
    if (current.binding.readiness && hasCurrentReadiness(current))
      return { readiness: current.binding.readiness, revision: current.project.revision };
    const readiness = withFirstReadyTurn(current, assessed);
    await tx
      .update(interviews)
      .set({ readiness, readinessRevision: current.project.revision })
      .where(eq(interviews.projectId, current.project.id));
    return { readiness, revision: current.project.revision };
  });
}

export async function sendWhispererTurn(
  authorId: string,
  draftId: string,
  expectedProjectId: string,
  raw: unknown,
) {
  const input = turnInput.parse(raw);
  const started = performance.now();
  const { snapshot, turn } = await withBinding(authorId, draftId, async (tx) => {
    await findDraft(tx, authorId, draftId);
    const [binding] = await tx
      .select({ projectId: interviews.projectId })
      .from(interviews)
      .where(bindingKey(authorId, draftId));
    if (!binding) throw new BiographerError('Interview not found', 404);
    if (binding.projectId !== expectedProjectId)
      throw new BiographerError('Interview changed. Please reload.', 409);
    const turn = await saveOwnerTurn(tx, authorId, binding.projectId, input);
    return { turn, snapshot: requireInterview(await readInterview(tx, authorId, draftId)) };
  });
  const saved = performance.now();
  const questionId = whispererUuid('whisperer-question', [snapshot.project.id, turn.id]);
  const reply = (data: Interview) => {
    const interview = publicInterview(data)!;
    const question = interview.turns.find(({ id }) => id === questionId);
    return {
      turn,
      question: question?.text ?? null,
      choices: question && 'choices' in question ? question.choices : [],
      choicesMode: question && 'choicesMode' in question ? question.choicesMode : undefined,
      readiness: interview.readiness,
      revision: interview.revision,
      interview,
    };
  };
  // Another tab can answer before this turn is retried. Replying to the older
  // turn against the newer transcript would displace the author's pending question.
  const needsQuestion = (data: Interview) =>
    !data.savedTurns.some(({ id }) => id === questionId) &&
    data.savedTurns.findLast((line) => line.role === 'user')?.id === turn.id;
  if (!needsQuestion(snapshot)) return reply(snapshot);

  // The author's reply has committed before contacting the model. A retry
  // reuses the same turn and question IDs after a network or provider failure.
  const result = await assess(snapshot, true);
  const assessed = performance.now();
  const response = await withBinding(authorId, draftId, async (tx) => {
    const current = requireInterview(await readInterview(tx, authorId, draftId));
    if (current.project.id !== snapshot.project.id)
      throw new BiographerError('Interview changed. Please retry.', 409);
    if (!needsQuestion(current)) return reply(current);
    if (current.project.revision !== snapshot.project.revision)
      throw new BiographerError('Interview changed. Please retry.', 409);

    if (!result.question) throw new BiographerError('Missing Story Whisperer question', 502);
    const [question] = await tx
      .insert(turns)
      .values({
        id: questionId,
        projectId: current.project.id,
        participantId: current.participant.id,
        role: 'assistant',
        text: result.question,
        originalText: result.question,
        final: true,
      })
      .returning();
    const update = {
      readiness: withFirstReadyTurn(current, result.readiness),
      readinessRevision: current.project.revision,
      latestQuestion: saveQuestionOptions(
        {
          id: questionId,
          choices: result.choices ?? [],
          choicesMode: result.choicesMode,
        },
        current.binding.latestQuestion,
      ),
    };
    await tx.update(interviews).set(update).where(eq(interviews.projectId, current.project.id));
    return reply({
      ...current,
      binding: { ...current.binding, ...update },
      savedTurns: [...current.savedTurns, { ...question, recoverableAudio: false }],
    });
  });
  whispererLogger.info('Story Whisperer reply timings', {
    saveAndLoadMs: Math.round(saved - started),
    assessmentMs: Math.round(assessed - saved),
    commitMs: Math.round(performance.now() - assessed),
  });
  return response;
}

export async function dictateWhisperer(
  authorId: string,
  draftId: string,
  expectedProjectId: string,
  raw: unknown,
) {
  const input = dictationInput.parse(raw);
  const ageMs = Date.now() - Date.parse(input.capturedAt);
  if (ageMs >= audioRetentionMs) throw new BiographerError('Recording has expired', 410);
  if (ageMs < -60_000) throw new BiographerError('Invalid recording capture time', 400);
  const bytes = Buffer.from(input.data, 'base64').length;
  if (bytes < 2 || bytes > maxDictationBytes || bytes % 2 !== 0)
    throw new BiographerError('Invalid PCM recording', 400);
  const interview = await getInterview(authorId, draftId, expectedProjectId);
  const result = z.object({ text: z.string().max(40000) }).safeParse(
    await whispererRequest('/api/biographer/transcribe', {
      locale: interview.project.locale,
      audioPcmBase64: input.data,
    }),
  );
  if (!result.success) throw new BiographerError('Invalid transcription response', 502);
  return result.data;
}

const photoExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function whispererPhotoPath(
  draftId: string,
  requestId: string,
  photo: Interview['savedPhotos'][number],
) {
  const ext = photoExtensions[photo.contentType];
  if (!ext) throw new BiographerError('Interview photo could not be prepared', 422);
  return `${whispererDraftMediaPrefix(draftId)}${requestId}-${photo.id}.${ext}`;
}

async function copyWhispererPhoto(
  data: Interview,
  photo: Interview['savedPhotos'][number],
  destination: string,
) {
  const expected = `biographer/${data.project.id}/${data.participant.id}/photos/${photo.id}`;
  if (photo.objectPath !== expected)
    throw new BiographerError('Interview photo could not be prepared', 422);
  const bucket = privateWhispererBucket();
  const target = bucket.file(destination);
  if (!(await target.exists())[0]) await bucket.file(expected).copy(target);
}

function requireReadyInterview(data: Interview) {
  if (
    data.savedTurns.some(
      ({ role, included, final, text }) => role === 'user' && included && (!final || !text.trim()),
    )
  )
    throw new BiographerError('Finish or discard pending recordings first', 409);
  const { binding } = data;
  if (
    !hasCurrentReadiness(data) ||
    !binding.readiness ||
    !essentials.every((area) => binding.readiness?.areas[area] === 'ready')
  )
    throw new BiographerError('Complete the interview essentials first', 409);
}

export async function ensureWhispererDraftReady(
  authorId: string,
  draftId: string,
  expectedProjectId: string,
) {
  requireReadyInterview(await getInterview(authorId, draftId, expectedProjectId));
}

export async function verifyWhispererStructure(
  authorId: string,
  draftId: string,
  requestId: string | undefined,
  userDescription: string | null | undefined,
  imageObjectPaths: string[],
) {
  if (!requestId) throw new BiographerError('Invalid Story Whisperer request', 400);
  await withBinding(authorId, draftId, async (tx) => {
    await findDraft(tx, authorId, draftId, true);
    const [saved] = await tx
      .select()
      .from(handoffs)
      .where(and(eq(handoffs.draftId, draftId), eq(handoffs.requestId, requestId)));
    if (
      !saved ||
      saved.userDescription !== userDescription ||
      JSON.stringify(saved.imageObjectPaths) !== JSON.stringify(imageObjectPaths)
    )
      throw new BiographerError('Invalid Story Whisperer request', 404);
    if (!saved.dispatchReserved) {
      const current = requireInterview(await readInterview(tx, authorId, draftId));
      if (current.project.id !== saved.projectId || current.project.revision !== saved.revision)
        throw new BiographerError('Interview changed. Please retry.', 409);
      requireReadyInterview(current);
      // A proxy response can be lost after SGW accepts the job. Keep its source files
      // and request identity once the first submission has been reserved.
      await tx
        .update(handoffs)
        .set({ dispatchReserved: true })
        .where(eq(handoffs.requestId, requestId));
    }
  });
}

export async function deleteStoryWithWhispererCleanup(authorId: string, rawDraftId: string) {
  const parsed = z.uuid().safeParse(rawDraftId);
  if (!parsed.success) throw new BiographerError('Story not found', 404);
  const draftId = parsed.data.toLowerCase();
  const cleanup = await withBinding(authorId, draftId, async (tx) => {
    const [story] = await tx
      .select({ authorId: stories.authorId })
      .from(stories)
      .where(eq(stories.storyId, draftId));
    if (!story || story.authorId !== authorId) throw new BiographerError('Story not found', 404);

    const [binding] = await tx
      .select({ projectId: interviews.projectId })
      .from(interviews)
      .where(bindingKey(authorId, draftId));
    const [handoff] = await tx
      .select({ requestId: handoffs.requestId })
      .from(handoffs)
      .where(eq(handoffs.draftId, draftId))
      .limit(1);

    if (binding) await closeWhispererProject(tx, authorId, binding.projectId);
    await tx.insert(deletedDrafts).values({ authorId, draftId }).onConflictDoNothing();
    return { projectId: binding?.projectId, hadHandoff: Boolean(handoff) };
  });

  // Keep the inaccessible database rows until storage confirms cleanup. They
  // identify the same private prefixes if this DELETE has to be retried.
  if (cleanup.projectId) {
    await privateWhispererBucket().deleteFiles({
      prefix: `biographer/${cleanup.projectId}/`,
      force: true,
    });
  }
  if (cleanup.hadHandoff) await deleteWhispererDraftMedia(draftId);

  await withBinding(authorId, draftId, async (tx) => {
    if (cleanup.projectId) {
      await tx
        .delete(projects)
        .where(and(eq(projects.id, cleanup.projectId), eq(projects.authorId, authorId)));
    }
    await tx
      .delete(stories)
      .where(and(eq(stories.storyId, draftId), eq(stories.authorId, authorId)));
  });
}

async function verifyWhispererRetry(draftId: string, requestId: string) {
  const [previous] = await db
    .select({ requestId: handoffs.requestId })
    .from(handoffs)
    .where(
      and(
        eq(handoffs.requestId, requestId),
        eq(handoffs.draftId, draftId),
        eq(handoffs.dispatchReserved, true),
      ),
    );
  if (!previous) throw new BiographerError('Invalid Story Whisperer retry', 404);
  const response = await sgwFetch(`/api/jobs/${requestId}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new BiographerError('Unable to check the previous story job', 503);
  const status = z
    .object({
      job: z.object({
        id: z.literal(requestId),
        status: z.string(),
        metadata: z.object({ storyId: z.literal(draftId) }),
      }),
    })
    .safeParse(await response.json());
  if (!status.success || status.data.job.status !== 'failed')
    throw new BiographerError('The previous story job has not failed', 409);
}

export async function handoffWhisperer(
  authorId: string,
  draftId: string,
  expectedProjectId: string,
  raw: unknown,
) {
  const input = handoffInput.parse(raw);
  const snapshot = await getInterview(authorId, draftId, expectedProjectId);
  if (snapshot.project.revision !== input.revision)
    throw new BiographerError('Interview changed. Please retry.', 409);
  requireReadyInterview(snapshot);
  const photos = snapshot.savedPhotos.filter(({ included }) => included);
  const imageObjectPaths = [...new Set(input.imageObjectPaths)];
  if (imageObjectPaths.length + photos.length > 3)
    throw new BiographerError('A story accepts up to three photos', 422);
  const structureRequestId = whispererUuid('whisperer-structure', [
    authorId,
    draftId,
    snapshot.project.id,
    input,
  ]);
  const destinations = photos.map((photo) =>
    whispererPhotoPath(draftId, structureRequestId, photo),
  );
  const allImages = [...imageObjectPaths, ...destinations];
  const result = await withBinding(authorId, draftId, async (tx) => {
    await findDraft(tx, authorId, draftId, true);
    await authorizeInputPaths(tx, authorId, draftId, [
      ...imageObjectPaths,
      ...(input.audioObjectPath ? [input.audioObjectPath] : []),
    ]);
    const [existing] = await tx
      .select()
      .from(handoffs)
      .where(eq(handoffs.requestId, structureRequestId));
    return existing;
  });
  if (!result && input.retryOf) await verifyWhispererRetry(draftId, input.retryOf);
  const userDescription =
    result?.userDescription ??
    (await fitEvidence(snapshot, [
      input.brief,
      ...(snapshot.binding.context?.brief?.trim() !== input.brief.trim()
        ? [snapshot.binding.context?.brief ?? '']
        : []),
      ...answeredQuestions(
        snapshot.savedTurns.map((turn) => ({
          ...turn,
          ...questionOptions(turn, snapshot.binding.latestQuestion),
        })),
        snapshot.binding.context?.opening,
      ),
      ...photos.map(({ caption }) => caption),
    ]));
  if (!userDescription) throw new BiographerError('Add interview material first', 422);

  // Commit the list of destinations before copying so that a partial copy is
  // discoverable and can be retried or cleaned up by Start over.
  await withBinding(authorId, draftId, async (tx) => {
    const current = requireInterview(await readInterview(tx, authorId, draftId));
    if (
      current.project.id !== snapshot.project.id ||
      current.project.revision !== snapshot.project.revision
    )
      throw new BiographerError('Interview changed. Please retry.', 409);
    await findDraft(tx, authorId, draftId, true);
    await tx
      .insert(handoffs)
      .values({
        requestId: structureRequestId,
        draftId,
        projectId: current.project.id,
        revision: current.project.revision,
        userDescription,
        imageObjectPaths: allImages,
      })
      .onConflictDoNothing();
  });
  return withBinding(authorId, draftId, async (tx) => {
    const current = requireInterview(await readInterview(tx, authorId, draftId));
    if (
      current.project.id !== snapshot.project.id ||
      current.project.revision !== snapshot.project.revision
    )
      throw new BiographerError('Interview changed. Please retry.', 409);
    await findDraft(tx, authorId, draftId, true);
    const [saved] = await tx
      .select()
      .from(handoffs)
      .where(eq(handoffs.requestId, structureRequestId));
    if (!saved) throw new BiographerError('Story handoff was removed', 409);
    for (const [index, photo] of photos.entries()) {
      await copyWhispererPhoto(current, photo, destinations[index]);
    }
    return {
      draftId,
      structureRequestId,
      userDescription: saved.userDescription,
      imageObjectPaths: saved.imageObjectPaths,
    };
  });
}
