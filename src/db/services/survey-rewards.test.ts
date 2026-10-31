/** @jest-environment node */

type Queue = unknown[];

const queues: { select: Queue; update: Queue; transaction: Queue } = {
  select: [],
  update: [],
  transaction: [],
};
const updateSets: Array<Record<string, unknown>> = [];

/** A thenable that accepts any drizzle builder call and resolves to `result`. */
function chain(result: unknown, onSet?: (values: Record<string, unknown>) => void) {
  const proxy: unknown = new Proxy(function noop() {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'set') {
        return (values: Record<string, unknown>) => {
          onSet?.(values);
          return proxy;
        };
      }
      return () => proxy;
    },
  });
  return proxy;
}

const executor = {
  select: jest.fn(() => chain(queues.select.shift() ?? [])),
  update: jest.fn(() => chain(queues.update.shift() ?? [], (values) => updateSets.push(values))),
};

jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  exists: () => 'EXISTS',
}));

jest.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => (executor.select as (...a: unknown[]) => unknown)(...args),
    update: (...args: unknown[]) => (executor.update as (...a: unknown[]) => unknown)(...args),
    transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback(executor)),
  },
}));

const compensateMock = jest.fn();
jest.mock('@/lib/product-generation', () => ({
  compensateProductGeneration: (...args: unknown[]) => compensateMock(...args),
}));

import {
  listEligibleStories,
  parseRewardPolicy,
  reconcileRewards,
  selectReward,
  SurveyRewardError,
  unlockPendingStories,
} from './survey-rewards';

const entitlement = (overrides: Record<string, unknown> = {}) => ({
  entitlementId: 'ent-1',
  invitationId: 'inv-1',
  authorId: 'author-1',
  status: 'eligible',
  rewardType: null,
  storyId: null,
  expiresAt: null,
  ...overrides,
});

const policy = (overrides: Record<string, unknown> = {}) => ({
  rewardPolicy: {
    rewardTypes: ['pdf', 'audiobook'],
    redemptionDeadline: '2027-01-31T23:59:59Z',
    allowExistingAudiobook: false,
    ...overrides,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  queues.select = [];
  queues.update = [];
  updateSets.length = 0;
});

describe('parseRewardPolicy', () => {
  it('defaults to both reward types and no existing audiobooks', () => {
    expect(parseRewardPolicy(null)).toEqual({
      rewardTypes: ['pdf', 'audiobook'],
      redemptionDeadline: null,
      allowExistingAudiobook: false,
    });
  });

  it('keeps only known reward types', () => {
    expect(
      parseRewardPolicy({
        rewardTypes: ['pdf', 'pdf', 'coupon'],
        redemptionDeadline: '2027-01-31T23:59:59Z',
        allowExistingAudiobook: true,
      }),
    ).toEqual({
      rewardTypes: ['pdf'],
      redemptionDeadline: '2027-01-31T23:59:59Z',
      allowExistingAudiobook: true,
    });
  });
});

describe('listEligibleStories', () => {
  it('flags stories that already have an audiobook or a redeemed PDF', async () => {
    queues.select = [
      [
        { storyId: 's1', title: 'One', coverUri: null, audiobookStatus: 'completed' },
        { storyId: 's2', title: 'Two', coverUri: null, audiobookStatus: 'generating' },
        { storyId: 's3', title: 'Three', coverUri: null, audiobookStatus: null },
      ],
      [{ storyId: 's3' }],
    ];

    await expect(listEligibleStories('author-1')).resolves.toEqual([
      expect.objectContaining({ storyId: 's1', hasAudiobook: true, pdfAlreadyRedeemed: false }),
      expect.objectContaining({
        storyId: 's2',
        hasAudiobook: false,
        audiobookGenerating: true,
      }),
      expect.objectContaining({ storyId: 's3', hasAudiobook: false, pdfAlreadyRedeemed: true }),
    ]);
  });

  it('returns nothing without published stories', async () => {
    queues.select = [[]];
    await expect(listEligibleStories('author-1')).resolves.toEqual([]);
  });
});

describe('selectReward', () => {
  const published = (overrides: Record<string, unknown> = {}) => ({
    storyId: 'story-1',
    status: 'published',
    audiobookStatus: null,
    ...overrides,
  });

  it('records the choice for an owned published story', async () => {
    queues.select = [[entitlement()], [policy()], [published()]];
    queues.update = [[entitlement({ status: 'selected', rewardType: 'pdf', storyId: 'story-1' })]];

    await expect(selectReward('ent-1', 'author-1', 'pdf', 'story-1')).resolves.toMatchObject({
      status: 'selected',
    });
    expect(updateSets[0]).toMatchObject({
      rewardType: 'pdf',
      storyId: 'story-1',
      status: 'selected',
    });
  });

  it('is idempotent for an entitlement already processing the same choice', async () => {
    const processing = entitlement({
      status: 'processing',
      rewardType: 'pdf',
      storyId: 'story-1',
    });
    queues.select = [[processing]];
    await expect(selectReward('ent-1', 'author-1', 'pdf', 'story-1')).resolves.toBe(processing);
    expect(executor.update).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown or foreign entitlement', [[]], 'not_found'],
    ['a pending_story entitlement', [[entitlement({ status: 'pending_story' })]], 'pending_story'],
    ['a delivered entitlement', [[entitlement({ status: 'delivered' })]], 'already_redeemed'],
    ['an expired status', [[entitlement({ status: 'expired' })]], 'expired'],
    ['a past deadline', [[entitlement({ expiresAt: new Date(Date.now() - 1000) })]], 'expired'],
    [
      'a reward type outside the policy',
      [[entitlement()], [policy({ rewardTypes: ['pdf'] })]],
      'reward_type_not_allowed',
      'audiobook',
    ],
    ['a story that is not owned', [[entitlement()], [policy()], []], 'story_not_found'],
    [
      'an unpublished story',
      [[entitlement()], [policy()], [published({ status: 'draft' })]],
      'story_not_found',
    ],
    [
      'an audiobook for a story that already has one',
      [[entitlement()], [policy()], [published({ audiobookStatus: 'completed' })]],
      'audiobook_exists',
      'audiobook',
    ],
  ])('rejects %s', async (_label, selects, code, rewardType = 'pdf') => {
    queues.select = selects as unknown[];
    await expect(
      selectReward('ent-1', 'author-1', rewardType as 'pdf' | 'audiobook', 'story-1'),
    ).rejects.toMatchObject({ code });
    expect(executor.update).not.toHaveBeenCalled();
  });

  it('allows an existing audiobook when the policy permits it', async () => {
    queues.select = [
      [entitlement()],
      [policy({ allowExistingAudiobook: true })],
      [published({ audiobookStatus: 'completed' })],
    ];
    queues.update = [[entitlement({ status: 'selected', rewardType: 'audiobook' })]];
    await expect(selectReward('ent-1', 'author-1', 'audiobook', 'story-1')).resolves.toMatchObject({
      status: 'selected',
    });
  });

  it('lets a failed gift be re-selected for retry', async () => {
    queues.select = [[entitlement({ status: 'failed' })], [policy()], [published()]];
    queues.update = [[entitlement({ status: 'selected' })]];
    await expect(selectReward('ent-1', 'author-1', 'pdf', 'story-1')).resolves.toMatchObject({
      status: 'selected',
    });
  });

  it('throws SurveyRewardError instances', async () => {
    queues.select = [[]];
    await expect(selectReward('ent-1', 'author-1', 'pdf', 'story-1')).rejects.toBeInstanceOf(
      SurveyRewardError,
    );
  });
});

describe('unlockPendingStories', () => {
  it('returns the ids that became eligible', async () => {
    queues.update = [[{ entitlementId: 'ent-1' }, { entitlementId: 'ent-2' }]];
    await expect(unlockPendingStories()).resolves.toEqual(['ent-1', 'ent-2']);
    expect(updateSets[0]).toMatchObject({ status: 'eligible' });
  });
});

describe('reconcileRewards', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  const row = (overrides: Record<string, unknown>) => ({
    entitlementId: 'ent-1',
    rewardType: 'pdf',
    productRunId: 'run-1',
    storyId: 'story-1',
    requestRunId: 'run-1',
    requestStatus: 'queued',
    requestCreatedAt: new Date('2026-11-01T11:59:00Z'),
    failureStage: null,
    failureCode: null,
    audiobookStatus: null,
    ...overrides,
  });

  it('delivers completed runs and fails failed or orphaned ones', async () => {
    queues.select = [
      [
        row({ entitlementId: 'ok', requestStatus: 'completed' }),
        row({
          entitlementId: 'bad',
          requestStatus: 'failed',
          failureStage: 'sgw',
          failureCode: 'boom',
        }),
        row({ entitlementId: 'orphan', requestRunId: null, requestStatus: null }),
        row({ entitlementId: 'busy', requestStatus: 'running' }),
      ],
    ];
    queues.update = [
      [{ entitlementId: 'ok' }], // delivered
      [{ entitlementId: 'bad' }], // failed
      [{ entitlementId: 'orphan' }], // failed
      [], // expire sweep
      [{ invitationId: 'inv-9' }], // invitations
    ];

    const result = await reconcileRewards(now);

    expect(result).toEqual({
      delivered: ['ok'],
      failed: ['bad', 'orphan'],
      expired: [],
      invitationsExpired: 1,
    });
    expect(updateSets[0]).toMatchObject({ status: 'delivered', deliveredAt: now });
    expect(updateSets[1]).toMatchObject({ status: 'failed', lastError: 'sgw:boom' });
    expect(updateSets[2]).toMatchObject({ status: 'failed', lastError: 'missing_run' });
  });

  it('uses the story status as the faster audiobook signal', async () => {
    queues.select = [
      [
        row({
          entitlementId: 'a1',
          rewardType: 'audiobook',
          requestStatus: 'running',
          audiobookStatus: 'completed',
        }),
        row({
          entitlementId: 'a2',
          rewardType: 'audiobook',
          requestStatus: 'queued',
          audiobookStatus: 'failed',
        }),
        // pdf rewards ignore the audiobook status
        row({ entitlementId: 'p1', requestStatus: 'queued', audiobookStatus: 'completed' }),
      ],
    ];
    queues.update = [[{ entitlementId: 'a1' }], [{ entitlementId: 'a2' }], [], []];

    const result = await reconcileRewards(now);
    expect(result.delivered).toEqual(['a1']);
    expect(result.failed).toEqual(['a2']);
  });

  it('compensates a request stuck pending and leaves a fresh one alone', async () => {
    queues.select = [
      [
        row({
          entitlementId: 'stuck',
          requestStatus: 'pending',
          requestCreatedAt: new Date('2026-11-01T11:00:00Z'),
        }),
        row({ entitlementId: 'fresh', requestStatus: 'pending' }),
      ],
    ];
    queues.update = [[], []];

    const result = await reconcileRewards(now);
    expect(compensateMock).toHaveBeenCalledTimes(1);
    expect(compensateMock).toHaveBeenCalledWith('run-1', 'reconcile', 'stuck_pending');
    expect(result.failed).toEqual(['stuck']);
  });

  it('resets a stuck generating audiobook status once its pending request is compensated', async () => {
    compensateMock.mockResolvedValue(true);
    queues.select = [
      [
        row({
          entitlementId: 'stuck-audio',
          rewardType: 'audiobook',
          requestStatus: 'pending',
          requestCreatedAt: new Date('2026-11-01T11:00:00Z'),
        }),
        // a pdf reward never touches the story's audiobook status
        row({
          entitlementId: 'stuck-pdf',
          requestStatus: 'pending',
          requestRunId: 'run-2',
          requestCreatedAt: new Date('2026-11-01T11:00:00Z'),
        }),
      ],
    ];
    queues.update = [[], [], []];

    await reconcileRewards(now);

    expect(executor.update).toHaveBeenCalledTimes(3); // story reset + expire sweep + invitations
    expect(updateSets[0]).toEqual({ audiobookStatus: null });
  });

  it('leaves the story status alone when a concurrent launcher already queued the request', async () => {
    compensateMock.mockResolvedValue(false);
    queues.select = [
      [
        row({
          entitlementId: 'stuck-audio',
          rewardType: 'audiobook',
          requestStatus: 'pending',
          requestCreatedAt: new Date('2026-11-01T11:00:00Z'),
        }),
      ],
    ];
    queues.update = [[], []];

    const result = await reconcileRewards(now);

    expect(result.failed).toEqual([]);
    expect(executor.update).toHaveBeenCalledTimes(2); // expire sweep + invitations only
    expect(updateSets).not.toContainEqual({ audiobookStatus: null });
  });

  it('reports expired gifts', async () => {
    queues.select = [[]];
    queues.update = [[{ entitlementId: 'old' }], []];
    const result = await reconcileRewards(now);
    expect(result.expired).toEqual(['old']);
    expect(updateSets[0]).toMatchObject({ status: 'expired' });
  });
});
