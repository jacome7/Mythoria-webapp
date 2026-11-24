/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/db';
import { productExperimentRelease } from '@/lib/product-experiments/release';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';

jest.mock('@/db', () => ({ db: { transaction: jest.fn() } }));
const receipt = '4567db72-da22-43ff-b361-853646188247';
const now = Date.now();
beforeEach(() => {
  jest.clearAllMocks();
  productExperimentRelease.baselineReconciledAt = new Date(now - 30_000).toISOString();
  productExperimentRelease.windows = {
    mobile_idea_entry: {
      startsAt: new Date(now - 10_000).toISOString(),
      endsAt: new Date(now + 86_400_000).toISOString(),
    },
  };
});
afterAll(() => {
  productExperimentRelease.windows = {};
  productExperimentRelease.baselineReconciledAt = null;
});
function request(
  cookie = true,
  body: unknown = { action: 'assign', experiment: 'mobile_idea_entry' },
  origin = 'https://mythoria.pt',
) {
  const headers = new Headers({ origin, 'content-type': 'application/json' });
  if (cookie)
    headers.set(
      'cookie',
      `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ state: { analytics_storage: 'granted' } }))}; mythoria_attribution=${receipt}`,
    );
  return new NextRequest('https://mythoria.pt/api/product-experiments', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
it('rejects unconsented, out-of-phase, preview-host and malformed events before DB access', async () => {
  for (const req of [
    request(false),
    request(true, { action: 'assign', experiment: 'reader_cta' }),
    request(true, undefined, 'https://preview.example'),
    request(true, { action: 'assign', experiment: 'mobile_idea_entry', story: 'private' }),
  ]) {
    expect(await (await POST(req)).json()).toEqual({ arm: null });
  }
  expect(db.transaction).not.toHaveBeenCalled();
});
it('restores the originally committed arm on duplicate/concurrent insertion', async () => {
  const limit = jest.fn().mockResolvedValue([{ id: receipt }]);
  const where = jest
    .fn()
    .mockReturnValueOnce({ for: () => ({ limit }) })
    .mockResolvedValueOnce([{ arm: 'control' }]);
  const tx = {
    select: () => ({ from: () => ({ where }) }),
    insert: () => ({
      values: () => ({ onConflictDoNothing: () => ({ returning: async () => [] }) }),
    }),
  };
  (db.transaction as jest.Mock).mockImplementationOnce((cb) => cb(tx));
  expect(await (await POST(request())).json()).toEqual({ arm: 'control' });
});
it('never assigns against a revoked, unknown or expired receipt', async () => {
  const insert = jest.fn();
  const tx = {
    insert,
    select: () => ({ from: () => ({ where: () => ({ for: () => ({ limit: async () => [] }) }) }) }),
  };
  (db.transaction as jest.Mock).mockImplementationOnce((cb) => cb(tx));
  expect(await (await POST(request())).json()).toEqual({ arm: null });
  expect(insert).not.toHaveBeenCalled();
});
