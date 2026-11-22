/** @jest-environment node */
const transaction = jest.fn();
jest.mock('@/db', () => ({ db: { transaction: (...args: unknown[]) => transaction(...args) } }));
jest.mock('@/lib/biographer/audio-retention', () => ({ clearTranscribedAudio: jest.fn() }));
import { checkpoint } from './biographer';
function mockTransaction(results: unknown[][]) {
  const insert = jest.fn();
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    insert,
    update: jest.fn(() => ({ set: () => ({ where: jest.fn().mockResolvedValue(undefined) }) })),
    select: jest.fn(() => ({
      from: () => ({ where: () => Promise.resolve(results.shift() ?? []) }),
    })),
  };
  transaction.mockImplementation(async (run) => run(tx));
  return tx;
}
const session = {
  id: '9d24167b-e238-467d-ac39-3faab4bb8f1b',
  projectId: '6b7c6d15-951c-416b-b0c7-4bd53119de8c',
  participantId: 'e707d819-c705-4295-8b40-8ace3f6a1c96',
  consumedAt: new Date(),
  endedAt: null,
};
const input = {
  sessionId: session.id,
  eventId: 'd3db2ff0-5383-4f0e-b429-3344e6a7b1e9',
  turnId: 'c9ec5f01-3502-454e-b7b6-d6dbe20a12c2',
  role: 'user' as const,
  text: 'A memory',
};
describe('live checkpoint revocation race', () => {
  beforeEach(() => jest.clearAllMocks());
  it('does not write when a session is ended while waiting for the project lock', async () => {
    const tx = mockTransaction([
      [session],
      [{ ...session, endedAt: new Date() }],
      [{ id: session.participantId, role: 'contributor', status: 'started' }],
    ]);
    await expect(checkpoint(input)).rejects.toMatchObject({ status: 404 });
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(tx.insert).not.toHaveBeenCalled();
  });
  it.each([
    { discardingSessionId: session.id, final: false },
    { discardingSessionId: session.id, final: true, interrupted: true },
    { discardingSessionId: 'different-session', final: true },
  ])(
    'ignores a checkpoint for a discarded turn (%j)',
    async ({ discardingSessionId, ...event }) => {
      const tx = mockTransaction([
        [session],
        [{ ...session, discardingSessionId }],
        [{ id: session.participantId, role: 'owner', status: 'started' }],
      ]);
      await expect(checkpoint({ ...input, ...event })).resolves.toEqual({ saved: true });
      expect(tx.insert).not.toHaveBeenCalled();
    },
  );

  it('preserves the owning session’s completed checkpoint after browser cancellation', async () => {
    const tx = mockTransaction([
      [session],
      [{ ...session, discardingSessionId: session.id }],
      [{ id: session.participantId, role: 'owner', status: 'started' }],
      [],
    ]);
    const upsert = jest.fn().mockResolvedValue(undefined);
    tx.insert
      .mockReturnValueOnce({
        values: () => ({ onConflictDoNothing: () => ({ returning: async () => [{}] }) }),
      })
      .mockReturnValueOnce({ values: () => ({ onConflictDoUpdate: upsert }) });
    await expect(checkpoint({ ...input, final: true })).resolves.toEqual({ saved: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ text: input.text, final: true, interrupted: false }),
      }),
    );
  });
  it('does not reopen a contributor closed while waiting for the lock', async () => {
    const tx = mockTransaction([
      [session],
      [session],
      [{ id: session.participantId, role: 'contributor', status: 'closed' }],
    ]);
    await expect(checkpoint(input)).rejects.toMatchObject({ status: 404 });
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
