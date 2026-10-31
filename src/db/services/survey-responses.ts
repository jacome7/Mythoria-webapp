import { and, count, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  surveyAnswers,
  surveyInvitations,
  surveyResponses,
  surveyRewardEntitlements,
  surveyStudies,
  surveyTextAnswers,
  surveyVersions,
  type NewSurveyAnswerRow,
  type NewSurveyTextAnswer,
  type SurveyInvitation,
  type SurveyInvitationStatus,
  type SurveyResponse,
  type SurveyRewardEntitlementStatus,
  type SurveyStudy,
  type SurveyVersion,
} from '@/db/schema/surveys';
import { stories } from '@/db/schema/stories';
import {
  answersSchema,
  isAnswerable,
  type AnswerableQuestion,
  type AnswerValue,
  type SurveyAnswers,
  type SurveyDefinition,
} from '@/lib/surveys/definition-schema';
import {
  getNumericValue,
  pruneHiddenAnswers,
  validateSubmission,
  type SurveyAnswerErrorCode,
} from '@/lib/surveys/engine';
import { applyAudience, factsFromSnapshot } from '@/lib/surveys/audience';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';
import { verifySurveyToken } from '@/lib/surveys/tokens';

type SurveyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = SurveyTransaction | typeof db;

/** Upper bound for a serialized answers payload (defence in depth; routes cap the body too). */
export const MAX_ANSWERS_JSON_LENGTH = 200_000;
export const MAX_SUBMISSION_KEY_LENGTH = 128;

// ---------------------------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------------------------

export interface OpenSurveyState {
  state: 'open';
  status: Extract<SurveyInvitationStatus, 'not_started' | 'opened' | 'started'>;
  surveyId: string;
  version: number;
  definition: SurveyDefinition;
  draftAnswers: SurveyAnswers;
  /** Locale stored on the invitation (the page may be viewed in another locale). */
  locale: string;
  cohortKey: string;
  studyClosesAt: string | null;
  rewardEligible: boolean;
}

/**
 * Respondent-safe invitation state. Never carries author identity (email, name, ids).
 * `invalid` is the uniform answer for malformed, forged, unknown or holdout tokens.
 */
export type SurveyInvitationState =
  | { state: 'invalid' }
  | { state: 'closed' }
  | {
      state: 'submitted';
      rewardEntitlementId: string | null;
      rewardStatus: SurveyRewardEntitlementStatus | null;
    }
  | OpenSurveyState;

export type SurveyWriteFailure = 'invalid' | 'closed' | 'submitted' | 'invalid_answers';

export type SaveProgressResult = { ok: true } | { ok: false; reason: SurveyWriteFailure };

export type SubmitSurveyResult =
  | {
      ok: true;
      alreadySubmitted: boolean;
      entitlementId?: string;
      rewardStatus?: SurveyRewardEntitlementStatus;
    }
  | { ok: false; reason: 'invalid' | 'closed' | 'key_conflict' }
  | { ok: false; reason: 'validation'; errors: Record<string, SurveyAnswerErrorCode> };

// ---------------------------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------------------------

interface InvitationContext {
  invitation: SurveyInvitation;
  study: SurveyStudy;
  version: SurveyVersion;
  definition: SurveyDefinition;
}

type ContextResult =
  | { found: false }
  | ({ found: true } & InvitationContext & { closed: boolean; submitted: boolean });

function isWindowOpen(study: SurveyStudy, now: Date): boolean {
  if (study.status !== 'active') return false;
  if (study.opensAt && now < study.opensAt) return false;
  if (study.closesAt && now >= study.closesAt) return false;
  return true;
}

function isInvitationClosed(invitation: SurveyInvitation, study: SurveyStudy, now: Date): boolean {
  if (invitation.status === 'expired' || invitation.expiredAt) return true;
  return !isWindowOpen(study, now);
}

async function loadContext(
  executor: Executor,
  invitationId: string,
  opts: { lock?: boolean } = {},
): Promise<ContextResult> {
  const base = executor
    .select()
    .from(surveyInvitations)
    .where(eq(surveyInvitations.invitationId, invitationId))
    .limit(1);
  const invitationRows = (await (opts.lock ? base.for('update') : base)) as SurveyInvitation[];
  const invitation = invitationRows[0];
  // Holdout invitations are a comparison population: they are never invited, so their tokens are
  // treated like unknown ones.
  if (!invitation || invitation.isHoldout) return { found: false };

  const [studyRows, versionRows] = await Promise.all([
    executor
      .select()
      .from(surveyStudies)
      .where(eq(surveyStudies.studyId, invitation.studyId))
      .limit(1),
    executor
      .select()
      .from(surveyVersions)
      .where(eq(surveyVersions.surveyVersionId, invitation.surveyVersionId))
      .limit(1),
  ]);
  const study = studyRows[0] as SurveyStudy | undefined;
  const version = versionRows[0] as SurveyVersion | undefined;
  if (!study || !version) return { found: false };

  const now = new Date();
  return {
    found: true,
    invitation,
    study,
    version,
    // Questions restricted to an audience are dropped here, so the browser and the submit
    // validator both see exactly the questions this author is eligible for.
    definition: applyAudience(
      version.definition as unknown as SurveyDefinition,
      factsFromSnapshot(invitation.cohortSnapshot),
    ),
    submitted: invitation.status === 'submitted',
    closed: isInvitationClosed(invitation, study, now),
  };
}

async function findResponse(
  executor: Executor,
  invitationId: string,
): Promise<SurveyResponse | undefined> {
  const rows = await executor
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.invitationId, invitationId))
    .limit(1);
  return rows[0] as SurveyResponse | undefined;
}

async function findEntitlement(
  executor: Executor,
  invitationId: string,
): Promise<{ entitlementId: string; status: SurveyRewardEntitlementStatus } | undefined> {
  const rows = await executor
    .select({
      entitlementId: surveyRewardEntitlements.entitlementId,
      status: surveyRewardEntitlements.status,
    })
    .from(surveyRewardEntitlements)
    .where(eq(surveyRewardEntitlements.invitationId, invitationId))
    .limit(1);
  return rows[0] as { entitlementId: string; status: SurveyRewardEntitlementStatus } | undefined;
}

function parseAnswers(raw: unknown): SurveyAnswers | null {
  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (JSON.stringify(parsed.data).length > MAX_ANSWERS_JSON_LENGTH) return null;
  return parsed.data;
}

function parseRedemptionDeadline(rewardPolicy: SurveyStudy['rewardPolicy']): Date | null {
  const raw = rewardPolicy?.redemptionDeadline;
  if (typeof raw !== 'string') return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------------------------
// Reads and progress
// ---------------------------------------------------------------------------------------------

/** Resolve a survey link token into a respondent-safe state. */
export async function resolveInvitation(token: string): Promise<SurveyInvitationState> {
  const invitationId = verifySurveyToken(token);
  if (!invitationId) return { state: 'invalid' };

  const context = await loadContext(db, invitationId);
  if (!context.found) return { state: 'invalid' };

  if (context.submitted) {
    const entitlement = await findEntitlement(db, invitationId);
    return {
      state: 'submitted',
      rewardEntitlementId: entitlement?.entitlementId ?? null,
      rewardStatus: entitlement?.status ?? null,
    };
  }
  if (context.closed) return { state: 'closed' };

  const response = await findResponse(db, invitationId);
  const draft = answersSchema.safeParse(response?.draftAnswers ?? {});
  const { invitation, study, version, definition } = context;
  return {
    state: 'open',
    status: invitation.status as OpenSurveyState['status'],
    surveyId: version.surveyId,
    version: version.version,
    definition,
    draftAnswers: draft.success ? pruneHiddenAnswers(definition, draft.data) : {},
    locale: invitation.locale,
    cohortKey: invitation.cohortKey,
    studyClosesAt: study.closesAt ? study.closesAt.toISOString() : null,
    rewardEligible: definition.rewardEligible === true,
  };
}

/** `not_started -> opened`. Never moves an invitation backwards. Returns false when not writable. */
export async function markOpened(invitationId: string): Promise<boolean> {
  const context = await loadContext(db, invitationId);
  if (!context.found || context.submitted || context.closed) return false;
  await db
    .update(surveyInvitations)
    .set({
      status: 'opened',
      openedAt: sql`COALESCE(${surveyInvitations.openedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(surveyInvitations.invitationId, invitationId),
        eq(surveyInvitations.status, 'not_started'),
      ),
    );
  return true;
}

/**
 * Autosave a draft. Hidden answers are pruned before persisting; the invitation moves to
 * `started` (never backwards). Drafts are NOT checked against per-question rules (a respondent
 * can be half way through typing); only the answer shape is validated.
 */
export async function saveProgress(
  invitationId: string,
  rawAnswers: unknown,
): Promise<SaveProgressResult> {
  const parsed = parseAnswers(rawAnswers);
  if (!parsed) return { ok: false, reason: 'invalid_answers' };

  const context = await loadContext(db, invitationId);
  if (!context.found) return { ok: false, reason: 'invalid' };
  if (context.submitted) return { ok: false, reason: 'submitted' };
  if (context.closed) return { ok: false, reason: 'closed' };

  const { invitation, definition, version } = context;
  const pruned = pruneHiddenAnswers(definition, parsed);

  const existing = await findResponse(db, invitationId);
  if (existing) {
    if (existing.status === 'submitted') return { ok: false, reason: 'submitted' };
    await db
      .update(surveyResponses)
      .set({ draftAnswers: pruned, lastSavedAt: sql`now()` })
      .where(
        and(
          eq(surveyResponses.invitationId, invitationId),
          eq(surveyResponses.status, 'in_progress'),
        ),
      );
  } else {
    await db
      .insert(surveyResponses)
      .values({
        invitationId,
        surveyVersionId: version.surveyVersionId,
        authorId: invitation.authorId,
        status: 'in_progress',
        draftAnswers: pruned,
        locale: invitation.locale,
        lastSavedAt: sql`now()`,
      })
      .onConflictDoNothing({ target: surveyResponses.invitationId });
  }

  // Status only moves forward: not_started/opened -> started.
  await db
    .update(surveyInvitations)
    .set({
      status: 'started',
      openedAt: sql`COALESCE(${surveyInvitations.openedAt}, now())`,
      startedAt: sql`COALESCE(${surveyInvitations.startedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(surveyInvitations.invitationId, invitationId),
        ne(surveyInvitations.status, 'submitted'),
        ne(surveyInvitations.status, 'expired'),
      ),
    );
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------------------------

function buildAnswerRows(
  responseId: string,
  surveyVersionId: string,
  definition: SurveyDefinition,
  shownQuestionIds: string[],
  answers: SurveyAnswers,
): { answerRows: NewSurveyAnswerRow[]; textRows: NewSurveyTextAnswer[] } {
  const answerRows: NewSurveyAnswerRow[] = [];
  const textRows: NewSurveyTextAnswer[] = [];
  const byId = new Map(definition.questions.map((q) => [q.id, q]));

  for (const questionId of shownQuestionIds) {
    const question = byId.get(questionId);
    if (!question || !isAnswerable(question)) continue;
    const answer: AnswerValue | undefined = answers[questionId];
    const common = { responseId, surveyVersionId, questionId, dimension: question.dimension };

    if (!answer) {
      answerRows.push({ ...common, optionId: null, isSkipped: true });
      continue;
    }

    switch (answer.kind) {
      case 'choice': {
        const options = 'options' in question ? question.options : [];
        const numeric = getNumericValue(question as AnswerableQuestion, answer);
        const otherOptionId = answer.otherText
          ? answer.optionIds.find((id) => options.find((o) => o.id === id)?.allowOtherText)
          : undefined;
        for (const optionId of answer.optionIds) {
          const option = options.find((o) => o.id === optionId);
          answerRows.push({
            ...common,
            optionId,
            valueNumeric: answer.optionIds.length === 1 ? numeric : null,
            isNotApplicable: option?.notApplicable === true,
            hasOtherText: otherOptionId === optionId,
          });
        }
        if (otherOptionId && answer.otherText) {
          textRows.push({
            responseId,
            surveyVersionId,
            questionId,
            kind: 'other_text',
            optionId: otherOptionId,
            textValue: answer.otherText,
          });
        }
        break;
      }
      case 'number':
        answerRows.push({ ...common, optionId: null, valueNumeric: answer.value });
        break;
      case 'na':
        answerRows.push({ ...common, optionId: answer.optionId, isNotApplicable: true });
        break;
      case 'text':
        answerRows.push({ ...common, optionId: null });
        textRows.push({
          responseId,
          surveyVersionId,
          questionId,
          kind: 'free_text',
          optionId: null,
          textValue: answer.text,
        });
        break;
    }
  }
  return { answerRows, textRows };
}

async function insertEntitlement(
  tx: SurveyTransaction,
  context: InvitationContext,
  responseId: string,
): Promise<{ entitlementId: string; status: SurveyRewardEntitlementStatus } | undefined> {
  const { invitation, study } = context;
  const [{ published }] = (await tx
    .select({ published: count() })
    .from(stories)
    .where(and(eq(stories.authorId, invitation.authorId), eq(stories.status, 'published')))) as [
    { published: number },
  ];
  const status: SurveyRewardEntitlementStatus =
    Number(published) > 0 ? 'eligible' : 'pending_story';

  const expiresAt = parseRedemptionDeadline(study.rewardPolicy);
  if (!expiresAt) {
    // Activation rejects reward-eligible studies without a deadline, so this is a data problem on
    // the admin side. Never punish the respondent: still grant the gift (it just does not expire).
    surveyRespondentLogger.warn('survey_reward_policy_missing_deadline', {
      studyId: study.studyId,
      invitationId: invitation.invitationId,
    });
  }

  const inserted = await tx
    .insert(surveyRewardEntitlements)
    .values({
      invitationId: invitation.invitationId,
      responseId,
      authorId: invitation.authorId,
      status,
      expiresAt,
    })
    .onConflictDoNothing({ target: surveyRewardEntitlements.invitationId })
    .returning({
      entitlementId: surveyRewardEntitlements.entitlementId,
      status: surveyRewardEntitlements.status,
    });
  if (inserted[0]) return inserted[0] as { entitlementId: string; status: typeof status };
  return findEntitlement(tx, invitation.invitationId);
}

/**
 * Authoritative, idempotent submission. Runs in one transaction that locks the invitation row so
 * concurrent double-submits serialize: the second one sees `submitted` and returns the existing
 * result (same entitlement) without writing anything.
 */
export async function submitResponse(
  token: string,
  rawAnswers: unknown,
  submissionKey: string,
): Promise<SubmitSurveyResult> {
  const invitationId = verifySurveyToken(token);
  if (!invitationId) return { ok: false, reason: 'invalid' };

  const parsed = parseAnswers(rawAnswers);
  const key = submissionKey.trim();
  if (!key || key.length > MAX_SUBMISSION_KEY_LENGTH) return { ok: false, reason: 'invalid' };

  return db.transaction(async (tx): Promise<SubmitSurveyResult> => {
    const context = await loadContext(tx, invitationId, { lock: true });
    if (!context.found) return { ok: false, reason: 'invalid' };

    // Idempotent replay: a submitted invitation always returns the stored result, whatever key
    // or payload the retry carries.
    if (context.submitted) {
      const entitlement = await findEntitlement(tx, invitationId);
      return {
        ok: true,
        alreadySubmitted: true,
        ...(entitlement
          ? { entitlementId: entitlement.entitlementId, rewardStatus: entitlement.status }
          : {}),
      };
    }
    if (context.closed) return { ok: false, reason: 'closed' };
    if (!parsed) return { ok: false, reason: 'validation', errors: {} };

    // The key is unique across responses; a key already bound to another invitation is a client
    // bug (or an attack), never a replay.
    const keyOwner = (await tx
      .select({ invitationId: surveyResponses.invitationId })
      .from(surveyResponses)
      .where(eq(surveyResponses.submissionKey, key))
      .limit(1)) as Array<{ invitationId: string }>;
    if (keyOwner[0] && keyOwner[0].invitationId !== invitationId) {
      return { ok: false, reason: 'key_conflict' };
    }

    const { invitation, definition, version } = context;
    const validation = validateSubmission(definition, parsed);
    if (!validation.ok) return { ok: false, reason: 'validation', errors: validation.errors };

    const now = new Date();
    const existing = await findResponse(tx, invitationId);
    const startedAt = existing?.startedAt ?? invitation.startedAt ?? now;
    const durationMs = Math.max(0, now.getTime() - startedAt.getTime());
    const responseValues = {
      status: 'submitted' as const,
      // Free text now lives in survey_text_answers; do not keep a second copy in the draft.
      draftAnswers: {},
      shownQuestionIds: validation.shownQuestionIds,
      submissionKey: key,
      submittedAt: now,
      lastSavedAt: now,
      durationMs,
    };

    let responseId: string;
    if (existing) {
      responseId = existing.responseId;
      await tx
        .update(surveyResponses)
        .set(responseValues)
        .where(eq(surveyResponses.responseId, responseId));
    } else {
      const inserted = (await tx
        .insert(surveyResponses)
        .values({
          ...responseValues,
          invitationId,
          surveyVersionId: version.surveyVersionId,
          authorId: invitation.authorId,
          locale: invitation.locale,
          startedAt,
        })
        .returning({ responseId: surveyResponses.responseId })) as Array<{ responseId: string }>;
      responseId = inserted[0].responseId;
    }

    const { answerRows, textRows } = buildAnswerRows(
      responseId,
      version.surveyVersionId,
      definition,
      validation.shownQuestionIds,
      validation.answers,
    );
    if (answerRows.length > 0) await tx.insert(surveyAnswers).values(answerRows);
    if (textRows.length > 0) await tx.insert(surveyTextAnswers).values(textRows);

    await tx
      .update(surveyInvitations)
      .set({
        status: 'submitted',
        openedAt: sql`COALESCE(${surveyInvitations.openedAt}, now())`,
        startedAt: sql`COALESCE(${surveyInvitations.startedAt}, now())`,
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(surveyInvitations.invitationId, invitationId));

    const entitlement =
      definition.rewardEligible === true
        ? await insertEntitlement(tx, context, responseId)
        : undefined;

    return {
      ok: true,
      alreadySubmitted: false,
      ...(entitlement
        ? { entitlementId: entitlement.entitlementId, rewardStatus: entitlement.status }
        : {}),
    };
  });
}
