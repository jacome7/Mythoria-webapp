/** @jest-environment node */
jest.mock('@/db', () => ({ db: { transaction: jest.fn() } }));
import { db } from '@/db';
import { readPurchaseAuditSnapshot } from './purchase-audit-reader';

describe('purchase audit database boundary', () => {
  it('requires READ ONLY and repeatable-read before reading business data', async () => {
    const execute = jest.fn().mockResolvedValueOnce({ rows: [{ readonly: 'off' }] });
    const transaction = db.transaction as jest.Mock;
    transaction.mockImplementation(async (callback) => callback({ execute }));
    await expect(readPurchaseAuditSnapshot(new Date('2026-09-05T00:00:00Z'))).rejects.toThrow(
      'READ ONLY',
    );
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('returns selected rows only after the database confirms read-only mode', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ readonly: 'on' }] })
      .mockResolvedValue({ rows: [] });
    (db.transaction as jest.Mock).mockImplementation(async (callback) => callback({ execute }));
    await expect(readPurchaseAuditSnapshot(new Date('2026-09-05T00:00:00Z'))).resolves.toEqual({
      orders: [],
      events: [],
      outbox: [],
      attributions: [],
    });
    expect(execute).toHaveBeenCalledTimes(6);
  });
});
