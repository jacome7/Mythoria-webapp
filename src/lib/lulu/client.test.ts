/** @jest-environment node */
import { createHmac } from 'node:crypto';
import {
  findLuluJob,
  getLuluCoverDimensions,
  getLuluJob,
  getLuluJobCosts,
  prepareLuluQuote,
  quoteLuluOrder,
  submitLuluJob,
  validateLuluFile,
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
it('uses the exact 33-page square count for dimensions, cover validation and pricing', async () => {
  const square = { ...input, podPackageId: '0850X0850FCPRECW080CW444MXX', pageCount: 33 };
  respond = (url, body) => {
    if (url.endsWith('/cover-dimensions/')) {
      expect(body).toEqual({
        pod_package_id: square.podPackageId,
        interior_page_count: 33,
        unit: 'pt',
      });
      return { width: '1368.2', height: '738' };
    }
    if (url.endsWith('/validate-cover/')) {
      expect(body).toEqual({
        pod_package_id: square.podPackageId,
        interior_page_count: 33,
        source_url: square.coverUrl,
      });
      return { id: 9 };
    }
    if (url.endsWith('/validate-cover/9/')) return { id: 9, status: 'NORMALIZED' };
    expect(body.line_items).toEqual([
      { pod_package_id: square.podPackageId, quantity: square.copies, page_count: 33 },
    ]);
    return url.endsWith('/shipping-options/')
      ? [{ level: 'GROUND', traceable: true }]
      : { currency: 'EUR', total_cost_incl_tax: '25.30' };
  };
  await expect(getLuluCoverDimensions(square)).resolves.toEqual({ width: 1368.2, height: 738 });
  await expect(validateLuluFile('cover', { ...square, sourceUrl: square.coverUrl })).resolves.toBe(
    '9',
  );
  await expect(quoteLuluOrder(square)).resolves.toMatchObject({ totalEur: 25.3 });
});
it.each([
  [33, ['0850X0850.FC.PRE.CW.080CW444.MXX'], true],
  [34, ['0850X0850.FC.PRE.CW.080CW444.MXX'], false],
  [33, ['other'], false],
  [33, undefined, false],
] as const)(
  'requires the normalized square count and package (%i, %j)',
  async (pageCount, packages, accepted) => {
    respond = (url) =>
      url.endsWith('/validate-interior/9/')
        ? { id: 9, status: 'NORMALIZED', page_count: pageCount, valid_pod_package_ids: packages }
        : { id: 9 };
    const result = validateLuluFile('interior', {
      sourceUrl: input.interiorUrl,
      podPackageId: '0850X0850FCPRECW080CW444MXX',
      pageCount: 33,
      requirePackageMatch: true,
    });
    if (accepted) await expect(result).resolves.toBe('9');
    else await expect(result).rejects.toThrow('LULU_INTERIOR_MISMATCH');
  },
);
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
it('submits both source files inside one printable normalization request', async () => {
  respond = (_, body) => {
    expect(body.line_items).toEqual([
      {
        external_id: input.externalId + '-1',
        title: 'Fixture',
        quantity: input.copies,
        printable_normalization: {
          pod_package_id: input.podPackageId,
          interior: { source_url: input.interiorUrl },
          cover: { source_url: input.coverUrl },
        },
      },
    ]);
    return { id: 77, status: 'CREATED' };
  };
  await expect(
    submitLuluJob({ ...input, shippingLevel: 'GROUND', title: 'Fixture' }),
  ).resolves.toMatchObject({ id: '77' });
});
it('retains tracking from both job detail and the matching line status', async () => {
  respond = (url) =>
    url.endsWith('/status/')
      ? {
          name: 'SHIPPED',
          line_item_statuses: [
            {
              line_item_id: 456,
              name: 'SHIPPED',
              messages: {
                tracking_urls: 'https://example.org/shipped',
                tracking_id: 'abc',
                carrier_name: 'Carrier',
              },
            },
          ],
        }
      : {
          id: 77,
          status: 'IN_PRODUCTION',
          line_items: [
            {
              id: 456,
              external_id: 'order-fixture-1',
              tracking_urls: ['https://example.org/label'],
            },
          ],
        };
  await expect(getLuluJob('77')).resolves.toMatchObject({
    status: 'SHIPPED',
    tracking: expect.arrayContaining(['https://example.org/label', 'https://example.org/shipped']),
    lines: [expect.objectContaining({ id: '456', tracking_id: 'abc', carrier_name: 'Carrier' })],
  });
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
  respond = (url) => {
    if (url.endsWith('/status/')) return { name: 'UNPAID' };
    if (url.endsWith('/costs/')) return costs;
    return { id: 4, status: { name: 'UNPAID' }, date_created: '2026-11-21T00:30:00+01:00', costs };
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
  respond = (url) =>
    url.endsWith('/status/')
      ? { name: 'CREATED' }
      : { id: 4, status: 'CREATED', date_created: null, costs: { currency: 'EUR' } };
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
