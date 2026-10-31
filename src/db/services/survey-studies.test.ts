import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

type Row = Record<string, unknown>;

const state = {
  /** FIFO of results consumed by awaited select/update/insert/delete chains. */
  results: [] as unknown[],
  /** FIFO of results consumed by `execute`. */
  executeResults: [] as Array<{ rows: Row[] }>,
  executed: [] as SQL[],
  inserts: [] as Row[],
};

function chain() {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        const value = state.results.length > 0 ? state.results.shift() : [];
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
          if (value instanceof Error) reject(value);
          else resolve(value);
        };
      }
      if (prop === 'values') {
        return (values: Row | Row[]) => {
          state.inserts.push(...(Array.isArray(values) ? values : [values]));
          return proxy;
        };
      }
      return () => proxy;
    },
  };
  const proxy: object = new Proxy({}, handler);
  return proxy;
}

jest.mock('@/db', () => {
  const executor = {
    select: () => chain(),
    insert: () => chain(),
    update: () => chain(),
    delete: () => chain(),
    execute: async (query: SQL) => {
      state.executed.push(query);
      return state.executeResults.shift() ?? { rows: [] };
    },
  };
  return { db: { ...executor, transaction: async (cb: (tx: unknown) => unknown) => cb(executor) } };
});

const getPublishedSurveyVersionMock = jest.fn();
jest.mock('@/db/services/surveys', () => ({
  getPublishedSurveyVersion: (...a: unknown[]) => getPublishedSurveyVersionMock(...a),
}));

import {
  canTransitionStudy,
  createStudy,
  getStudy,
  linkCampaigns,
  previewAudience,
  setStudyStatus,
  snapshotAudience,
  updateStudy,
} from './survey-studies';
import { SurveyAdminError } from '@/lib/surveys/errors';

const STUDY_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const dialect = new PgDialect();
const render = (query: SQL) => dialect.sqlToQuery(query);

function study(overrides: Row = {}) {
  return {
    studyId: STUDY_ID,
    studyKey: 'q4',
    title: 'Q4',
    status: 'draft',
    holdoutPercent: 10,
    opensAt: null,
    closesAt: new Date('2026-12-01T00:00:00Z'),
    ...overrides,
  };
}

async function expectError(promise: Promise<unknown>, code: string, status: number) {
  await expect(promise).rejects.toMatchObject({ code, status });
  await promise.catch((error) => expect(error).toBeInstanceOf(SurveyAdminError));
}

beforeEach(() => {
  state.results = [];
  state.executeResults = [];
  state.executed = [];
  state.inserts = [];
  getPublishedSurveyVersionMock.mockReset();
});

describe('study status transitions', () => {
  it('allows only draft -> active -> closed -> archived', () => {
    expect(canTransitionStudy('draft', 'active')).toBe(true);
    expect(canTransitionStudy('active', 'closed')).toBe(true);
    expect(canTransitionStudy('closed', 'archived')).toBe(true);
    expect(canTransitionStudy('active', 'draft')).toBe(false);
    expect(canTransitionStudy('draft', 'closed')).toBe(false);
    expect(canTransitionStudy('closed', 'active')).toBe(false);
    expect(canTransitionStudy('archived', 'draft')).toBe(false);
  });

  it('rejects an invalid transition with 409', async () => {
    state.results = [[study({ status: 'active' })]];
    await expectError(setStudyStatus(STUDY_ID, 'draft'), 'invalid_transition', 409);
  });

  it('404s for an unknown study', async () => {
    state.results = [[]];
    await expectError(setStudyStatus(STUDY_ID, 'active'), 'study_not_found', 404);
  });

  it('requires cohorts and a closing date to activate', async () => {
    // study lookup, then (empty) cohort lookup
    state.results = [[study()], []];
    await expectError(setStudyStatus(STUDY_ID, 'active'), 'study_incomplete', 409);
    state.results = [[study({ closesAt: null })], [{ cohort: {}, surveyId: 'a', version: 1 }]];
    await expectError(setStudyStatus(STUDY_ID, 'active'), 'study_incomplete', 409);
  });

  it('activates a complete draft study', async () => {
    state.results = [
      [study()],
      [{ cohort: { cohortKey: 'C1', studyId: STUDY_ID }, surveyId: 'a', version: 1 }],
      [{ studyId: STUDY_ID }], // update ... returning
      [study({ status: 'active' })], // getStudy -> study
      [{ cohort: { cohortKey: 'C1', studyId: STUDY_ID }, surveyId: 'a', version: 1 }],
      [],
    ];
    const result = await setStudyStatus(STUDY_ID, 'active');
    expect(result.study.status).toBe('active');
  });
});

describe('reward policy gate on activation', () => {
  const VERSION_ID = '4f2504e0-4f89-41d3-9a0c-0305e82c3302';
  const cohortRow = {
    cohort: { cohortKey: 'C1', studyId: STUDY_ID, surveyVersionId: VERSION_ID },
    surveyId: 'a',
    version: 1,
  };
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  const activate = (policy: unknown, rewardEligible: boolean) => {
    state.results = [
      [study({ rewardPolicy: policy })],
      [cohortRow],
      [{ definition: { rewardEligible } }], // cohort survey definitions
      [{ studyId: STUDY_ID }], // update ... returning
      [study({ status: 'active' })], // getStudy
      [cohortRow],
      [],
    ];
    return setStudyStatus(STUDY_ID, 'active');
  };

  it.each([
    ['no policy', null],
    ['no deadline', { rewardTypes: ['pdf'], redemptionDeadline: null }],
    ['invalid deadline', { rewardTypes: ['pdf'], redemptionDeadline: 'soon' }],
    ['past deadline', { rewardTypes: ['pdf'], redemptionDeadline: past }],
    ['no reward types', { rewardTypes: [], redemptionDeadline: future }],
  ])('rejects a reward-eligible study with %s', async (_label, policy) => {
    await expectError(activate(policy, true), 'reward_policy_required', 409);
  });

  it('activates a reward-eligible study with a complete policy', async () => {
    const result = await activate({ rewardTypes: ['pdf'], redemptionDeadline: future }, true);
    expect(result.study.status).toBe('active');
  });

  it('does not require a policy when no cohort survey is reward-eligible', async () => {
    const result = await activate(null, false);
    expect(result.study.status).toBe('active');
  });
});

describe('createStudy', () => {
  const input = {
    studyKey: 'q4',
    title: 'Q4',
    holdoutPercent: 10,
    cohorts: [{ cohortKey: 'C1', surveyId: 'activation_no_story', version: 1 }],
  };

  it('requires every referenced survey version to exist', async () => {
    getPublishedSurveyVersionMock.mockResolvedValue(null);
    await expectError(createStudy(input, 'a@b.pt'), 'survey_version_not_found', 400);
  });

  it('rejects unknown and duplicate cohort keys', async () => {
    getPublishedSurveyVersionMock.mockResolvedValue({ surveyVersionId: 'v1' });
    await expectError(
      createStudy(
        { ...input, cohorts: [{ cohortKey: 'U1', surveyId: 'x', version: 1 }] },
        'a@b.pt',
      ),
      'invalid_cohort_key',
      400,
    );
    await expectError(
      createStudy(
        {
          ...input,
          cohorts: [
            { cohortKey: 'C1', surveyId: 'x', version: 1 },
            { cohortKey: 'C1', surveyId: 'y', version: 1 },
          ],
        },
        'a@b.pt',
      ),
      'duplicate_cohort',
      400,
    );
  });

  it('rejects a closing date before the opening date', async () => {
    await expectError(
      createStudy(
        { ...input, opensAt: new Date('2026-12-01'), closesAt: new Date('2026-11-01') },
        'a@b.pt',
      ),
      'invalid_window',
      400,
    );
  });

  it('records the mapping and maps a unique violation to 409', async () => {
    getPublishedSurveyVersionMock.mockResolvedValue({ surveyVersionId: 'version-1' });
    state.results = [Object.assign(new Error('dup'), { code: '23505' })];
    await expectError(createStudy(input, 'a@b.pt'), 'study_key_conflict', 409);
  });

  it('inserts the study with the actor and its cohorts', async () => {
    getPublishedSurveyVersionMock.mockResolvedValue({ surveyVersionId: 'version-1' });
    state.results = [
      [{ studyId: STUDY_ID }], // insert study returning
      [], // insert cohorts
      [study()], // getStudy: study
      [], // cohorts
      [], // counts
    ];
    await createStudy(input, 'admin@mythoria.pt');
    expect(state.inserts[0]).toMatchObject({
      studyKey: 'q4',
      createdBy: 'admin@mythoria.pt',
      holdoutPercent: 10,
    });
    expect(state.inserts[1]).toEqual({
      studyId: STUDY_ID,
      cohortKey: 'C1',
      surveyVersionId: 'version-1',
    });
  });
});

describe('updateStudy', () => {
  it('only updates draft studies', async () => {
    state.results = [[study({ status: 'active' })]];
    await expectError(updateStudy(STUDY_ID, { title: 'x' }), 'study_not_draft', 409);
  });

  it('validates the merged opening/closing window', async () => {
    state.results = [[study({ opensAt: new Date('2026-11-01') })]];
    await expectError(
      updateStudy(STUDY_ID, { closesAt: new Date('2026-10-01') }),
      'invalid_window',
      400,
    );
  });

  it('409s when the study was activated concurrently', async () => {
    state.results = [[study()], []];
    await expectError(updateStudy(STUDY_ID, { title: 'x' }), 'study_not_draft', 409);
  });
});

describe('getStudy', () => {
  it('splits invitation counts by cohort/status and reports holdouts apart', async () => {
    state.results = [
      [study()],
      [],
      [
        { cohortKey: 'C1', status: 'not_started', isHoldout: false, count: 8 },
        { cohortKey: 'C1', status: 'submitted', isHoldout: false, count: 2 },
        { cohortKey: 'C1', status: 'not_started', isHoldout: true, count: 1 },
      ],
    ];
    const result = await getStudy(STUDY_ID);
    expect(result.invitationCounts).toEqual({ C1: { not_started: 8, submitted: 2 } });
    expect(result.holdoutCounts).toEqual({ C1: 1 });
  });
});

describe('linkCampaigns', () => {
  it('requires at least one campaign id', async () => {
    await expectError(linkCampaigns({ studyId: STUDY_ID, cohortKey: 'C1' }), 'invalid_input', 400);
  });

  it('404s for a cohort outside the study', async () => {
    state.results = [[study()], []];
    await expectError(
      linkCampaigns({ studyId: STUDY_ID, cohortKey: 'C3', inviteCampaignId: 'c1' }),
      'cohort_not_found',
      404,
    );
  });
});

describe('previewAudience', () => {
  const rows = (entries: Array<[string, number, number, number]>) => ({
    rows: entries.map(([bucket, classified, email_eligible, already_invited]) => ({
      bucket,
      classified: String(classified),
      email_eligible: String(email_eligible),
      already_invited: String(already_invited),
    })),
  });

  it('shapes the aggregate result and reconciles', async () => {
    state.results = [[study()]];
    state.executeResults = [
      rows([
        ['C1', 100, 80, 5],
        ['C2', 40, 30, 0],
        ['C3', 10, 10, 0],
        ['U1', 3, 3, 0],
        ['U2', 2, 2, 0],
        ['ACTIVE', 155, 0, 0],
        ['CLOSED', 7, 0, 0],
        ['DUPLICATES', 0, 0, 0],
      ]),
    ];
    const preview = await previewAudience(STUDY_ID);
    expect(preview).toEqual({
      totalAuthors: 162,
      closedAccounts: 7,
      cohorts: {
        C1: { classified: 100, emailEligible: 80, suppressed: 20, alreadyInvited: 5 },
        C2: { classified: 40, emailEligible: 30, suppressed: 10, alreadyInvited: 0 },
        C3: { classified: 10, emailEligible: 10, suppressed: 0, alreadyInvited: 0 },
      },
      unclassified: { U1: 3, U2: 2 },
      duplicateEmails: 0,
      reconciles: true,
    });
    expect(state.executed).toHaveLength(1);
  });

  it('reports a mismatch when classes do not add up to active authors', async () => {
    state.results = [[study()]];
    state.executeResults = [
      rows([
        ['C1', 10, 10, 0],
        ['ACTIVE', 11, 0, 0],
      ]),
    ];
    expect((await previewAudience(STUDY_ID)).reconciles).toBe(false);
  });

  it('runs one query with the default notification preferences and paid rule', async () => {
    state.results = [[study()]];
    await previewAudience(STUDY_ID);
    const { sql: text, params } = render(state.executed[0]);
    expect(state.executed).toHaveLength(1);
    expect(text).toContain("status = 'completed' and amount > 0");
    expect(text).toContain("status = 'published'");
    expect(text).toContain("not in ('unsub', 'hard_bounce')");
    expect(text).toContain('lower(trim(email))');
    expect(params).toEqual(expect.arrayContaining(['news', 'inspiration', STUDY_ID]));
  });

  it('treats an empty preference list as nobody eligible', async () => {
    state.results = [[study()]];
    await previewAudience(STUDY_ID, []);
    expect(render(state.executed[0]).sql).toContain('false as email_eligible');
  });
});

describe('snapshotAudience', () => {
  it('requires a draft or active study', async () => {
    state.results = [[study({ status: 'closed' })]];
    await expectError(snapshotAudience(STUDY_ID, ['C1']), 'study_not_snapshottable', 409);
  });

  it('requires the requested cohorts to be configured', async () => {
    state.results = [[study()], [{ cohortKey: 'C1' }]];
    await expectError(snapshotAudience(STUDY_ID, ['C2']), 'cohort_not_found', 400);
  });

  it('requires at least one cohort', async () => {
    await expectError(snapshotAudience(STUDY_ID, []), 'invalid_input', 400);
  });

  it('dry run reports counts without inserting', async () => {
    state.results = [[study()], [{ cohortKey: 'C1' }]];
    state.executeResults = [
      {
        rows: [
          { cohort_key: 'C1', is_holdout: false, n: '9', existing: '1' },
          { cohort_key: 'C1', is_holdout: true, n: '1', existing: '0' },
        ],
      },
    ];
    const result = await snapshotAudience(STUDY_ID, ['C1'], undefined, true);
    expect(result).toEqual({
      dryRun: true,
      inserted: { C1: 10, C2: 0, C3: 0 },
      holdout: { C1: 1, C2: 0, C3: 0 },
      skippedExisting: 1,
    });
    expect(render(state.executed[0]).sql).not.toContain('insert into survey_invitations');
  });

  it('inserts idempotently with the deterministic holdout formula and normalized locale', async () => {
    state.results = [
      [study({ holdoutPercent: 15 })],
      [{ cohortKey: 'C1' }, { cohortKey: 'C2' }],
      [],
    ];
    state.executeResults = [
      {
        rows: [
          { cohort_key: 'C1', is_holdout: false, n: '5', existing: '2' },
          { cohort_key: 'C2', is_holdout: true, n: '1', existing: '2' },
        ],
      },
    ];
    const result = await snapshotAudience(STUDY_ID, ['C1', 'C2', 'C1']);
    expect(result).toEqual({
      dryRun: false,
      inserted: { C1: 5, C2: 1, C3: 0 },
      holdout: { C1: 0, C2: 1, C3: 0 },
      skippedExisting: 2,
    });
    const { sql: text, params } = render(state.executed[0]);
    expect(text).toContain('on conflict (study_id, author_id) do nothing');
    expect(text).toContain("(('x' || substr(encode(sha256(convert_to($");
    expect(text).toContain('::bit(32)::bigint) % 100) < $');
    // Typed as uuid first so the hash input is Postgres' canonical lowercase text.
    expect(text).toContain('::uuid::text || c.author_id::text');
    expect(text).toContain('then $');
    expect(text).toContain("else 'en-US' end");
    expect(params).toEqual(
      expect.arrayContaining([STUDY_ID, 15, 'C1', 'C2', 'pt-PT', 'pt', 'pt-pt']),
    );
  });

  it('normalizes an upper-case study id before it feeds the holdout hash', async () => {
    state.results = [[study()], [{ cohortKey: 'C1' }], []];
    state.executeResults = [{ rows: [] }];
    await snapshotAudience(STUDY_ID.toUpperCase(), ['C1']);
    const { params } = render(state.executed[0]);
    expect(params).toContain(STUDY_ID);
    expect(params).not.toContain(STUDY_ID.toUpperCase());
  });

  it('returns zero counts when nothing was inserted', async () => {
    state.results = [[study()], [{ cohortKey: 'C1' }], []];
    state.executeResults = [
      { rows: [{ cohort_key: null, is_holdout: null, n: '0', existing: '4' }] },
    ];
    const result = await snapshotAudience(STUDY_ID, ['C1']);
    expect(result.inserted).toEqual({ C1: 0, C2: 0, C3: 0 });
    expect(result.skippedExisting).toBe(4);
  });
});
