import { NextRequest } from 'next/server';
import { GET } from './route';

const execute = jest.fn();

jest.mock('@/db/index', () => ({
  db: { execute: (...args: unknown[]) => execute(...args) },
}));

jest.mock('@/lib/database-config', () => ({ isVpcDirectEgress: () => true }));

describe('health endpoint deployment traceability', () => {
  const previousSha = process.env.APP_GIT_SHA;

  afterEach(() => {
    execute.mockReset();
    if (previousSha === undefined) delete process.env.APP_GIT_SHA;
    else process.env.APP_GIT_SHA = previousSha;
  });

  it('reports the running Git SHA when healthy', async () => {
    process.env.APP_GIT_SHA = '0123456789abcdef';
    execute.mockResolvedValueOnce({ rows: [{ test: 1 }] });

    const response = await GET(new NextRequest('https://mythoria.pt/api/health'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ status: 'healthy', gitSha: '0123456789abcdef' }),
    );
  });

  it('still reports the running Git SHA when unhealthy', async () => {
    process.env.APP_GIT_SHA = 'fedcba9876543210';
    execute.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await GET(new NextRequest('https://mythoria.pt/api/health'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({ status: 'unhealthy', gitSha: 'fedcba9876543210' }),
    );
  });
});
