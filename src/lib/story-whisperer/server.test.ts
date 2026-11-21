/** @jest-environment node */
import { db } from '@/db';
import { saveTurn } from '@/db/services/biographer';
import { settleResetVoiceSessions } from '@/db/services/whisperer-voice';
import { sgwFetch } from '@/lib/sgw-client';
import {
  dictateWhisperer,
  resetWhisperer,
  sendWhispererTurn,
  verifyWhispererStructure,
} from './server';
import { privateWhispererBucket } from './private-media';

jest.mock('@/db', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/db/services/biographer', () => ({
  ...jest.requireActual('@/db/services/biographer'),
  saveTurn: jest.fn(),
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
    expect(saveTurn).not.toHaveBeenCalled();
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
