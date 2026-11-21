/** @jest-environment node */
const selectDistinct = jest.fn();
const transaction = jest.fn();
const deleteObject = jest.fn();
jest.mock('@/db', () => ({
  db: {
    selectDistinct: (...args: unknown[]) => selectDistinct(...args),
    transaction: (...args: unknown[]) => transaction(...args),
  },
}));
jest.mock('@google-cloud/storage', () => ({
  Storage: class {
    bucket() {
      return { file: (path: string) => ({ delete: () => deleteObject(path) }) };
    }
  },
}));

import { sweepRecoveryAudio } from './audio-retention';

it('keeps retriable audio metadata and continues past busy projects and failed objects', async () => {
  const oldBucket = process.env.BIOGRAPHER_STORAGE_BUCKET;
  process.env.BIOGRAPHER_STORAGE_BUCKET = 'test-recovery-bucket';
  try {
    const candidates = [
      { projectId: 'busy', turnId: 'a' },
      { projectId: 'failed', turnId: 'b' },
      { projectId: 'healthy', turnId: 'c' },
    ];
    selectDistinct.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => ({
            where: () => ({ orderBy: () => ({ limit: async () => candidates }) }),
          }),
        }),
      }),
    });
    const removeMetadata = jest.fn().mockReturnValue({ where: jest.fn() });
    for (const { projectId } of candidates) {
      transaction.mockImplementationOnce((run) =>
        run({
          execute: async () => ({ rows: [{ locked: projectId !== 'busy' }] }),
          select: () => ({
            from: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    orderBy: () => ({
                      limit: async () => [{ id: projectId, path: projectId }],
                    }),
                  }),
                }),
              }),
            }),
          }),
          delete: removeMetadata,
        }),
      );
    }
    deleteObject.mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce([]);
    await expect(sweepRecoveryAudio()).resolves.toEqual({ removed: 1, failed: 1, more: true });
    expect(deleteObject.mock.calls).toEqual([['failed'], ['healthy']]);
    expect(removeMetadata).toHaveBeenCalledTimes(1);
  } finally {
    if (oldBucket === undefined) delete process.env.BIOGRAPHER_STORAGE_BUCKET;
    else process.env.BIOGRAPHER_STORAGE_BUCKET = oldBucket;
  }
});
