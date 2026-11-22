/** @jest-environment node */
import { db } from '@/db';
import { saveOwnerTurn } from '@/db/services/biographer';
import { settleResetVoiceSessions } from '@/db/services/whisperer-voice';
import { sgwFetch } from '@/lib/sgw-client';
import {
  dictateWhisperer,
  ensureWhispererDraftReady,
  getWhisperer,
  handoffWhisperer,
  refreshWhispererReadiness,
  resetWhisperer,
  sendWhispererTurn,
  startWhisperer,
  verifyWhispererStructure,
} from './server';
import { privateWhispererBucket } from './private-media';
import { readinessRevisionChanged, whispererRubricVersion } from './types';
import { getWhispererOpening } from './opening.server';

jest.mock('@/db', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/db/services/biographer', () => ({
  ...jest.requireActual('@/db/services/biographer'),
  saveOwnerTurn: jest.fn(),
}));
jest.mock('@/db/services/whisperer-voice', () => ({ settleResetVoiceSessions: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
jest.mock('./private-media', () => ({
  privateWhispererBucket: jest.fn(),
  whispererDraftMediaPrefix: jest.fn(),
}));

const author = '82c044b7-5a61-42e6-a5ea-53851af9af32';
const draft = 'c755b3e8-46e0-470c-8a0c-9777135be407';
const project = '0dbd7902-1dc2-423e-bd67-1362b919e062';
const previous = '226175ed-8af4-45a4-80f4-d9ab41ac9fb2';
const request = '02973b0e-5e3d-4abd-83cc-9c26c0064fab';

type Query = {
  from: () => Query;
  where: () => Query;
  orderBy: () => Query;
  then: (resolve: (selectedRows: unknown[]) => unknown) => Promise<unknown>;
};

function transactionReads(...rows: unknown[][]) {
  const tx = {
    execute: jest.fn(),
    select: jest.fn(() => {
      const chain: Query = {
        from: jest.fn(() => chain),
        where: jest.fn(() => chain),
        orderBy: jest.fn(() => chain),
        then: (resolve: (selectedRows: unknown[]) => unknown) =>
          Promise.resolve(resolve(rows.shift() ?? [])),
      };
      return chain;
    }),
    update: jest.fn(),
    insert: jest.fn(),
  };
  jest
    .mocked(db.transaction)
    .mockImplementationOnce(async (action) =>
      action(tx as unknown as Parameters<typeof action>[0]),
    );
  return tx;
}

describe('Story Whisperer draft binding', () => {
  beforeEach(() => jest.clearAllMocks());

  it('binds a legacy empty interview once in its saved locale and retains opted-in material', async () => {
    const oldContext = { brief: 'Saved material' };
    const opening = getWhispererOpening('pt-PT', 'romance');
    const newContext = { ...oldContext, primaryIntent: 'romance', opening };
    const initialProject = { id: project, revision: 2, locale: 'pt-PT' };
    const updatedProject = { ...initialProject, revision: 3 };
    const participant = { id: 'owner' };
    const tx = transactionReads(
      [],
      [],
      [{ projectId: project, context: oldContext }],
      [initialProject],
      [participant],
      [],
      [],
      [{ projectId: project, context: newContext }],
      [updatedProject],
      [participant],
      [],
      [],
    );
    const set = jest.fn(() => ({ where: jest.fn() }));
    tx.update.mockReturnValue({ set });
    await expect(
      startWhisperer(
        author,
        'Author',
        draft,
        { locale: 'en-US', primaryIntent: 'romance' },
        project,
      ),
    ).resolves.toMatchObject({
      interview: {
        revision: 3,
        primaryIntent: 'romance',
        opening,
        savedInputs: oldContext,
      },
    });
    expect(set).toHaveBeenCalledWith({ context: newContext });

    const replay = transactionReads(
      [],
      [],
      [{ projectId: project, context: newContext }],
      [updatedProject],
      [participant],
      [],
      [],
    );
    await expect(
      startWhisperer(
        author,
        'Author',
        draft,
        { locale: 'en-US', primaryIntent: 'pet_stories' },
        project,
      ),
    ).resolves.toMatchObject({ interview: { revision: 3, primaryIntent: 'romance', opening } });
    expect(replay.update).not.toHaveBeenCalled();
  });

  it('preserves the historical opening for a legacy interview with saved turns', async () => {
    const turn = { id: request, final: true, included: true, role: 'user', text: 'A saved reply' };
    const tx = transactionReads(
      [],
      [],
      [{ projectId: project }],
      [{ id: project, revision: 2, locale: 'pt-PT' }],
      [{ id: 'owner' }],
      [turn],
      [],
    );
    const result = await startWhisperer(
      author,
      'Author',
      draft,
      { locale: 'pt-PT', primaryIntent: 'romance' },
      project,
    );
    expect(result.interview?.turns).toEqual([turn]);
    expect(result.interview?.opening).toBeUndefined();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each([
    {
      readinessRevision: 5,
      rubricVersion: whispererRubricVersion,
      hasAnswer: true,
      needsRefresh: true,
    },
    {
      readinessRevision: 6,
      rubricVersion: whispererRubricVersion,
      hasAnswer: true,
      needsRefresh: false,
    },
    { readinessRevision: 6, rubricVersion: 2, hasAnswer: true, needsRefresh: true },
    { readinessRevision: 6, rubricVersion: undefined, hasAnswer: true, needsRefresh: true },
    { readinessRevision: null, rubricVersion: undefined, hasAnswer: false, needsRefresh: false },
  ])(
    'reports whether saved material needs a fresh assessment (%j)',
    async ({ readinessRevision, rubricVersion, hasAnswer, needsRefresh }) => {
      transactionReads(
        [],
        [],
        [{ projectId: project, readinessRevision, readiness: { rubricVersion } }],
        [{ id: project, revision: 6 }],
        [{ id: 'owner' }],
        hasAnswer
          ? [{ id: request, final: true, included: true, role: 'user', text: 'A saved reply' }]
          : [],
        [],
      );
      await expect(getWhisperer(author, draft)).resolves.toMatchObject({
        interview: { readinessNeedsRefresh: needsRefresh },
      });
      expect(sgwFetch).not.toHaveBeenCalled();
    },
  );

  it('invalidates a ready v2 assessment at the same revision and keeps its saved material', async () => {
    const turns = [
      { id: 'old-reply', role: 'user', final: true, included: true, text: 'Lisbon in 1998.' },
      { id: request, role: 'user', final: true, included: true, text: 'I was a student.' },
    ];
    const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
    const binding = {
      projectId: project,
      readinessRevision: 6,
      readiness: {
        rubricVersion: 2,
        ready: true,
        areas,
        missing: [],
        hint: '',
        firstReadyTurnId: 'old-reply',
      },
    };
    const snapshot = [[binding], [{ id: project, revision: 6 }], [{ id: 'owner' }], turns, []];
    transactionReads([], [], ...snapshot);
    const { interview } = await getWhisperer(author, draft);
    expect(interview).toMatchObject({
      revision: 6,
      turns,
      readinessNeedsRefresh: true,
      readiness: {
        rubricVersion: whispererRubricVersion,
        ready: false,
        areas: { characters: 'missing', setting: 'missing', plot: 'missing' },
      },
    });
    expect(interview?.readiness.firstReadyTurnId).toBeUndefined();

    transactionReads([], [], ...snapshot);
    await expect(ensureWhispererDraftReady(author, draft, project)).rejects.toMatchObject({
      status: 409,
    });

    transactionReads([], [], ...snapshot);
    const tx = transactionReads(...snapshot);
    const set = jest.fn(() => ({ where: jest.fn() }));
    tx.update.mockReturnValue({ set });
    jest.mocked(sgwFetch).mockResolvedValueOnce(
      Response.json({
        readiness: {
          rubricVersion: whispererRubricVersion,
          areas: { ...areas, plot: 'developing' },
          hint: '',
        },
      }),
    );
    const refreshed = await refreshWhispererReadiness(author, draft, project);
    expect(refreshed).toMatchObject({
      revision: 6,
      readiness: { rubricVersion: whispererRubricVersion, ready: false, missing: ['plot'] },
    });
    expect(refreshed.readiness.firstReadyTurnId).toBeUndefined();
    expect(set).toHaveBeenCalledWith({ readinessRevision: 6, readiness: refreshed.readiness });
    expect(sgwFetch).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(String(jest.mocked(sgwFetch).mock.calls[0][1]?.body));
    expect(requestBody.turns).toEqual(
      turns.map(({ role, text }) => expect.objectContaining({ role, text })),
    );
  });

  it.each([2, undefined])('rejects an SGW assessment with rubric version %s', async (version) => {
    const reply = { id: request, role: 'user', final: true, included: true, text: 'A saved reply' };
    const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
    const tx = transactionReads(
      [],
      [],
      [{ projectId: project }],
      [{ id: project, revision: 6 }],
      [{ id: 'owner' }],
      [reply],
      [],
    );
    jest
      .mocked(sgwFetch)
      .mockResolvedValueOnce(
        Response.json({ readiness: { rubricVersion: version, areas, hint: '' } }),
      );
    await expect(refreshWhispererReadiness(author, draft, project)).rejects.toMatchObject({
      status: 502,
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('marks a readiness conflict as retryable when the same interview advances', async () => {
    const reply = { id: request, role: 'user', final: true, included: true, text: 'A saved reply' };
    const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
    jest
      .mocked(sgwFetch)
      .mockResolvedValueOnce(
        Response.json({ readiness: { rubricVersion: whispererRubricVersion, areas, hint: '' } }),
      );
    transactionReads(
      [],
      [],
      [{ projectId: project }],
      [{ id: project, revision: 5 }],
      [{ id: 'owner' }],
      [reply],
      [],
    );
    const tx = transactionReads(
      [{ projectId: project }],
      [{ id: project, revision: 6 }],
      [{ id: 'owner' }],
      [reply, { ...reply, id: 'new-turn', final: false }],
      [],
    );
    await expect(refreshWhispererReadiness(author, draft, project)).rejects.toMatchObject({
      status: 409,
      code: readinessRevisionChanged,
    });
    expect(sgwFetch).toHaveBeenCalledTimes(1);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('does not mark a replacement interview as retryable', async () => {
    transactionReads(
      [],
      [],
      [{ projectId: project }],
      [{ id: project, revision: 5 }],
      [{ id: 'owner' }],
      [],
      [],
    );
    const tx = transactionReads(
      [{ projectId: previous }],
      [{ id: previous, revision: 5 }],
      [{ id: 'owner' }],
      [],
      [],
    );
    await expect(refreshWhispererReadiness(author, draft, project)).rejects.toMatchObject({
      status: 409,
      code: undefined,
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('keeps displayed progress and the first-ready anchor while the revision is stale', async () => {
    const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
    transactionReads(
      [],
      [],
      [
        {
          projectId: project,
          readinessRevision: 5,
          readiness: {
            rubricVersion: whispererRubricVersion,
            ready: true,
            areas,
            missing: [],
            firstReadyTurnId: request,
          },
        },
      ],
      [{ id: project, revision: 6 }],
      [{ id: 'owner' }],
      [{ id: request, role: 'user', final: true, included: true, text: 'A saved reply' }],
      [],
    );
    await expect(getWhisperer(author, draft)).resolves.toMatchObject({
      interview: {
        readinessNeedsRefresh: true,
        readiness: { ready: false, areas, firstReadyTurnId: request },
      },
    });
  });

  it.each([
    { rubricVersion: whispererRubricVersion, firstReadyTurnId: undefined, expected: request },
    {
      rubricVersion: whispererRubricVersion,
      firstReadyTurnId: 'prior-reply',
      expected: 'prior-reply',
    },
    { rubricVersion: 2, firstReadyTurnId: 'prior-reply', expected: request },
  ])(
    'anchors readiness under the current rubric (%j)',
    async ({ rubricVersion, firstReadyTurnId, expected }) => {
      const savedTurns = [
        { id: request, role: 'user', final: true, included: true, text: 'The story' },
        {
          id: 'question',
          role: 'assistant',
          final: true,
          included: true,
          text: 'The next question',
        },
        { id: 'partial', role: 'user', final: false, included: true, text: 'An unfinished reply' },
      ];
      const binding = {
        projectId: project,
        readinessRevision: 5,
        readiness: { rubricVersion, firstReadyTurnId },
      };
      const snapshot = [
        [binding],
        [{ id: project, revision: 6 }],
        [{ id: 'owner' }],
        savedTurns,
        [],
      ];
      transactionReads([], [], ...snapshot);
      const tx = transactionReads(...snapshot);
      const set = jest.fn(() => ({ where: jest.fn() }));
      tx.update.mockReturnValue({ set });
      const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
      jest
        .mocked(sgwFetch)
        .mockResolvedValueOnce(
          Response.json({ readiness: { rubricVersion: whispererRubricVersion, areas, hint: '' } }),
        );
      const readiness = { ready: true, firstReadyTurnId: expected };
      await expect(refreshWhispererReadiness(author, draft, project)).resolves.toMatchObject({
        readiness,
        revision: 6,
      });
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          readinessRevision: 6,
          readiness: expect.objectContaining(readiness),
        }),
      );
    },
  );

  it('uses readiness already committed for the revision when assessments overlap', async () => {
    const turns = [{ id: request, role: 'user', final: true, included: true, text: 'The story' }];
    const snapshot = [[{ id: project, revision: 6 }], [{ id: 'owner' }], turns, []];
    const areas = { characters: 'ready', setting: 'ready', plot: 'ready' };
    const readiness = {
      areas,
      firstReadyTurnId: request,
      hint: '',
      missing: [],
      ready: true,
      rubricVersion: whispererRubricVersion,
    };
    transactionReads([], [], [{ projectId: project }], ...snapshot);
    const tx = transactionReads(
      [{ projectId: project, readinessRevision: 6, readiness }],
      ...snapshot,
    );
    jest.mocked(sgwFetch).mockResolvedValueOnce(
      Response.json({
        readiness: {
          rubricVersion: whispererRubricVersion,
          areas: { ...areas, plot: 'developing' },
          hint: '',
        },
      }),
    );
    await expect(refreshWhispererReadiness(author, draft, project)).resolves.toEqual({
      readiness,
      revision: 6,
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each([null, 'live-session'])(
    'hands a typed or live ordinal answer to the outline with the original options (session %s)',
    async (sessionId) => {
      const ready = { characters: 'ready', setting: 'ready', plot: 'ready' };
      const binding = {
        projectId: project,
        readiness: { rubricVersion: whispererRubricVersion, areas: ready },
        readinessRevision: 4,
        latestQuestion: {
          id: 'later-question',
          choices: ['Another suggestion'],
          previous: { [request]: { choices: ['Uma carta', 'Uma viagem'] } },
        },
      };
      const basic = { final: true, included: true };
      const turns = [
        { ...basic, id: request, role: 'assistant', text: 'Que episódio?' },
        { ...basic, id: 'reply', role: 'user', sessionId, text: 'A segunda.' },
        { ...basic, id: 'later-question', role: 'assistant', text: 'Onde?' },
      ];
      const snapshot = [[binding], [{ id: project, revision: 4 }], [{ id: 'owner' }], turns, []];
      const story = [{ status: 'draft', authorId: author }];
      transactionReads([], story, ...snapshot);
      transactionReads([], story, []);
      const write = transactionReads(...snapshot, [], story);
      const saved = { userDescription: '', imageObjectPaths: [] };
      write.insert.mockReturnValue({
        values: (value: typeof saved) => {
          Object.assign(saved, value);
          return { onConflictDoNothing: jest.fn() };
        },
      });
      transactionReads(...snapshot, [], story, [saved]);
      const result = await handoffWhisperer(author, draft, project, {
        revision: 4,
        brief: '',
        imageObjectPaths: [],
      });
      expect(JSON.parse(result.userDescription)).toEqual({
        interviewerQuestion: 'Que episódio?',
        interviewerChoices: ['Uma carta', 'Uma viagem'],
        authorReply: 'A segunda.',
      });
      expect(sgwFetch).not.toHaveBeenCalled();
    },
  );

  it('rejects an old typed send before saving it to the replacement interview', async () => {
    transactionReads(
      [],
      [],
      [{ projectId: project }],
      [{ id: project }],
      [{ id: 'owner' }],
      [],
      [],
    );
    await expect(
      sendWhispererTurn(author, draft, previous, { id: request, text: 'Old story' }),
    ).rejects.toMatchObject({ status: 409 });
    expect(saveOwnerTurn).not.toHaveBeenCalled();
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('rejects an old reset without touching the replacement interview or files', async () => {
    const tx = transactionReads([{ projectId: project }]);
    await expect(resetWhisperer(author, draft, previous)).rejects.toMatchObject({ status: 409 });
    expect(tx.update).not.toHaveBeenCalled();
    expect(settleResetVoiceSessions).not.toHaveBeenCalled();
    expect(privateWhispererBucket).not.toHaveBeenCalled();
  });

  it('rejects expired dictation before accessing the database or forwarding audio', async () => {
    const capturedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await expect(
      dictateWhisperer(author, draft, project, {
        data: 'AAAA',
        contentType: 'audio/pcm;rate=16000',
        capturedAt,
      }),
    ).rejects.toMatchObject({ status: 410 });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('rejects a stale first handoff even if the current interview is otherwise ready', async () => {
    const readiness = {
      ready: true,
      missing: [],
      areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
    };
    const tx = transactionReads(
      [],
      [{ authorId: author, status: 'draft' }],
      [{ projectId: project, revision: 5, userDescription: 'Story', imageObjectPaths: [] }],
      [{ projectId: project, readiness, readinessRevision: 6 }],
      [{ id: project, revision: 6 }],
      [{ id: 'owner' }],
      [],
      [],
    );
    await expect(
      verifyWhispererStructure(author, draft, request, 'Story', []),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('supports re-forwarding the same reserved request after the interview was reset', async () => {
    const tx = transactionReads(
      [],
      [{ authorId: author, status: 'draft' }],
      [
        {
          projectId: null,
          dispatchReserved: true,
          userDescription: 'Story',
          imageObjectPaths: ['photo'],
        },
      ],
    );
    await expect(
      verifyWhispererStructure(author, draft, request, 'Story', ['photo']),
    ).resolves.toBeUndefined();
    expect(tx.update).not.toHaveBeenCalled();
  });
});
