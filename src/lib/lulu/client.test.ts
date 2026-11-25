/** @jest-environment node */
import { createHmac } from 'node:crypto';
import {
  findLuluJob,
  getLuluJob,
  getLuluJobCosts,
  prepareLuluQuote,
  quoteLuluOrder,
  submitLuluJob,
  verifyLuluWebhook,
} from './client';
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn(() => ({
    getClient: async () => ({
      request: async () => ({
        data: { payload: { data: Buffer.from('test-only').toString('base64') } },
      }),
    }),
  })),
}));
const input = {
  externalId: 'order-fixture',
  copies: 2,
  podPackageId: 'fixture',
  pageCount: 48,
  shippingAddress: {
    name: 'Test',
    street1: 'Rua',
    city: 'Porto',
    country_code: 'PT',
    postcode: '4000-001',
    email: 'test@example.org',
    phone_number: '123456789',
  },
  interiorUrl: 'https://example.org/interior',
  coverUrl: 'https://example.org/cover',
};
const calls: string[] = [];
let respond: (url: string, body: Record<string, unknown>) => unknown;
const original = global.fetch;
beforeAll(() => {
  Object.assign(process.env, {
    LULU_PRINT_ENVIRONMENT: 'sandbox',
    LULU_PRINT_CLIENT_KEY: 'fixture',
    LULU_PRINT_SECRET_VERSION: 'projects/test/secrets/test/versions/1',
    LULU_PRINT_CONTACT_EMAIL: 'test@example.org',
  });
  global.fetch = jest.fn(async (url, opts) => {
    const target = String(url);
    calls.push(target);
    const value = target.endsWith('/token')
      ? { access_token: 'test', expires_in: 600 }
      : respond(target, opts?.body ? JSON.parse(String(opts.body)) : {});
    return Response.json(value);
  });
});
beforeEach(() => {
  calls.length = 0;
});
afterAll(() => {
  global.fetch = original;
});
it('compares landed costs for traceable services and validates both PDFs without creating a job', async () => {
  respond = (url, body) => {
    if (url.endsWith('/shipping-options/'))
      return [
        { level: 'MAIL', traceable: false },
        { level: 'GROUND', traceable: true },
        { level: 'EXPRESS', traceable: true },
      ];
    if (url.endsWith('/print-job-cost-calculations/'))
      return {
        currency: 'EUR',
        total_cost_incl_tax: body.shipping_option === 'GROUND' ? '12.34' : '29.70',
      };
    if (url.endsWith('/9/'))
      return { id: 9, status: 'NORMALIZED', page_count: 48, valid_pod_package_ids: ['fixture'] };
    return { id: 9 };
  };
  await expect(prepareLuluQuote(input)).resolves.toEqual({
    shippingLevel: 'GROUND',
    totalEur: 12.34,
  });
  expect(calls.filter((u) => u.endsWith('/print-job-cost-calculations/'))).toHaveLength(2);
  expect(calls.some((u) => u.includes('/print-jobs/'))).toBe(false);
});
it('holds a destination without tracked shipping', async () => {
  respond = () => [{ level: 'MAIL', traceable: false }];
  await expect(quoteLuluOrder(input)).rejects.toThrow('NO_TRACKED_SHIPPING');
});
it('blocks material address corrections', async () => {
  respond = (u) =>
    u.endsWith('/shipping-options/')
      ? [{ level: 'GROUND', traceable: true }]
      : {
          currency: 'EUR',
          total_cost_incl_tax: '8.08',
          shipping_address: { suggested_address: { city: 'Lisbon' } },
        };
  await expect(quoteLuluOrder(input)).rejects.toThrow('ADDRESS_CONFIRMATION_REQUIRED');
});
it('never retries a create following a lost response', async () => {
  respond = () => {
    throw new Error('connection closed');
  };
  await expect(
    submitLuluJob({ ...input, shippingLevel: 'GROUND', title: 'Fixture' }),
  ).rejects.toThrow();
  expect(calls.filter((u) => u.endsWith('/print-jobs/'))).toHaveLength(1);
});
it('requires an exact job and line reference on reconciliation', async () => {
  respond = () => ({
    results: [
      {
        id: 4,
        status: 'CREATED',
        external_id: 'order-fixture',
        line_items: [{ external_id: 'different' }],
      },
    ],
  });
  await expect(findLuluJob(input.externalId)).rejects.toThrow('RECONCILIATION_REQUIRED');
});
it('preserves the native pre-tax decimal from an unpaid job and the separate cost endpoint', async () => {
  const costs = {
    currency: 'USD',
    total_cost_incl_tax: '86.45',
    total_cost_excl_tax: '80.7900',
  };
  respond = (url) =>
    url.endsWith('/costs/')
      ? costs
      : {
          id: 4,
          status: { name: 'UNPAID' },
          date_created: '2026-11-21T00:30:00+01:00',
          costs,
        };
  const summary = { currency: 'USD', total: 86.45, amountExclTax: '80.7900', fees: [] };
  await expect(getLuluJob('4')).resolves.toMatchObject({
    id: '4',
    status: 'UNPAID',
    createdAt: '2026-11-20T23:30:00.000Z',
    costs: summary,
  });
  await expect(getLuluJobCosts('4')).resolves.toEqual(summary);
});

it('reads the job identity even when its cost and creation date are unavailable', async () => {
  respond = () => ({ id: 4, status: 'CREATED', date_created: null, costs: { currency: 'EUR' } });
  await expect(getLuluJob('4')).resolves.toMatchObject({
    id: '4',
    status: 'CREATED',
    createdAt: undefined,
    costs: undefined,
  });
});
it('authenticates the raw bytes before parsing', async () => {
  const raw = Buffer.from('{"a": 1}');
  const signature = createHmac('sha256', 'test-only').update(raw).digest('hex');
  expect(await verifyLuluWebhook(raw, signature)).toBe(true);
  expect(await verifyLuluWebhook(Buffer.from('{"a":1}'), signature)).toBe(false);
});
