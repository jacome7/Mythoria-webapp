import {
  surveyAnswers,
  surveyInvitations,
  surveyResponses,
  surveyRewardEntitlements,
  surveyStudies,
  surveyTextAnswers,
  surveyVersions,
} from '@/db/schema/surveys';
import { stories } from '@/db/schema/stories';
import { surveyDefinitionSchema, type SurveyDefinition } from '@/lib/surveys/definition-schema';
import { createSurveyToken } from '@/lib/surveys/tokens';

type Row = Record<string, unknown>;
type Table = unknown;

const state = {
  rows: new Map<Table, Row[]>(),
  inserts: [] as Array<{ table: Table; values: Row | Row[] }>,
  updates: [] as Array<{ table: Table; values: Row }>,
  lockModes: [] as string[],
  entitlementConflict: false,
  transactions: 0,
};

function rowsFor(table: Table): Row[] {
  return state.rows.get(table) ?? [];
}

function makeExecutor() {
  return {
    select: jest.fn(() => ({
      from: (table: Table) => {
        const chain: Record<string, unknown> = {};
        chain.where = () => chain;
        chain.limit = () => chain;
        chain.for = (mode: string) => {
          state.lockModes.push(mode);
          return chain;
        };
        chain.then = (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(rowsFor(table)).then(resolve, reject);
        return chain;
      },
    })),
    insert: jest.fn((table: Table) => ({
      values: (values: Row | Row[]) => {
        state.inserts.push({ table, values });
        const builder: Record<string, unknown> = {};
        builder.onConflictDoNothing = () => builder;
        builder.returning = async () => {
          if (table === surveyResponses) return [{ responseId: 'response-new' }];
          if (table === surveyRewardEntitlements) {
            if (state.entitlementConflict) return [];
            return [{ entitlementId: 'entitlement-new', status: (values as Row).status }];
          }
          return [];
        };
        builder.then = (resolve: (value: unknown) => unknown) => resolve(undefined);
        return builder;
      },
    })),
    update: jest.fn((table: Table) => ({
      set: (values: Row) => ({
        where: async () => {
          state.updates.push({ table, values });
        },
      }),
    })),
  };
}

jest.mock('@/lib/surveys/respondent-logger', () => ({
  surveyRespondentLogger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/db', () => {
  const executor = makeExecutor();
  return {
    db: {
      ...executor,
      transaction: jest.fn(async (callback: (tx: unknown) => unknown) => {
        state.transactions += 1;
        return callback(executor);
      }),
    },
  };
});

import { markOpened, resolveInvitation, saveProgress, submitResponse } from './survey-responses';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';

const SECRET = 'test-secret-test-secret-test-secret-00';
const INVITATION_ID = '00000000-0000-4000-8000-000000000001';
const AUTHOR_ID = '00000000-0000-4000-8000-0000000000aa';
const VERSION_ID = '00000000-0000-4000-8000-0000000000bb';
const STUDY_ID = '00000000-0000-4000-8000-0000000000cc';

const text = (value: string) => ({
  'en-US': value,
  'pt-PT': value,
  'es-ES': value,
  'fr-FR': value,
  'de-DE': value,
});

function buildDefinition(overrides: Record<string, unknown> = {}): SurveyDefinition {
  return surveyDefinitionSchema.parse({
    schemaVersion: 1,
    id: 'unit_survey',
    version: 1,
    purpose: 'unit tests',
    title: text('Unit survey'),
    description: text('Description'),
    completionMessage: text('Thanks'),
    estimatedMinutes: 2,
    responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
    rewardEligible: true,
    questions: [
      {
        id: 'Q1',
        type: 'single_choice',
        dimension: 'primary_intent',
        required: true,
        label: text('Q1'),
        options: [
          { id: 'yes', label: text('Yes') },
          { id: 'no', label: text('No') },
          { id: 'other', label: text('Other'), allowOtherText: true },
        ],
      },
      {
        id: 'Q2',
        type: 'single_choice',
        dimension: 'follow_up',
        required: true,
        visibleWhen: { question: 'Q1', operator: 'equals', value: 'yes' },
        label: text('Q2'),
        options: [
          { id: 'a', label: text('A') },
          { id: 'b', label: text('B') },
        ],
      },
      {
        id: 'Q3',
        type: 'short_text',
        dimension: 'comment',
        required: false,
        label: text('Q3'),
        validation: { maxLength: 100 },
      },
      {
        id: 'Q4',
        type: 'stars',
        dimension: 'satisfaction',
        required: true,
        label: text('Q4'),
        options: [
          { id: '1', value: 1, label: text('Bad') },
          { id: '2', value: 2, label: text('Ok') },
          { id: 'na', notApplicable: true, label: text('N/A') },
        ],
      },
    ],
    ...overrides,
  });
}

function seed(
  options: {
    definition?: SurveyDefinition;
    invitation?: Row;
    study?: Row;
    response?: Row | null;
    entitlement?: Row | null;
    publishedStories?: number;
  } = {},
) {
  const definition = options.definition ?? buildDefinition();
  const hour = 3_600_000;
  state.rows.set(surveyInvitations, [
    {
      invitationId: INVITATION_ID,
      studyId: STUDY_ID,
      cohortKey: 'C2',
      surveyVersionId: VERSION_ID,
      authorId: AUTHOR_ID,
      locale: 'en-US',
      isHoldout: false,
      status: 'not_started',
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      expiredAt: null,
      ...options.invitation,
    },
  ]);
  state.rows.set(surveyStudies, [
    {
      studyId: STUDY_ID,
      status: 'active',
      opensAt: new Date(Date.now() - hour),
      closesAt: new Date(Date.now() + hour),
      rewardPolicy: null,
      ...options.study,
    },
  ]);
  state.rows.set(surveyVersions, [
    { surveyVersionId: VERSION_ID, surveyId: 'unit_survey', version: 1, definition },
  ]);
  state.rows.set(
    surveyResponses,
    options.response ? [{ invitationId: INVITATION_ID, ...options.response }] : [],
  );
  state.rows.set(surveyRewardEntitlements, options.entitlement ? [options.entitlement] : []);
  state.rows.set(stories, [{ published: options.publishedStories ?? 0 }]);
}

const token = () => createSurveyToken(INVITATION_ID, SECRET);
const insertsInto = (table: Table) =>
  state.inserts.filter((entry) => entry.table === table).map((entry) => entry.values);
const updatesOf = (table: Table) =>
  state.updates.filter((entry) => entry.table === table).map((entry) => entry.values);

const validAnswers = {
  Q1: { kind: 'choice', optionIds: ['yes'] },
  Q2: { kind: 'choice', optionIds: ['a'] },
  Q4: { kind: 'choice', optionIds: ['2'] },
};

beforeAll(() => {
  process.env.SURVEY_LINK_SECRET = SECRET;
});

beforeEach(() => {
  state.rows = new Map();
  state.inserts = [];
  state.updates = [];
  state.lockModes = [];
  state.entitlementConflict = false;
  state.transactions = 0;
  seed();
});

describe('resolveInvitation', () => {
  it('returns invalid for malformed and forged tokens without touching the database', async () => {
    await expect(resolveInvitation('nope')).resolves.toEqual({ state: 'invalid' });
    await expect(
      resolveInvitation(`${token().split('.')[0]}.AAAAAAAAAAAAAAAAAAAAAA`),
    ).resolves.toEqual({ state: 'invalid' });
  });

  it('returns invalid for unknown invitations and holdout invitations', async () => {
    state.rows.set(surveyInvitations, []);
    await expect(resolveInvitation(token())).resolves.toEqual({ state: 'invalid' });

    seed({ invitation: { isHoldout: true } });
    await expect(resolveInvitation(token())).resolves.toEqual({ state: 'invalid' });
  });

  it('returns the open state with a pruned draft and no author identity', async () => {
    seed({
      invitation: { status: 'started' },
      response: {
        draftAnswers: {
          Q1: { kind: 'choice', optionIds: ['no'] },
          Q2: { kind: 'choice', optionIds: ['a'] },
        },
      },
    });

    const result = await resolveInvitation(token());

    expect(result.state).toBe('open');
    if (result.state !== 'open') throw new Error('unreachable');
    expect(result.status).toBe('started');
    expect(result.cohortKey).toBe('C2');
    expect(result.rewardEligible).toBe(true);
    expect(result.draftAnswers).toEqual({ Q1: { kind: 'choice', optionIds: ['no'] } });
    expect(result.definition.id).toBe('unit_survey');
    expect(JSON.stringify(result)).not.toContain(AUTHOR_ID);
    expect(JSON.stringify(result)).not.toContain('email');
  });

  it.each([
    ['study not active', { study: { status: 'closed' } }],
    ['before opens_at', { study: { opensAt: new Date(Date.now() + 60_000) } }],
    ['after closes_at', { study: { closesAt: new Date(Date.now() - 1) } }],
    ['expired invitation', { invitation: { status: 'expired' } }],
  ])('returns closed: %s', async (_label, overrides) => {
    seed(overrides);
    await expect(resolveInvitation(token())).resolves.toEqual({ state: 'closed' });
  });

  it('returns submitted (with the reward reference) even after the study closed', async () => {
    seed({
      invitation: { status: 'submitted' },
      study: { status: 'closed' },
      entitlement: { entitlementId: 'entitlement-1', status: 'eligible' },
    });
    await expect(resolveInvitation(token())).resolves.toEqual({
      state: 'submitted',
      rewardEntitlementId: 'entitlement-1',
      rewardStatus: 'eligible',
    });
  });
});

describe('markOpened', () => {
  it('moves not_started to opened for an open survey', async () => {
    await expect(markOpened(INVITATION_ID)).resolves.toBe(true);
    expect(updatesOf(surveyInvitations)).toHaveLength(1);
    expect(updatesOf(surveyInvitations)[0]).toHaveProperty('status', 'opened');
  });

  it('does not write for closed or submitted invitations', async () => {
    seed({ study: { status: 'closed' } });
    await expect(markOpened(INVITATION_ID)).resolves.toBe(false);
    seed({ invitation: { status: 'submitted' } });
    await expect(markOpened(INVITATION_ID)).resolves.toBe(false);
    expect(state.updates).toHaveLength(0);
  });
});

describe('saveProgress', () => {
  it('creates an in-progress response and prunes answers to hidden questions', async () => {
    const result = await saveProgress(INVITATION_ID, {
      Q1: { kind: 'choice', optionIds: ['no'] },
      Q2: { kind: 'choice', optionIds: ['a'] },
      UNKNOWN: { kind: 'text', text: 'ghost' },
    });

    expect(result).toEqual({ ok: true });
    const [inserted] = insertsInto(surveyResponses) as Row[];
    expect(inserted).toMatchObject({
      invitationId: INVITATION_ID,
      authorId: AUTHOR_ID,
      status: 'in_progress',
      draftAnswers: { Q1: { kind: 'choice', optionIds: ['no'] } },
    });
    expect(updatesOf(surveyInvitations)[0]).toHaveProperty('status', 'started');
  });

  it('updates the existing draft instead of inserting a second response', async () => {
    seed({ response: { responseId: 'response-1', status: 'in_progress', draftAnswers: {} } });
    await saveProgress(INVITATION_ID, { Q1: { kind: 'choice', optionIds: ['yes'] } });

    expect(insertsInto(surveyResponses)).toHaveLength(0);
    expect(updatesOf(surveyResponses)[0]).toMatchObject({
      draftAnswers: { Q1: { kind: 'choice', optionIds: ['yes'] } },
    });
  });

  it('rejects malformed answers, closed studies and submitted invitations', async () => {
    await expect(saveProgress(INVITATION_ID, { Q1: { kind: 'nope' } })).resolves.toEqual({
      ok: false,
      reason: 'invalid_answers',
    });

    seed({ study: { status: 'closed' } });
    await expect(saveProgress(INVITATION_ID, {})).resolves.toEqual({
      ok: false,
      reason: 'closed',
    });

    seed({ invitation: { status: 'submitted' } });
    await expect(saveProgress(INVITATION_ID, {})).resolves.toEqual({
      ok: false,
      reason: 'submitted',
    });
    expect(state.inserts).toHaveLength(0);
  });
});

describe('submitResponse', () => {
  it('rejects invalid tokens and missing/oversized idempotency keys', async () => {
    await expect(submitResponse('bad', validAnswers, 'key')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    await expect(submitResponse(token(), validAnswers, '')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    await expect(submitResponse(token(), validAnswers, 'x'.repeat(129))).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(state.transactions).toBe(0);
  });

  it('writes normalized answers, a skipped row and the entitlement in one locked transaction', async () => {
    seed({ publishedStories: 2 });

    const result = await submitResponse(
      token(),
      { ...validAnswers, Q1: { kind: 'choice', optionIds: ['yes'] } },
      'key-1',
    );

    expect(result).toEqual({
      ok: true,
      alreadySubmitted: false,
      entitlementId: 'entitlement-new',
      rewardStatus: 'eligible',
    });
    expect(state.transactions).toBe(1);
    expect(state.lockModes).toEqual(['update']);

    const [response] = insertsInto(surveyResponses) as Row[];
    expect(response).toMatchObject({
      status: 'submitted',
      submissionKey: 'key-1',
      shownQuestionIds: ['Q1', 'Q2', 'Q3', 'Q4'],
      draftAnswers: {},
    });
    expect(typeof response.durationMs).toBe('number');

    const [answerRows] = insertsInto(surveyAnswers) as Row[][];
    expect(answerRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionId: 'Q1', dimension: 'primary_intent', optionId: 'yes' }),
        expect.objectContaining({ questionId: 'Q2', optionId: 'a' }),
        expect.objectContaining({
          questionId: 'Q3',
          dimension: 'comment',
          optionId: null,
          isSkipped: true,
        }),
        expect.objectContaining({ questionId: 'Q4', optionId: '2', valueNumeric: 2 }),
      ]),
    );
    expect(insertsInto(surveyTextAnswers)).toHaveLength(0);
    expect(updatesOf(surveyInvitations)[0]).toMatchObject({ status: 'submitted' });
    expect((insertsInto(surveyRewardEntitlements)[0] as Row).status).toBe('eligible');
  });

  it('creates a pending_story entitlement when the author has no published story', async () => {
    seed({
      publishedStories: 0,
      study: { rewardPolicy: { redemptionDeadline: '2027-01-31T23:59:59Z' } },
    });

    const result = await submitResponse(token(), validAnswers, 'key-2');

    expect(result).toMatchObject({ ok: true, rewardStatus: 'pending_story' });
    const [entitlement] = insertsInto(surveyRewardEntitlements) as Row[];
    expect(entitlement).toMatchObject({
      invitationId: INVITATION_ID,
      authorId: AUTHOR_ID,
      status: 'pending_story',
    });
    expect(entitlement.expiresAt).toEqual(new Date('2027-01-31T23:59:59Z'));
  });

  it('still grants the gift, with a warning, when the reward policy has no deadline', async () => {
    const warn = surveyRespondentLogger.warn as unknown as jest.Mock;
    warn.mockClear();
    seed({
      publishedStories: 2,
      study: { rewardPolicy: { rewardTypes: ['pdf'], redemptionDeadline: null } },
    });

    const result = await submitResponse(token(), validAnswers, 'key-nodeadline');

    expect(result).toMatchObject({ ok: true, rewardStatus: 'eligible' });
    const [entitlement] = insertsInto(surveyRewardEntitlements) as Row[];
    expect(entitlement.expiresAt).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'survey_reward_policy_missing_deadline',
      expect.objectContaining({ invitationId: INVITATION_ID }),
    );
  });

  it('does not create an entitlement for surveys that are not reward eligible', async () => {
    seed({ definition: buildDefinition({ rewardEligible: false }) });
    const result = await submitResponse(token(), validAnswers, 'key-3');
    expect(result).toEqual({ ok: true, alreadySubmitted: false });
    expect(insertsInto(surveyRewardEntitlements)).toHaveLength(0);
  });

  it('falls back to the existing entitlement when the insert conflicts', async () => {
    state.entitlementConflict = true;
    state.rows.set(surveyRewardEntitlements, [
      { entitlementId: 'entitlement-existing', status: 'eligible' },
    ]);
    await expect(submitResponse(token(), validAnswers, 'key-4')).resolves.toMatchObject({
      ok: true,
      entitlementId: 'entitlement-existing',
    });
  });

  it('persists pruning: answers to hidden questions are neither stored nor shown', async () => {
    const result = await submitResponse(
      token(),
      {
        Q1: { kind: 'choice', optionIds: ['no'] },
        Q2: { kind: 'choice', optionIds: ['b'] },
        Q4: { kind: 'choice', optionIds: ['1'] },
      },
      'key-5',
    );

    expect(result).toMatchObject({ ok: true });
    const [response] = insertsInto(surveyResponses) as Row[];
    expect(response.shownQuestionIds).toEqual(['Q1', 'Q3', 'Q4']);
    const [answerRows] = insertsInto(surveyAnswers) as Row[][];
    expect(answerRows.map((row) => row.questionId)).not.toContain('Q2');
  });

  it('stores free text and other text in survey_text_answers, not in coded answers', async () => {
    await submitResponse(
      token(),
      {
        Q1: { kind: 'choice', optionIds: ['other'], otherText: '  something else  ' },
        Q3: { kind: 'text', text: ' a comment ' },
        Q4: { kind: 'choice', optionIds: ['na'] },
      },
      'key-6',
    );

    const [answerRows] = insertsInto(surveyAnswers) as Row[][];
    expect(answerRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionId: 'Q1', optionId: 'other', hasOtherText: true }),
        expect.objectContaining({ questionId: 'Q3', optionId: null }),
        expect.objectContaining({
          questionId: 'Q4',
          optionId: 'na',
          isNotApplicable: true,
          valueNumeric: null,
        }),
      ]),
    );
    expect(answerRows.find((row) => row.questionId === 'Q3')).not.toHaveProperty('isSkipped', true);
    expect(JSON.stringify(answerRows)).not.toContain('a comment');

    const [textRows] = insertsInto(surveyTextAnswers) as Row[][];
    expect(textRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: 'Q1',
          kind: 'other_text',
          optionId: 'other',
          textValue: 'something else',
        }),
        expect.objectContaining({ questionId: 'Q3', kind: 'free_text', textValue: 'a comment' }),
      ]),
    );
  });

  it('promotes an existing draft response instead of inserting a second one', async () => {
    seed({
      response: {
        responseId: 'response-1',
        status: 'in_progress',
        startedAt: new Date(Date.now() - 60_000),
        draftAnswers: { Q1: { kind: 'choice', optionIds: ['yes'] } },
      },
    });

    await submitResponse(token(), validAnswers, 'key-7');

    expect(insertsInto(surveyResponses)).toHaveLength(0);
    const [update] = updatesOf(surveyResponses);
    expect(update).toMatchObject({ status: 'submitted', submissionKey: 'key-7', draftAnswers: {} });
    expect(update.durationMs as number).toBeGreaterThanOrEqual(60_000);
    const [answerRows] = insertsInto(surveyAnswers) as Row[][];
    expect(answerRows[0]).toMatchObject({ responseId: 'response-1' });
  });

  it('returns validation errors and writes nothing', async () => {
    const result = await submitResponse(
      token(),
      { Q1: { kind: 'choice', optionIds: ['yes'] } },
      'k',
    );

    expect(result).toEqual({
      ok: false,
      reason: 'validation',
      errors: { Q2: 'required', Q4: 'required' },
    });
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it('is idempotent: an already submitted invitation returns the stored result without writing', async () => {
    seed({
      invitation: { status: 'submitted' },
      entitlement: { entitlementId: 'entitlement-1', status: 'pending_story' },
    });

    const first = await submitResponse(token(), validAnswers, 'key-a');
    const second = await submitResponse(token(), validAnswers, 'key-b');

    for (const result of [first, second]) {
      expect(result).toEqual({
        ok: true,
        alreadySubmitted: true,
        entitlementId: 'entitlement-1',
        rewardStatus: 'pending_story',
      });
    }
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it('refuses a submission key already bound to another invitation', async () => {
    state.rows.set(surveyResponses, [{ invitationId: '00000000-0000-4000-8000-0000000000ff' }]);
    await expect(submitResponse(token(), validAnswers, 'shared-key')).resolves.toEqual({
      ok: false,
      reason: 'key_conflict',
    });
    expect(state.inserts).toHaveLength(0);
  });

  it('refuses submissions after the study closed', async () => {
    seed({ study: { status: 'closed' } });
    await expect(submitResponse(token(), validAnswers, 'key-8')).resolves.toEqual({
      ok: false,
      reason: 'closed',
    });
    expect(state.inserts).toHaveLength(0);
  });

  it('refuses unknown invitations with the generic invalid reason', async () => {
    state.rows.set(surveyInvitations, []);
    await expect(submitResponse(token(), validAnswers, 'key-9')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
